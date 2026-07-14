import { InteractionType, InteractionResponseType, verifyKey } from "discord-interactions";
import { SYSTEM_PROMPT, SNIPPET_PROMPT } from "./prompts";
import { HTML } from "../docs/site";

export interface Env {
	DISCORD_PUBLIC_KEY: string;
	DEEPSEEK_KEY: string;
	DEEPSEEK_BASE_URL: string;
	DEEPSEEK_MODEL: string;
}

const cooldowns = new Map<string, number>();
const COOLDOWN_CLEANUP_INTERVAL = 60_000;
const COOLDOWN_MS = 10_000;
let lastCleanup = Date.now();

const INPUT_COST_PER_M = 0.14;
const OUTPUT_COST_PER_M = 0.28;

// Token-saving limits
const MAX_INPUT_CHARS = 800;
const MIN_INPUT_CHARS = 4;

const LANGUAGE_CHOICES = [
	"C", "C++", "C#", "Rust", "Java", "JavaScript", "Python", "Bash", "Nix",
];

const FULL_CODE_PATTERNS = [
	/full\s*(code|program|app|implement|project)/i,
	/production\s*(code|ready|grade)/i,
	/complete\s*(code|program|app|implement)/i,
	/whole\s*(code|program|project)/i,
	/entire\s*(code|program|project)/i,
];

// Daily snippet limit per user (in-memory, resets on worker restart)
const DAILY_SNIPPET_LIMIT = 10;
const dailyUsage = new Map<string, { date: string; count: number }>();

function checkDailyLimit(uid: string, mode: string): boolean {
	if (mode !== "snippet") return true;
	const today = new Date().toISOString().slice(0, 10);
	const entry = dailyUsage.get(uid);
	if (!entry || entry.date !== today) {
		dailyUsage.set(uid, { date: today, count: 1 });
		return true;
	}
	if (entry.count >= DAILY_SNIPPET_LIMIT) return false;
	entry.count++;
	return true;
}

const API_TIMEOUT_MS = 25_000;
const API_RETRIES = 1;

function checkCooldown(id: string): number | null {
	if (Date.now() - lastCleanup > COOLDOWN_CLEANUP_INTERVAL) {
		const now = Date.now();
		for (const [k, v] of cooldowns) if (now >= v) cooldowns.delete(k);
		lastCleanup = Date.now();
	}

	const until = cooldowns.get(id);
	if (!until) return null;
	if (Date.now() >= until) { cooldowns.delete(id); return null; }
	return until - Date.now();
}

interface DiscordInteraction {
	type: InteractionType;
	token: string;
	application_id: string;
	member?: { user?: { id: string } };
	user?: { id: string };
	data?: { name: string; options?: { name: string; value: unknown }[] };
}

function ephemeral(content: string) {
	return Response.json({
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		data: { content, flags: 64 },
	});
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method === "GET") {
			const url = new URL(request.url);
			if (url.pathname !== "/") {
				return new Response("Not Found", { status: 404 });
			}
			return new Response(HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
		}

		if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

		const rawBody = await request.text();
		const sig = request.headers.get("X-Signature-Ed25519") ?? "";
		const ts = request.headers.get("X-Signature-Timestamp") ?? "";
		if (!(await verifyKey(rawBody, sig, ts, env.DISCORD_PUBLIC_KEY))) {
			return new Response("Bad signature", { status: 401 });
		}

		const interaction: DiscordInteraction = JSON.parse(rawBody);

		if (interaction.type === InteractionType.PING) {
			return Response.json({ type: InteractionResponseType.PONG });
		}

		if (interaction.type === InteractionType.APPLICATION_COMMAND) {
			const name = interaction.data?.name;
			if (name !== "ask" && name !== "snippet") {
				return new Response("Unknown command", { status: 400 });
			}

			const uid = interaction.member?.user?.id ?? interaction.user?.id ?? "unknown";
			const opts = interaction.data?.options ?? [];

			let question: string;

			if (name === "snippet") {
				const prompt = (opts.find(o => o.name === "refer")?.value as string) ?? "";
				const lang = (opts.find(o => o.name === "language")?.value as string) ?? "";

				if (!prompt.trim()) {
					return ephemeral("Please describe the snippet you need.");
				}
				if (!lang.trim()) {
					return ephemeral("Please choose a programming language.");
				}
				if (!LANGUAGE_CHOICES.some(c => c.toLowerCase() === lang.toLowerCase())) {
					return ephemeral("Please choose a supported language from the list.");
				}
				if (prompt.trim().length < MIN_INPUT_CHARS) {
					return ephemeral("Please describe the snippet more specifically.");
				}
				if (prompt.length > MAX_INPUT_CHARS) {
					return ephemeral(`Please keep your description under ${MAX_INPUT_CHARS} characters.`);
				}

				const lower = prompt.toLowerCase();
				if (FULL_CODE_PATTERNS.some(p => p.test(lower))) {
					return ephemeral("I'm here to give quick examples of code usage or boilerplate, not full code. Using AI-generated code isn't a good practice, take the concept and write it yourself.");
				}

				question = `${prompt} in ${lang}`;
			} else {
				question = (opts.find(o => o.name === "question")?.value as string) ?? "";

				if (!question.trim()) {
					return ephemeral("Please provide a question.");
				}
				if (question.trim().length < MIN_INPUT_CHARS) {
					return ephemeral("Please ask a more specific question.");
				}
				if (question.length > MAX_INPUT_CHARS) {
					return ephemeral(`Please keep your question under ${MAX_INPUT_CHARS} characters.`);
				}
			}

			const remaining = checkCooldown(uid);
			if (remaining !== null) {
				return ephemeral(`\u23f1 Wait ${Math.ceil(remaining / 1000)}s before asking again.`);
			}

			if (!checkDailyLimit(uid, name)) {
				return ephemeral(`\u26a0 You've used your ${DAILY_SNIPPET_LIMIT} snippet requests for today. Try again tomorrow.`);
			}

			cooldowns.set(uid, Date.now() + COOLDOWN_MS);

			const { application_id, token } = interaction;
			ctx.waitUntil(handleDeepSeek(question, application_id, token, env, name));

			return Response.json({ type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE });
		}

		return new Response("Unknown command", { status: 400 });
	},
};

async function callDeepSeek(question: string, env: Env, mode: string): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> {
	const system = mode === "snippet" ? SNIPPET_PROMPT : SYSTEM_PROMPT;

	const res = await fetch(`${env.DEEPSEEK_BASE_URL}/v1/chat/completions`, {
		method: "POST",
		headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.DEEPSEEK_KEY}` },
		body: JSON.stringify({
			model: env.DEEPSEEK_MODEL,
			messages: [
				{ role: "system", content: system },
				{ role: "user", content: question },
			],
			temperature: mode === "snippet" ? 0 : 0.1,
			max_tokens: mode === "snippet" ? 600 : 1024,
		}),
		signal: AbortSignal.timeout(API_TIMEOUT_MS),
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "unknown error");
		throw new Error(`DeepSeek ${res.status}: ${text}`);
	}

	const data = await res.json() as {
		choices: { message: { content: string } }[];
		usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
	};

	if (!data.choices?.length) throw new Error("Empty response from DeepSeek");

	return { content: data.choices[0].message.content.trim(), usage: data.usage };
}

async function handleDeepSeek(question: string, appId: string, token: string, env: Env, mode: string): Promise<void> {
	let lastError: string | null = null;

	for (let attempt = 0; attempt <= API_RETRIES; attempt++) {
		try {
			const result = await callDeepSeek(question, env, mode);

			let answer = fixMarkdown(result.content);
			if (!answer) answer = "I don't have a good answer for that. Try being more specific.";

			const { prompt_tokens, completion_tokens, total_tokens } = result.usage;
			const cost = ((prompt_tokens * INPUT_COST_PER_M) + (completion_tokens * OUTPUT_COST_PER_M)) / 1_000_000;
			const stats = `-# \u26a1 ${total_tokens} tokens ($${cost < 0.000001 ? "<0.000001" : cost.toFixed(6)})`;

			answer = answer.replace(/(?<!<)(https?:\/\/[^\s<>]+)/g, "<$1>");

			const safe = question.replace(/([*_~`|>])/g, "\\$1");
			await patchWebhook(appId, token, `**${safe}**\n${answer}\n${stats}`);
			return;
		} catch (err) {
			lastError = err instanceof Error ? err.message : "Unknown error";
			console.error(`DeepSeek attempt ${attempt + 1}/${API_RETRIES + 1} failed:`, lastError);

			if (attempt < API_RETRIES) {
				// Brief pause before retry
				await new Promise(r => setTimeout(r, 1_000));
			}
		}
	}

	await patchWebhook(appId, token, `\u26a0\ufe0f Still thinking after ${API_RETRIES + 1} tries. Try again later.`);
}

function fixMarkdown(text: string): string {
	if ((text.match(/```/g)?.length ?? 0) % 2 !== 0) text += "\n```";

	const lines = text.split("\n");
	let inBlock = false;
	let singleCount = 0;
	for (const line of lines) {
		if (/^```/.test(line.trim())) { inBlock = !inBlock; continue; }
		if (!inBlock) {
			const matches = line.match(/(?<!`)`(?!``)/g);
			if (matches) singleCount += matches.length;
		}
	}
	if (singleCount % 2 !== 0) text += "`";

	text = text.replace(/\n{3,}/g, "\n\n");
	text = text.replace(/```\n(?!\n)(?!$)/g, "```\n\n");
	text = text.replace(/```(\w*)\n\n+/g, "```$1\n");

	return text.split("\n").map(l => l.trimEnd()).join("\n").trim();
}

async function patchWebhook(appId: string, token: string, content: string): Promise<void> {
	try {
		const res = await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content }),
		});
		if (!res.ok) console.error("Webhook PATCH failed:", res.status, await res.text().catch(() => ""));
	} catch (err) {
		console.error("Webhook error:", err);
	}
}