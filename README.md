# Pi-Bot

A Discord bot that answers questions and generates code snippets using any OpenAI-compatible API. Hosted on Cloudflare Workers for free.

Commands: `/ask <question>` and `/snippet <refer> <language>`

---

## How to make your own bot

Clone, fill in two files, deploy. Takes 10 minutes.

```bash
git clone https://github.com/Parven05/Pi-Bot
cd pi-bot
npm install
```

### 1. Get four things from Discord

Create a new app at the [Discord Developer Portal](https://discord.com/developers/applications). Then collect these:

Bot page → Reset Token → copy the **bot token**.

Bot page → turn on **Message Content Intent**.

OAuth2 > General → copy the **Client ID** (this is your app ID).

General Information → copy the **Public Key**.

OAuth2 URL Generator → check `applications.commands` and `bot` → open the URL → add the bot to your server.

### 2. Get two API keys

Cloudflare: Create an account, go to [API Tokens](https://dash.cloudflare.com/profile/api-tokens), create a token with the Edit Cloudflare Workers template. Copy it.

AI provider: Sign up at DeepSeek, OpenAI, Groq, or Together. Create an API key. Copy it.

### 3. Create `secrets/.env`

Paste this (replace everything in angle brackets):

```
DISCORD_APP_ID=<app ID>
DISCORD_BOT_TOKEN=<bot token>
DISCORD_PUBLIC_KEY=<public key>
CLOUDFLARE_API_TOKEN=<Cloudflare token>
AI_API_KEY=<AI provider key>
GUILD_ID=<server ID>   (optional, makes commands appear instantly)
```

To find your server ID: Discord Settings > Advanced > Developer Mode (on), then right click your server icon > Copy ID.

### 4. Review `wrangler.toml`

Open it. Every setting already has working defaults. The comments explain what each field does. The only thing you might change is `AI_BASE_URL` and `AI_MODEL` to match your AI provider. The actual API key goes in `secrets/.env`, not here.

### 5. Deploy

```bash
./run.sh all
```

### 6. Connect Discord

Back in the Discord Developer Portal, open your app. Go to General Information. Set Interactions Endpoint URL to `https://pi-bot.<your-subdomain>.workers.dev`. The terminal shows the full URL after deploying. Click Save.

Done. Type `/ask` or `/snippet` in your server.

---

## `wrangler.toml` — all settings explained in comments

```toml
name = "pi-bot"
main = "src/index.ts"
compatibility_date = "2025-07-01"

[vars]

# === AI PROVIDER ===

# DeepSeek: https://api.deepseek.com  |  OpenAI: https://api.openai.com/v1
# Groq:     https://api.groq.com/openai/v1  |  Together: https://api.together.xyz/v1
AI_BASE_URL = "https://api.deepseek.com"

# DeepSeek: "deepseek-chat"  |  OpenAI: "gpt-4o-mini"
# Groq: "llama-3.3-70b-versatile"  |  Together: "mistralai/Mixtral-8x7B-Instruct-v0.1"
AI_MODEL = "deepseek-v4-flash"

# Put your actual key in secrets/.env, not here.
AI_API_KEY = ""

# === COST TRACKING ===

# Price per million input/output tokens in USD. Shows in response footer.
# Leave empty to show token count only.
AI_INPUT_COST_PER_M = "0.14"
AI_OUTPUT_COST_PER_M = "0.28"

# === REASONING ===

# "on" for chain-of-thought models (OpenAI o-series, DeepSeek R1). "off" otherwise.
AI_REASONING_ENABLED = "off"

# How much the model thinks: "low", "medium", or "high". Only when REASONING_ENABLED is "on".
AI_REASONING_EFFORT = "medium"

# === RATE LIMITING ===

COOLDOWN_MS = "10000"                    # Wait between commands per user (ms). 10000 = 10s.
COOLDOWN_CLEANUP_INTERVAL_MS = "60000"   # Stale cooldown cleanup interval (ms).

# === INPUT ===

MIN_INPUT_CHARS = "4"     # Shortest question allowed.
MAX_INPUT_CHARS = "800"   # Longest question allowed.

# === RETRIES ===

API_TIMEOUT_MS = "25000"   # API call timeout (ms). 25000 = 25s.
API_RETRIES = "1"          # Retry count on failure. 0 = no retries.
RETRY_DELAY_MS = "1000"    # Wait between retries (ms).
```

---

## Features

**Two commands.** `/ask` answers any question at beginner level. `/snippet` generates short code examples in 9 languages with inline comments and explanation.

**Cost tracking.** Every response footer shows token count and approximate cost based on your provider's pricing.

**Rate limiting.** Per user cooldown prevents spam. Configurable down to the millisecond.

**Configurable runtime.** All limits, timeouts, retries, and model settings live in `wrangler.toml`. No code edits for standard tuning.

**Any OpenAI-compatible API.** Swap providers by changing `AI_BASE_URL` and `AI_MODEL`. Works with DeepSeek, OpenAI, Groq, Together, and others.

**Chain-of-thought support.** Enable `AI_REASONING_ENABLED` for models that think before answering (OpenAI o-series, DeepSeek R1).

**Guided snippet output.** Code examples are limited to 30 lines, no placeholders, every line runs as written. No copy paste slop.

**Full code rejection.** Phrases like "full app" or "production code" are refused. Teaches concepts, not copy paste solutions. Edit `FULL_CODE_PATTERNS` in `src/index.ts` to disable.

**Unlimited output length.** No output token cap. Add `max_tokens` in `callAPI()` inside `src/index.ts` if you want one.

**Landing page.** The worker root URL serves an HTML page. Edit `docs/site.ts` to change it.

**Beginner personality.** The bot explains everything from scratch. No assumed knowledge. Edit `SYSTEM_PROMPT` in `src/prompts.ts` to change this.

---

## Customization

**Personality** `src/prompts.ts` Edit SYSTEM_PROMPT (tone, name, rules) and SNIPPET_PROMPT (output format).

**Languages** `src/commands.ts` Edit the LANGUAGES array. Default: C, C++, C#, Rust, Java, JavaScript, Python, Bash, Nix. Run `./run.sh register` after.

**Full code rejection** `src/index.ts` Edit or delete FULL_CODE_PATTERNS to allow full code requests.

**Landing page** `docs/site.ts` Edit the HTML template literal.

**Output cap** `src/index.ts` Add `max_tokens` to the request body in `callAPI()`.

---

## Project structure

```
docs/site.ts                  Landing page HTML
secrets/.env                  Secrets (gitignored)
scripts/register-commands.ts  Discord command registration
src/commands.ts               Command defs and language list
src/index.ts                  Main worker
src/prompts.ts                AI system prompts
run.sh                        Deploy and register helper
wrangler.toml                 Config and non-secret settings
package.json
```

## License

MIT
