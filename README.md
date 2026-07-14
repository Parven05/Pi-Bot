# Pi-Bot

A Discord bot that answers questions and generates code snippets using any OpenAI-compatible API (DeepSeek, OpenAI, Groq, Together, etc.). Runs on Cloudflare Workers.

Commands: `/ask <question>` and `/snippet <refer> <language>`

---

## Setup for beginners

This guide will get your own Pi-Bot running. You need a **Discord app**, a **Cloudflare account**, and an **AI provider API key** (all free tiers work).

### Step 1 — Clone the code

Open a terminal and run:

```bash
git clone https://github.com/Parven05/Pi-Bot
cd pi-bot
npm install
```

### Step 2 — Create a Discord app

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and click **New Application**. Give it a name (e.g. "Pi-Bot").
2. Go to the **Bot** page on the left sidebar. Click **Reset Token** and copy the token that appears. This is your bot token.
3. On the same Bot page, turn on **Message Content Intent** (under Privileged Gateway Intents).
4. Go to **OAuth2 > General**. Copy the **Client ID** at the top. This is your app ID.
5. Go to **General Information**. Copy the **Public Key** near the bottom.
6. Still on **OAuth2 > General**, scroll to **OAuth2 URL Generator**. Check `applications.commands` and `bot`. In the URL that appears, open it in your browser and add the bot to a Discord server you own.

You should now have three things saved: **bot token**, **client ID**, and **public key**.

### Step 3 — Set up Cloudflare

1. Create a [Cloudflare account](https://dash.cloudflare.com/sign-up) if you don't have one.
2. Go to [API Tokens](https://dash.cloudflare.com/profile/api-tokens) and click **Create Token**.
3. Use the **Edit Cloudflare Workers** template. Under **Account Resources**, select your account. Under **Zone Resources**, select **All zones**.
4. Click **Continue to summary** then **Create Token**. Copy the token that appears.

### Step 4 — Get an AI provider API key

Pick any provider that supports OpenAI-compatible APIs. Here are some free/cheap options:

- **DeepSeek** — [platform.deepseek.com](https://platform.deepseek.com) — very cheap, great for code
- **OpenAI** — [platform.openai.com](https://platform.openai.com) — the original
- **Groq** — [console.groq.com](https://console.groq.com) — free tier available, fast
- **Together** — [together.ai](https://together.ai) — free credits to start

Sign up and create an API key. Save it — you'll need it next.

### Step 5 — Fill in your secrets

Create a file at `secrets/.env` (the folder already exists). Open it and paste:

```
# === REQUIRED ===
DISCORD_APP_ID=<paste your app ID here>
DISCORD_BOT_TOKEN=<paste your bot token here>
DISCORD_PUBLIC_KEY=<paste your public key here>
CLOUDFLARE_API_TOKEN=<paste your Cloudflare token here>
AI_API_KEY=<paste your AI provider API key here>

# === OPTIONAL ===
GUILD_ID=<paste your Discord server ID here>
```

**Where do I find my server ID?** In Discord, go to **User Settings > Advanced > Developer Mode** (turn it on). Then right-click your server icon and click **Copy ID**. That's your server ID. If you set this, commands register instantly. Without it, global commands take up to an hour to appear.

### Step 6 — Configure your AI model and bot settings

Open `wrangler.toml` in the project folder. This is where all non-secret settings live. The default file looks like this with explanations for every field:

```toml
name = "pi-bot"
main = "src/index.ts"
compatibility_date = "2025-07-01"

[vars]

# ----- AI PROVIDER -----

# The base URL for your AI provider's API.
# DeepSeek:   https://api.deepseek.com
# OpenAI:     https://api.openai.com/v1
# Groq:       https://api.groq.com/openai/v1
# Together:   https://api.together.xyz/v1
AI_BASE_URL = "https://api.deepseek.com"

# Which model to use.
# DeepSeek: "deepseek-chat" or "deepseek-reasoner"
# OpenAI:   "gpt-4o-mini" or "gpt-4o"
# Groq:     "llama-3.3-70b-versatile"
# Together: "mistralai/Mixtral-8x7B-Instruct-v0.1"
AI_MODEL = "deepseek-v4-flash"

# Your API key — but DON'T put it here! Put it in secrets/.env as AI_API_KEY.
# The worker reads it from env at runtime.
AI_API_KEY = ""

# ----- COST TRACKING -----

# Your provider's price per million input/output tokens in USD.
# These show up in the bot's response footer (e.g. "128 tokens ($0.000002)").
# If you leave them empty or invalid, the bot shows just the token count.
AI_INPUT_COST_PER_M = "0.14"
AI_OUTPUT_COST_PER_M = "0.28"

# ----- REASONING / THINKING -----

# Set to "on" for models that support chain-of-thought reasoning,
# like OpenAI's o-series or DeepSeek R1. Leave "off" for normal models.
AI_REASONING_ENABLED = "off"

# How much the model should "think" before answering: "low", "medium", or "high".
# Higher effort gives better answers but takes longer. Only used when REASONING_ENABLED is "on".
AI_REASONING_EFFORT = "medium"

# ----- RATE LIMITING -----

# How long (in milliseconds) a user must wait before sending another command.
# 10000 ms = 10 seconds. Set higher to prevent spam, lower for faster chat.
COOLDOWN_MS = "10000"

# How often (in ms) the bot cleans up old cooldown records from memory.
# 60000 ms = 60 seconds. This is just cleanup — doesn't affect the actual cooldown time.
COOLDOWN_CLEANUP_INTERVAL_MS = "60000"

# ----- INPUT VALIDATION -----

# Minimum characters a question must have. Set to 1 to allow very short questions.
MIN_INPUT_CHARS = "4"

# Maximum characters a question can have. Longer text gets rejected.
MAX_INPUT_CHARS = "800"

# ----- API TIMEOUT & RETRIES -----

# How long (in ms) to wait for the AI provider to respond before giving up.
# 25000 ms = 25 seconds. Increase for slow models, decrease for fast ones.
API_TIMEOUT_MS = "25000"

# How many times to retry if the API call fails (0 = no retries).
API_RETRIES = "1"

# Delay (in ms) between retry attempts. 1000 ms = 1 second.
RETRY_DELAY_MS = "1000"
```

That's it for configuration. Everything above can be changed without touching any code.

### Step 7 — Deploy!

Run this command in the project folder:

```bash
./run.sh all
```

This does two things:
1. **Deploys** the worker to Cloudflare (uses your Cloudflare token)
2. **Registers** the slash commands with Discord (uses your bot token)

If you only want to do one at a time:

```bash
./run.sh deploy     # deploy the worker only
./run.sh register   # register slash commands only
```

You can also use npm scripts:

```bash
npm run dev          # run locally for testing
npm run register     # register commands (reads secrets/.env)
npm run register:dev # register commands without reading .env
```

### Step 8 — Connect Discord to your worker

1. Go back to the [Discord Developer Portal](https://discord.com/developers/applications) and open your app.
2. Go to **General Information**.
3. Find **Interactions Endpoint URL** and set it to:

   ```
   https://pi-bot.<your-cloudflare-subdomain>.workers.dev
   ```

   Your subdomain is whatever Cloudflare gave you (usually your worker name). After deploying, the terminal output shows the full URL.

4. Click **Save**.

**You're done!** Go to your Discord server and type `/ask` or `/snippet` to test the bot.

---

## Customization

### Change the bot's personality

Open `src/prompts.ts`. Edit `SYSTEM_PROMPT` to change how the bot talks — name, tone, audience level, rules. Edit `SNIPPET_PROMPT` to change how code snippets are generated.

### Add or remove snippet languages

Open `src/commands.ts`. Edit the `LANGUAGES` array. Supported by default: `C`, `C++`, `C#`, `Rust`, `Java`, `JavaScript`, `Python`, `Bash`, `Nix`. After changing, run `./run.sh register` to update Discord.

### Allow full code requests

By default, the bot rejects phrases like "full app" or "production code". Open `src/index.ts` and edit or delete the `FULL_CODE_PATTERNS` array to change this behavior.

### Edit the landing page

Open `docs/site.ts`. The page served at your worker URL is a single HTML string. Edit it to change the title, privacy policy, or terms.

### Unlimited output

The bot has no output token limit. To cap it, add `max_tokens` to the request body in `callAPI()` inside `src/index.ts`.

---

## Project structure

```
├── docs/site.ts              # Landing page HTML (edit here)
├── secrets/
│   └── .env                  # Your secrets (gitignored — never commit this)
├── scripts/
│   └── register-commands.ts  # Discord command registration script
├── src/
│   ├── commands.ts           # Command definitions and language list
│   ├── index.ts              # Main worker code
│   └── prompts.ts            # AI system prompts
├── run.sh                    # Deploy and register helper script
├── wrangler.toml             # Worker config and non-secret settings
└── package.json
```

## License

MIT
