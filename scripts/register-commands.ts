import { DISCORD_COMMANDS } from "../src/commands";

const DISCORD_API = "https://discord.com/api/v10";

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

  console.log(`Registering ${DISCORD_COMMANDS.length} command(s)...`);
  console.log(guildId ? `  (guild: ${guildId})` : "  (global — may take up to 1 hour to propagate)");

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${token}`,
      },
      body: JSON.stringify(DISCORD_COMMANDS),
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

  const registered = (await res.json()) as { id: string; name: string }[];
  for (const cmd of registered) {
    console.log(`  /${cmd.name} registered (id: ${cmd.id})`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});