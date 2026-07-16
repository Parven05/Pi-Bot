import { InteractionType, InteractionResponseType, verifyKey } from "discord-interactions";
import { SYSTEM_PROMPT, SNIPPET_PROMPT } from "./prompts";
import { LANGUAGE_SET } from "./commands";
import { HTML } from "../docs/site";

export interface Env {
	DISCORD_PUBLIC_KEY: string;

	AI_API_KEY: string;
	AI_BASE_URL: string;
	AI_MODEL: string;
	AI_INPUT_COST_PER_M?: string;
	AI_OUTPUT_COST_PER_M?: string;
	AI_REASONING_ENABLED?: string;
	AI_REASONING_EFFORT?: "low" | "medium" | "high";

	COOLDOWN_MS: string;
	COOLDOWN_CLEANUP_INTERVAL_MS: string;
	MIN_INPUT_CHARS: string;
	MAX_INPUT_CHARS: string;
	API_TIMEOUT_MS: string;
}

type TunableKey =
	| "COOLDOWN_MS"
	| "COOLDOWN_CLEANUP_INTERVAL_MS"
	| "MIN_INPUT_CHARS"
	| "MAX_INPUT_CHARS"
	| "API_TIMEOUT_MS"
	| "API_RETRIES"
	| "RETRY_DELAY_MS";

function tunable(env: Env, key: TunableKey): number {
	const raw = env[key];
	if (raw === undefined || raw === "") {
		throw new Error(`Missing required env var: ${key}`);
	}
	const parsed = Number(raw);
	if (!Number.isFinite(parsed)) {
		throw new Error(`Env var ${key} must be a number, got: "${raw}"`);
	}
	return parsed;
}

const TUNABLE_KEYS: TunableKey[] = [
	"COOLDOWN_MS",
	"COOLDOWN_CLEANUP_INTERVAL_MS",
	"MIN_INPUT_CHARS",
	"MAX_INPUT_CHARS",
	"API_TIMEOUT_MS"
];

function checkTunablesConfigured(env: Env): string | null {
	for (const key of TUNABLE_KEYS) {
		try {
			tunable(env, key);
		} catch (err) {
			return err instanceof Error ? err.message : `Invalid env var: ${key}`;
		}
	}
	return null;
}

const FULL_SCRIPT_PATTERNS = [
	/full\s*(script|app|implement|project)/i,
	/production\s*(script|ready|grade)/i,
	/complete\s*(script|app|implement)/i,
	/whole\s*(script|project)/i,
	/entire\s*(script|project)/i,
];

// ---- Per-user cooldown (in-memory; resets on isolate recycle) -------------
const cooldowns = new Map<string, number>();
let lastCleanup = Date.now();

function checkCooldown(env: Env, id: string): number | null {
	const now = Date.now();
	const cleanupInterval = tunable(env, "COOLDOWN_CLEANUP_INTERVAL_MS");

	if (now - lastCleanup > cleanupInterval) {
		for (const [key, expiry] of cooldowns) {
			if (now >= expiry) cooldowns.delete(key);
		}
		lastCleanup = now;
	}

	const until = cooldowns.get(id);
	if (until === undefined) return null;
	if (now >= until) {
		cooldowns.delete(id);
		return null;
	}
	return until - now;
}

function startCooldown(env: Env, id: string): void {
	cooldowns.set(id, Date.now() + tunable(env, "COOLDOWN_MS"));
}

// ---- Discord types & helpers -----------------------------------------------
interface DiscordInteraction {
	type: InteractionType;
	token: string;
	application_id: string;
	member?: { user?: { id: string } };
	user?: { id: string };
	data?: { name: string; options?: { name: string; value: unknown }[] };
}

function ephemeral(content: string): Response {
	return Response.json({
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		data: { content, flags: 64 },
	});
}

function getOption(opts: { name: string; value: unknown }[], name: string): string {
	return (opts.find(o => o.name === name)?.value as string) ?? "";
}

function validateText(text: string, label: string, env: Env): string | null {
	const min = tunable(env, "MIN_INPUT_CHARS");
	const max = tunable(env, "MAX_INPUT_CHARS");
	const trimmed = text.trim();
	if (!trimmed) return `Please provide ${label}.`;
	if (trimmed.length < min) return `Please make ${label} more specific.`;
	if (text.length > max) return `Please keep ${label} under ${max} characters.`;
	return null;
}

// ---- Worker entrypoint ------------------------------------------------------
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method === "GET") {
			const url = new URL(request.url);
			if (url.pathname !== "/") return new Response("Not Found", { status: 404 });
			return new Response(HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
		}

		if (request.method !== "POST") {
			return new Response("Method Not Allowed", { status: 405 });
		}

		const configError = checkTunablesConfigured(env);
		if (configError) {
			console.error("Worker misconfigured:", configError);
			return new Response(`Server misconfigured: ${configError}`, { status: 500 });
		}

		const rawBody = await request.text();
		const sig = request.headers.get("X-Signature-Ed25519") ?? "";
		const ts = request.headers.get("X-Signature-Timestamp") ?? "";

		if (!(await verifyKey(rawBody, sig, ts, env.DISCORD_PUBLIC_KEY))) {
			return new Response("Bad signature", { status: 401 });
		}

		let interaction: DiscordInteraction;
		try {
			interaction = JSON.parse(rawBody);
		} catch {
			return new Response("Invalid payload", { status: 400 });
		}

		if (interaction.type === InteractionType.PING) {
			return Response.json({ type: InteractionResponseType.PONG });
		}

		if (interaction.type !== InteractionType.APPLICATION_COMMAND) {
			return new Response("Unknown interaction type", { status: 400 });
		}

		const name = interaction.data?.name;
		if (name !== "ask" && name !== "snippet") {
			return new Response("Unknown command", { status: 400 });
		}

		const uid = interaction.member?.user?.id ?? interaction.user?.id ?? "unknown";
		const opts = interaction.data?.options ?? [];

		const built = name === "snippet" ? buildSnippetQuery(opts, env) : buildAskQuery(opts, env);
		if (typeof built !== "string") return ephemeral(built.error);

		const remaining = checkCooldown(env, uid);
		if (remaining !== null) {
			return ephemeral(`\u23f1 Wait ${Math.ceil(remaining / 1000)}s before asking again.`);
		}
		startCooldown(env, uid);

		const { application_id, token } = interaction;
		ctx.waitUntil(handleResponse(built, application_id, token, env, name));

		return Response.json({ type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE });
	},
};

function buildAskQuery(opts: { name: string; value: unknown }[], env: Env): string | { error: string } {
	const question = getOption(opts, "question");
	const error = validateText(question, "a question", env);
	return error ? { error } : question;
}

function buildSnippetQuery(opts: { name: string; value: unknown }[], env: Env): string | { error: string } {
	const prompt = getOption(opts, "refer");
	const lang = getOption(opts, "language");

	if (!lang.trim()) return { error: "Please choose a scripting language." };
	if (!LANGUAGE_SET.has(lang.toLowerCase())) {
		return { error: "Please choose a supported language from the list." };
	}

	const error = validateText(prompt, "the snippet description", env);
	if (error) return { error };

	if (FULL_SCRIPT_PATTERNS.some(p => p.test(prompt.toLowerCase()))) {
		return {
			error:
				"I'm here for short script snippets and build helpers, not full applications. " +
				"Take the concept and write the full thing yourself.",
		};
	}

	return `${prompt} in ${lang}`;
}

// ---- AI backend call --------------------------------------------------------
interface ChatUsage {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
}

const REASONING_ON_VALUES = new Set(["true", "on", "1", "yes"]);

function isReasoningEnabled(env: Env): boolean {
	const value = env.AI_REASONING_ENABLED?.toLowerCase().trim();
	return value !== undefined && REASONING_ON_VALUES.has(value);
}

async function callAPI(question: string, env: Env, mode: string): Promise<{ content: string; usage: ChatUsage }> {
	const system = mode === "snippet" ? SYSTEM_PROMPT + "\n\n" + SNIPPET_PROMPT : SYSTEM_PROMPT;

	const body: Record<string, unknown> = {
		model: env.AI_MODEL,
		messages: [
			{ role: "system", content: system },
			{ role: "user", content: question },
		],
		temperature: mode === "snippet" ? 0 : 0.1,
	};

	if (isReasoningEnabled(env)) {
		body.reasoning_effort = env.AI_REASONING_EFFORT ?? "medium";
	}

	const res = await fetch(`${env.AI_BASE_URL}/v1/chat/completions`, {
		method: "POST",
		headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.AI_API_KEY}` },
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(tunable(env, "API_TIMEOUT_MS")),
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "unknown error");
		throw new Error(`API ${res.status}: ${text}`);
	}

	const data = (await res.json()) as {
		choices: { message: { content: string; reasoning_content?: string } }[];
		usage: ChatUsage;
	};

	if (!data.choices?.length) throw new Error("Empty response from API");

	const content = data.choices[0].message.content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

	return { content, usage: data.usage };
}

async function handleResponse(
	question: string,
	appId: string,
	token: string,
	env: Env,
	mode: string,
): Promise<void> {
	try {
		const result = await callAPI(question, env, mode);

		const answer = fixMarkdown(result.content) || "I don't have a good answer for that. Try being more specific.";
		const linked = answer.replace(/(?<!<)(https?:\/\/[^\s<>]+)/g, "<$1>");
		const stats = formatStats(result.usage, env);
		const safeQuestion = question.replace(/([*_~`|>])/g, "\\$1");

		await patchWebhook(appId, token, `**${safeQuestion}**\n${linked}\n${stats}`);
	} catch {
		await patchWebhook(appId, token, "Your question is beyond my knowledge, ask other.");
	}
}

function formatStats(usage: ChatUsage, env: Env): string {
	const inputCost = Number(env.AI_INPUT_COST_PER_M);
	const outputCost = Number(env.AI_OUTPUT_COST_PER_M);

	if (!Number.isFinite(inputCost) || !Number.isFinite(outputCost)) {
		return `-# \u26a1 ${usage.total_tokens} tokens`;
	}

	const cost = (usage.prompt_tokens * inputCost + usage.completion_tokens * outputCost) / 1_000_000;
	const costLabel = cost < 0.000001 ? "<0.000001" : cost.toFixed(6);
	return `-# \u26a1 ${usage.total_tokens} tokens ($${costLabel})`;
}

// ---- Markdown cleanup --------------------------------------------------------
function fixMarkdown(text: string): string {
	if ((text.match(/```/g)?.length ?? 0) % 2 !== 0) text += "\n```";

	const lines = text.split("\n");
	let inBlock = false;
	let singleTickCount = 0;
	for (const line of lines) {
		if (/^```/.test(line.trim())) {
			inBlock = !inBlock;
			continue;
		}
		if (!inBlock) {
			const matches = line.match(/(?<!`)`(?!``)/g);
			if (matches) singleTickCount += matches.length;
		}
	}
	if (singleTickCount % 2 !== 0) text += "`";

	text = text.replace(/\n{3,}/g, "\n\n");
	text = text.replace(/```\n(?!\n)(?!$)/g, "```\n\n");
	text = text.replace(/```(\w*)\n\n+/g, "```$1\n");
	text = text.replace(/([^\n])\n\s*Refer:/g, "$1\n\nRefer:");

	return text
		.split("\n")
		.map(l => l.trimEnd())
		.join("\n")
		.trim();
}

// ---- Discord webhook --------------------------------------------------------
async function patchWebhook(appId: string, token: string, content: string): Promise<void> {
	try {
		const res = await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content }),
		});
		if (!res.ok) {
			console.error("Webhook PATCH failed:", res.status, await res.text().catch(() => ""));
		}
	} catch (err) {
		console.error("Webhook error:", err);
	}
}