import { InteractionType, InteractionResponseType, verifyKey } from "discord-interactions";
import { SYSTEM_PROMPT, SNIPPET_PROMPT } from "./prompts";

export interface Env {
	DISCORD_PUBLIC_KEY: string;
	DEEPSEEK_KEY: string;
	DEEPSEEK_BASE_URL: string;
	DEEPSEEK_MODEL: string;
}

const cooldowns = new Map<string, number>();
const COOLDOWN_CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

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

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method === "GET") {
			return Response.json({ status: "ok", uptime: Date.now() }, { status: 200 });
		}

		if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

		const sig = request.headers.get("X-Signature-Ed25519") ?? "";
		const ts = request.headers.get("X-Signature-Timestamp") ?? "";
		if (!(await verifyKey(await request.clone().text(), sig, ts, env.DISCORD_PUBLIC_KEY))) {
			return new Response("Bad signature", { status: 401 });
		}

		const interaction: DiscordInteraction = await request.json();

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
					return Response.json({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: { content: "Please describe the snippet you need.", flags: 64 },
					});
				}
				question = lang ? `${prompt} in ${lang}` : prompt;
			} else {
				question = (opts.find(o => o.name === "question")?.value as string) ?? "";
				if (!question.trim()) {
					return Response.json({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: { content: "Please provide a question.", flags: 64 },
					});
				}
			}

			const remaining = checkCooldown(uid);
			if (remaining !== null) {
				return Response.json({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: { content: `\u23f1 Wait ${Math.ceil(remaining / 1000)}s before asking again.`, flags: 64 },
				});
			}
			cooldowns.set(uid, Date.now() + 10_000);

			const { application_id, token } = interaction;
			ctx.waitUntil(handleDeepSeek(question, application_id, token, env, name));

			return Response.json({ type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE });
		}

		return new Response("Unknown command", { status: 400 });
	},
};

async function handleDeepSeek(question: string, appId: string, token: string, env: Env, mode: string): Promise<void> {
	try {
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
				temperature: 0.1,
			}),
			signal: AbortSignal.timeout(30_000),
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
		let answer = fixMarkdown(data.choices[0].message.content.trim());
		if (!answer) answer = "I don't have a good answer for that. Try being more specific.";

		const { prompt_tokens, completion_tokens, total_tokens } = data.usage;
		const cost = ((prompt_tokens * 0.14) + (completion_tokens * 0.28)) / 1_000_000;
		const stats = `-# \u26a1 ${total_tokens} tokens ($${cost.toFixed(6)})`;

		answer = answer.replace(/(?<!<)(https?:\/\/[^\s<>]+)/g, "<$1>");

		const safe = question.replace(/([*_~`|>])/g, "\\$1");
		await patchWebhook(appId, token, `**${safe}**\n${answer}\n${stats}`);
	} catch (err) {
		const msg = err instanceof Error ? err.message : "Unknown error";
		console.error("DeepSeek error:", msg);
		await patchWebhook(appId, token, `\u26a0\ufe0f API error: ${msg}`);
	}
}

function fixMarkdown(text: string): string {
	if ((text.match(/```/g)?.length ?? 0) % 2 !== 0) text += "\n```";

	const singleBackticks = text.match(/(?<!`)`(?!``)/g);
	if (singleBackticks && singleBackticks.length % 2 !== 0) text += "`";

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
