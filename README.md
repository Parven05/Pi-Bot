# Pi-Bot

A private Discord bot for the ParvenPi server. Runs on [Cloudflare Workers](https://workers.cloudflare.com/), responds to slash commands via [DeepSeek](https://deepseek.com/) API.

## How It Works

1. Discord sends slash command interactions to the Worker's public URL via outgoing webhook.
2. The Worker verifies the request signature (Ed25519), then calls DeepSeek's chat API with a system prompt.
3. DeepSeek responds; the Worker patches the original interaction message with the answer.
4. Each user has a 10-second cooldown per command to prevent spam.

Two commands:

- **`/ask <question>`** — general Q&A with a programming-reference system prompt.
- **`/snippet <refer> [language]`** — generates a short code snippet. Optional `language` parameter for syntax highlighting.

The bot is intentionally stateless — every request is fire-and-forget. Cooldowns live in-memory per Worker instance.

## Commands

| Command | Description |
|---|---|
| `/ask question:` | Ask anything. Gets a concise, direct answer from DeepSeek. |
| `/snippet refer: language?:` | Generate a short code snippet. Language is optional (auto-detected). |

## Make Your Own Bot

This project is a minimal template. To adapt it:

1. **Fork or copy** this repo.
2. Edit `src/index.ts` — the `SYSTEM_PROMPT` and `SNIPPET_PROMPT` constants control personality and behavior. Swap them for your own use case.
3. Change the slash command definitions in the [Discord Developer Portal](https://discord.com/developers/applications) (name, options, descriptions).
4. Optionally swap the AI provider — replace the `fetch` call in `handleDeepSeek()` with any OpenAI-compatible API (OpenAI, Anthropic via proxy, local llama.cpp, etc.).

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A [Discord application](https://discord.com/developers/applications) with a bot user
- A [Cloudflare account](https://dash.cloudflare.com/) (free tier works)
- A DeepSeek API key (or any OpenAI-compatible provider)

### 1. Clone and install

```bash
git clone <your-fork>
cd pi-bot
npm install
```

### 2. Set environment variables

Copy the example and fill in your values:

```bash
cp .env.wrangler .env
# Edit .env — add these:
# DEEPSEEK_KEY=sk-your-deepseek-key
```

The Worker expects these secrets at runtime:

| Secret | Description |
|---|---|
| `DISCORD_PUBLIC_KEY` | From Discord Developer Portal under your app → General Information |
| `DEEPSEEK_KEY` | Your DeepSeek API key |
| `DEEPSEEK_BASE_URL` | Default: `https://api.deepseek.com` — change to use another provider |
| `DEEPSEEK_MODEL` | Default: `deepseek-v4-flash` — model name for the API |

### 3. Set Discord Public Key as a secret

```bash
npx wrangler secret put DISCORD_PUBLIC_KEY
```

Then set your DeepSeek key the same way:

```bash
npx wrangler secret put DEEPSEEK_KEY
```

> `DEEPSEEK_BASE_URL` and `DEEPSEEK_MODEL` are plain vars in `wrangler.toml` — you can override them with `npx wrangler secret put` if needed.

### 4. Deploy

```bash
npm run deploy
```

This runs `wrangler deploy` and prints your Worker URL (e.g. `https://pi-bot.<your-subdomain>.workers.dev`).

### 5. Register slash commands with Discord

Use the [Discord Interactions Endpoint](https://discord.com/developers/docs/interactions/application-commands#registering-a-command) or a tool like [discord-interactions-commands](https://www.npmjs.com/package/discord-interactions-commands) to register:

- **`/ask`** with a `question` string option (required)
- **`/snippet`** with a `refer` string option (required) and `language` string option (optional)

### 6. Connect Discord to your Worker

In the Discord Developer Portal, under your app → General Information, set **Interactions Endpoint URL** to your Worker URL.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server (`wrangler dev`) |
| `npm run deploy` | Publish to Cloudflare Workers |
| `npm run typecheck` | Run TypeScript type checking |

## Project Structure

```
pi-bot/
├── src/index.ts        # Worker entrypoint and command logic
├── wrangler.toml       # Cloudflare Workers config
├── .env.wrangler       # Local env template (gitignored)
├── package.json
└── tsconfig.json
```

## License

MIT — see [LICENSE](LICENSE).
