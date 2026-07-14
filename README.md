# Pi-Bot

A Discord bot that answers questions and generates code snippets using any OpenAI-compatible API (DeepSeek, OpenAI, Groq, Together, etc.). Runs on Cloudflare Workers.

Commands: `/ask <question>` and `/snippet <refer> <language>`

---

## Setup

This guide gets your own Pi-Bot running. You need a Discord app, a Cloudflare account, and an AI provider API key. Free tiers work for all three.

### Step 1 — Clone the code

```bash
git clone https://github.com/Parven05/Pi-Bot
cd pi-bot
npm install
```

### Step 2 — Create a Discord app

Go to the [Discord Developer Portal](https://discord.com/developers/applications) and click New Application. Name it (e.g. "Pi-Bot").

Go to the Bot page and click Reset Token. Copy the token that appears. This is your bot token.

On the same Bot page, turn on Message Content Intent under Privileged Gateway Intents.

Go to OAuth2 > General. Copy the Client ID at the top. This is your app ID.

Go to General Information. Copy the Public Key near the bottom.

Still on OAuth2 > General, find the OAuth2 URL Generator. Check `applications.commands` and `bot`. Open the generated URL in your browser and add the bot to a Discord server you own.

You should now have three values saved: bot token, client ID, and public key.

### Step 3 — Set up Cloudflare

Create a [Cloudflare account](https://dash.cloudflare.com/sign-up) if you don't have one.

Go to [API Tokens](https://dash.cloudflare.com/profile/api-tokens) and click Create Token. Use the Edit Cloudflare Workers template. Under Account Resources select your account. Under Zone Resources select All zones. Click Continue to summary then Create Token. Copy the token.

### Step 4 — Get an AI provider API key

Pick any provider that supports OpenAI-compatible APIs. Popular options include DeepSeek (platform.deepseek.com, cheap and great for code), OpenAI (platform.openai.com, the original), Groq (console.groq.com, free tier available and fast), and Together (together.ai, free credits to start).

Sign up and create an API key. Save it.

### Step 5 — Fill in secrets

Create the file `secrets/.env` and paste this:

```
DISCORD_APP_ID=<your app ID>
DISCORD_BOT_TOKEN=<your bot token>
DISCORD_PUBLIC_KEY=<your public key>
CLOUDFLARE_API_TOKEN=<your Cloudflare token>
AI_API_KEY=<your AI provider API key>
GUILD_ID=<your Discord server ID>   (optional)
```

To find your server ID, turn on Developer Mode in Discord (User Settings > Advanced > Developer Mode), then right click your server icon and click Copy ID. If you set GUILD_ID, commands register instantly. Without it, global commands take up to an hour to show up.

### Step 6 — Configure settings in `wrangler.toml`

Open `wrangler.toml`. This file has all non-secret settings. Every field is explained in comments below.

```toml
name = "pi-bot"
main = "src/index.ts"
compatibility_date = "2025-07-01"

[vars]

# === AI PROVIDER ===

# Base URL for your AI provider's API.
# DeepSeek:   https://api.deepseek.com
# OpenAI:     https://api.openai.com/v1
# Groq:       https://api.groq.com/openai/v1
# Together:   https://api.together.xyz/v1
AI_BASE_URL = "https://api.deepseek.com"

# Model name to use.
# DeepSeek: "deepseek-chat" or "deepseek-reasoner"
# OpenAI:   "gpt-4o-mini" or "gpt-4o"
# Groq:     "llama-3.3-70b-versatile"
# Together: "mistralai/Mixtral-8x7B-Instruct-v0.1"
AI_MODEL = "deepseek-v4-flash"

# Don't put your API key here. Put it in secrets/.env as AI_API_KEY instead.
AI_API_KEY = ""

# === COST TRACKING ===

# Price per million input/output tokens in USD.
# Shows up in the bot's footer (e.g. "128 tokens ($0.000002)").
# Leave empty or invalid to show token count only.
AI_INPUT_COST_PER_M = "0.14"
AI_OUTPUT_COST_PER_M = "0.28"

# === REASONING / THINKING ===

# Set to "on" for models with chain-of-thought reasoning (OpenAI o-series, DeepSeek R1).
# Leave "off" for normal chat models.
AI_REASONING_ENABLED = "off"

# Controls how much the model thinks before answering: "low", "medium", or "high".
# Only used when AI_REASONING_ENABLED is "on".
AI_REASONING_EFFORT = "medium"

# === RATE LIMITING ===

# Milliseconds a user must wait between commands. 10000 = 10 seconds.
COOLDOWN_MS = "10000"

# Milliseconds between cleanup passes of stale cooldown records. Just maintenance.
COOLDOWN_CLEANUP_INTERVAL_MS = "60000"

# === INPUT VALIDATION ===

# Minimum characters per question.
MIN_INPUT_CHARS = "4"

# Maximum characters per question. Longer input gets rejected.
MAX_INPUT_CHARS = "800"

# === API TIMEOUT & RETRIES ===

# Milliseconds to wait for the AI provider before timing out. 25000 = 25 seconds.
API_TIMEOUT_MS = "25000"

# Number of retry attempts on failure. 0 means no retries.
API_RETRIES = "1"

# Milliseconds to wait between retries. 1000 = 1 second.
RETRY_DELAY_MS = "1000"
```

You can change any value here without touching code.

### Step 7 — Deploy

Run this from the project folder:

```bash
./run.sh all
```

This deploys the worker to Cloudflare and registers the slash commands with Discord.

If you want to do them separately:
```bash
./run.sh deploy     # deploy worker only
./run.sh register   # register commands only
```

You can also use npm scripts:
```bash
npm run dev          # run locally for testing
npm run register     # register commands (reads secrets/.env)
npm run register:dev # register commands without reading .env
```

### Step 8 — Connect Discord to your worker

Go back to the [Discord Developer Portal](https://discord.com/developers/applications) and open your app. Go to General Information. Find Interactions Endpoint URL and set it to:

```
https://pi-bot.<your-cloudflare-subdomain>.workers.dev
```

Your subdomain is whatever Cloudflare assigned (usually your worker name). The terminal shows the full URL after deploying. Click Save.

You're done. Go to your Discord server and type `/ask` or `/snippet` to test the bot.

---

## Customization

### Bot personality

Open `src/prompts.ts`. Edit `SYSTEM_PROMPT` to change the bot's name, tone, audience level, or rules. Edit `SNIPPET_PROMPT` to change how code snippets are formatted.

### Snippet languages

Open `src/commands.ts`. Edit the `LANGUAGES` array. Default languages are C, C++, C#, Rust, Java, JavaScript, Python, Bash, and Nix. After changing, run `./run.sh register` to update Discord.

### Full code rejection

By default the bot rejects phrases like "full app" or "production code". Open `src/index.ts` and edit or delete the `FULL_CODE_PATTERNS` array to change this.

### Landing page

Open `docs/site.ts`. The page at your worker URL is a single HTML string. Edit the template literal to change the title, description, privacy policy, or terms.

### Output limits

The bot has no output token limit. To add one, include `max_tokens` in the request body inside `callAPI()` in `src/index.ts`.

---

## Project structure

```
docs/site.ts              Landing page HTML
secrets/.env              Your secrets (gitignored, never commit this)
scripts/register-commands.ts  Discord command registration
src/commands.ts           Command definitions and language list
src/index.ts              Main worker code
src/prompts.ts            AI system prompts
run.sh                    Deploy and register helper
wrangler.toml             Worker config and non-secret settings
package.json
```

## License

MIT
