# Pi-Bot

A private Discord bot for the ParvenPi server. Runs on Cloudflare Workers and uses DeepSeek V4 Flash for responses.

## Commands

| Command | Description |
|---|---|
| `/ask <question>` | Ask a programming question. Returns a concise answer with a reference link. |
| `/snippet <refer> <language>` | Generate a short code snippet with inline explanations and a reference link. |

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

Set the Worker URL as your Discord Interactions Endpoint URL in the Discord Developer Portal. Register the `/ask` and `/snippet` slash commands.

## Project Structure

```
src/
├── index.ts    # Worker entrypoint and command logic
├── prompts.ts  # System prompts for the AI
└── site.ts     # Static site HTML (about, privacy, terms)
```

## License

MIT
