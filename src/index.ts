import { InteractionType, InteractionResponseType, verifyKey } from "discord-interactions";

export interface Env {
	DISCORD_PUBLIC_KEY: string;
	DEEPSEEK_KEY: string;
	DEEPSEEK_BASE_URL: string;
	DEEPSEEK_MODEL: string;
}

const SYSTEM_PROMPT = [
	"You are Pi Bot, created by Parven, powered by DeepSeek V4 Flash.",
	"If asked who you are, say exactly that.",
	"Max 80 tokens. No preamble. Use simple English, short if possible.",
	"Reply in 1-2 short paragraphs.",
	"Code? Use ```<lang>\\n...```",
	"Bullet points only if the question explicitly asks for a list.",
].join("\n");

const COOLDOWN_MS = 10_000;
const cooldowns = new Map<string, number>();

function checkCooldown(id: string): number | null {
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
		// Health check
		if (request.method === "GET") {
			return Response.json({ status: "ok", uptime: Date.now() }, { status: 200 });
		}

		if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

		// Verify Discord signature
		const sig = request.headers.get("X-Signature-Ed25519") ?? "";
		const ts = request.headers.get("X-Signature-Timestamp") ?? "";
		if (!(await verifyKey(await request.clone().text(), sig, ts, env.DISCORD_PUBLIC_KEY))) {
			return new Response("Bad signature", { status: 401 });
		}

		const interaction: DiscordInteraction = await request.json();

		// Ping
		if (interaction.type === InteractionType.PING) {
			return Response.json({ type: InteractionResponseType.PONG });
		}

		// /ask
		if (interaction.type === InteractionType.APPLICATION_COMMAND && interaction.data?.name === "ask") {
			const uid = interaction.member?.user?.id ?? interaction.user?.id ?? "unknown";
			const question = (interaction.data.options?.find(o => o.name === "question")?.value as string) ?? "";

			// Cooldown
			const remaining = checkCooldown(uid);
			if (remaining !== null) {
				return Response.json({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: { content: `\u23f1 Wait ${Math.ceil(remaining / 1000)}s before asking again.`, flags: 64 },
				});
			}
			cooldowns.set(uid, Date.now() + COOLDOWN_MS);

			// Defer, then call DeepSeek in background
			const { application_id, token } = interaction;
			ctx.waitUntil(handleDeepSeek(question, application_id, token, env));

			return Response.json({ type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE });
		}

		return new Response("Unknown command", { status: 400 });
	},
};

async function handleDeepSeek(question: string, appId: string, token: string, env: Env): Promise<void> {
	try {
		const res = await fetch(`${env.DEEPSEEK_BASE_URL}/v1/chat/completions`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.DEEPSEEK_KEY}` },
			body: JSON.stringify({
				model: env.DEEPSEEK_MODEL,
				messages: [
					{ role: "system", content: SYSTEM_PROMPT },
					{ role: "user", content: question },
				],
				temperature: 0.1,
				max_tokens: 150,
			}),
			signal: AbortSignal.timeout(30_000),
		});

		if (!res.ok) {
			const text = await res.text().catch(() => "unknown error");
			throw new Error(`DeepSeek ${res.status}: ${text}`);
		}

		const data = await res.json() as { choices: { message: { content: string } }[] };
		const answer = data.choices[0].message.content.trim();
		const safe = question.replace(/([*_~`|>])/g, "\\$1");
		await patchWebhook(appId, token, `> **${safe}**\n${answer}`);
	} catch (err) {
		const msg = err instanceof Error ? err.message : "Unknown error";
		console.error("DeepSeek error:", msg);
		await patchWebhook(appId, token, `\u26a0\ufe0f API error: ${msg}`);
	}
}

async function patchWebhook(appId: string, token: string, content: string): Promise<void> {
	await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ content }),
	});
}
