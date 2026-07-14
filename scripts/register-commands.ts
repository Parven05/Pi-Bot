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

  async function put(endpoint: string, body: unknown) {
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`PUT ${endpoint} failed: ${res.status} ${text}`);
      process.exit(1);
    }
    return res.json() as Promise<{ id: string; name: string }[]>;
  }

  const target = guildId
    ? `${DISCORD_API}/applications/${appId}/guilds/${guildId}/commands`
    : `${DISCORD_API}/applications/${appId}/commands`;

  console.log(`Registering ${DISCORD_COMMANDS.length} command(s)...`);
  console.log(guildId ? `  (guild: ${guildId})` : "  (global — may take up to 1 hour to propagate)");

  // Register commands in the target scope
  const registered = await put(target, DISCORD_COMMANDS);
  for (const cmd of registered) {
    console.log(`  /${cmd.name} registered (id: ${cmd.id})`);
  }

  // Clear the opposite scope to prevent duplicate commands in Discord
  const opposite = guildId
    ? `${DISCORD_API}/applications/${appId}/commands`
    : `${DISCORD_API}/applications/${appId}/guilds/${guildId}/commands`;
  if (opposite !== target) {
    console.log(guildId ? "  Clearing global commands..." : `  Clearing guild commands (${guildId})...`);
    await put(opposite, []);
    console.log("  Done.");
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
