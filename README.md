# Pi-Bot

A private Discord bot for the ParvenPi server. Runs on Cloudflare Workers and uses DeepSeek V4 Flash for responses.

## Commands

| Command | Description |
|---|---|
| `/ask <question>` | Ask me anything. |
| `/snippet <refer> <language>` | Generate a short code snippet with inline comments and a reference link. Choose the programming language. |

## Setup

```bash
git clone https://github.com/Parven05/Pi-Bot
cd pi-bot
npm install
```

Set your secrets:

```bash
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put DEEPSEEK_KEY
```

Configure `wrangler.toml` or set secrets for `DEEPSEEK_BASE_URL` and `DEEPSEEK_MODEL` if not using defaults.

Deploy:

```bash
npm run deploy
```

Set the Worker URL as your Discord Interactions Endpoint URL in the Discord Developer Portal.

Register the slash commands:

```bash
export DISCORD_APP_ID=<your-app-id>
export DISCORD_BOT_TOKEN=<your-bot-token>

# For a specific guild (instant, good for testing):
export GUILD_ID=<your-guild-id>
npm run register

# Or globally (can take up to 1 hour to propagate):
npm run register
```

## Project Structure

```
src/
├── index.ts    # Worker entrypoint and command logic
├── prompts.ts  # System prompts for the AI
└── site.ts     # Static site HTML (about, privacy, terms)
```

## License

MIT
