const DISCORD_API = "https://discord.com/api/v10";

const commands = [
	{
		name: "ask",
		description: "Ask me anything",
		options: [
			{
				type: 3, // STRING
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
				type: 3, // STRING
				name: "refer",
				description: "Describe the snippet you need",
				required: true,
			},
			{
				type: 3, // STRING
				name: "language",
				description: "Choose the programming language",
				required: false,
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
	if (guildId) console.log(`  (guild: ${guildId})`);
	else console.log("  (global — may take up to 1 hour to propagate)");

	const res = await fetch(endpoint, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bot ${token}`,
		},
		body: JSON.stringify(commands),
	});

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
