/**
 * Register slash commands with Discord.
 * Usage: npx tsx register-commands.ts
 *
 * Requires env vars:
 *   DISCORD_APP_ID    - your Discord application ID
 *   DISCORD_BOT_TOKEN - your bot token
 *
 * Optional:
 *   GUILD_ID - register only in a specific guild (instant, good for testing)
 *              Omitting this registers globally (may take up to 1 hour to propagate)
 */

const DISCORD_API = "https://discord.com/api/v10";
const OPTION_TYPE_STRING = 3;

const LANGUAGE_CHOICES = [
	"C",
	"C++",
	"C#",
	"Rust",
	"Java",
	"JavaScript",
	"Python",
	"Bash",
	"Nix",
].map(lang => ({ name: lang, value: lang }));

const commands = [
	{
		name: "ask",
		description: "Ask me anything",
		options: [
			{
				type: OPTION_TYPE_STRING,
				name: "question",
				description: "Your question",
				required: true,
			},
		],
	},
	{
		name: "snippet",
		description: "Generate a short code snippet",
		options: [
			{
				type: OPTION_TYPE_STRING,
				name: "refer",
				description: "Describe the snippet you need",
				required: true,
			},
			{
				type: OPTION_TYPE_STRING,
				name: "language",
				description: "Choose the programming language",
				required: true,
				choices: LANGUAGE_CHOICES,
			},
		],
	},
];

async function main() {
	const appId = process.env.DISCORD_APP_ID;
	const token = process.env.DISCORD_BOT_TOKEN;
	const guildId = process.env.GUILD_ID;

	if (!appId || !token) {
		console.error("Missing DISCORD_APP_ID or DISCORD_BOT_TOKEN");
		process.exit(1);
	}

	const endpoint = guildId
		? `${DISCORD_API}/applications/${appId}/guilds/${guildId}/commands`
		: `${DISCORD_API}/applications/${appId}/commands`;

	console.log(`Registering ${commands.length} command(s)...`);
	console.log(guildId ? `  (guild: ${guildId})` : "  (global — may take up to 1 hour to propagate)");

	let res: Response;
	try {
		res = await fetch(endpoint, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bot ${token}`,
			},
			body: JSON.stringify(commands),
		});
	} catch (err) {
		console.error("Network error registering commands:", err);
		process.exit(1);
	}

	if (!res.ok) {
		const body = await res.text().catch(() => "");
		console.error(`Failed to register commands: ${res.status} ${body}`);
		process.exit(1);
	}

	const registered = await res.json() as { id: string; name: string }[];
	for (const cmd of registered) {
		console.log(`  /${cmd.name} registered (id: ${cmd.id})`);
	}
}

main().catch(console.error);