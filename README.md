# Pi-Bot

A Discord bot that answers questions and generates code snippets using any OpenAI-compatible API. Runs on Cloudflare Workers.

Commands: `/ask <question>` and `/snippet <refer> <language>`

---

## Setup your own bot

### 1. Clone and install

```bash
git clone https://github.com/Parven05/Pi-Bot
cd pi-bot
npm install
```

### 2. Create a Discord app

1. Go to https://discord.com/developers/applications and create a new app
2. Go to **Bot** page and copy the token
3. Go to **OAuth2 > General** and copy the **Client ID** (this is your app ID)
4. Go to **General Information** and copy the **Public Key**
5. Enable **Message Content Intent** on the Bot page
6. Use the OAuth2 URL Generator to add the bot to a server with `applications.commands` and `bot` scopes

### 3. Set up Cloudflare and an AI provider

1. Create a Cloudflare account if you don't have one
2. Get your API token from https://dash.cloudflare.com/profile/api-tokens (needs `Workers` permission)
3. Get an API key from any OpenAI-compatible provider (DeepSeek, OpenAI, Groq, Together, etc.)

### 4. Fill in secrets

Edit the files in `secrets/`:

**`secrets/.env`**
```
DISCORD_APP_ID=<from step 2>
DISCORD_BOT_TOKEN=<from step 2>
GUILD_ID=<your Discord server ID> (optional, for instant registration)
CLOUDFLARE_API_TOKEN=<from step 3>
```

**`secrets/.dev.vars`**
```
DISCORD_PUBLIC_KEY=<from step 2>
DEEPSEEK_KEY=<from step 3>
```

> The env var names (`DEEPSEEK_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`) are just names. You can point them at any provider by changing `wrangler.toml` (see below).

### 5. Deploy

```bash
./run.sh all
```

This deploys the worker and registers the slash commands.

### 6. Connect Discord to your worker

1. Go to your Discord app's **General Information** page
2. Set **Interactions Endpoint URL** to `https://pi-bot.<your-cloudflare-subdomain>.workers.dev`
3. Save

That's it. The bot is live.

---

If you only want to deploy or register separately:
```bash
./run.sh deploy     # deploy the worker
./run.sh register   # register slash commands only
```

## Customization

### Change bot personality (`src/prompts.ts`)

`SYSTEM_PROMPT` controls how the bot talks. Edit it to give the bot a persona:

- Change the name and owner
- Set the tone (formal, casual, funny)
- Change the audience level (beginner → expert)
- Add rules about what topics to allow or refuse

`SNIPPET_PROMPT` controls how code snippets are generated. It sets:
- Output format (code block + explanation)
- Max 30 lines per snippet
- No placeholders or TODOs. Every line must run
- Must explain like the reader is a beginner

### Connect a different AI provider (`wrangler.toml`)

Open `wrangler.toml` and change the `[vars]` section to match your provider. The env var names (`DEEPSEEK_*`) stay the same, just point them at your provider:

```toml
[vars]
# DeepSeek
DEEPSEEK_BASE_URL = "https://api.deepseek.com"
DEEPSEEK_MODEL = "deepseek-chat"

# OpenAI
# DEEPSEEK_BASE_URL = "https://api.openai.com"
# DEEPSEEK_MODEL = "gpt-4o-mini"

# Groq
# DEEPSEEK_BASE_URL = "https://api.groq.com/openai/v1"
# DEEPSEEK_MODEL = "llama-3.3-70b-versatile"

# OpenRouter
# DEEPSEEK_BASE_URL = "https://openrouter.ai/api/v1"
# DEEPSEEK_MODEL = "openai/gpt-4o-mini"

# Together
# DEEPSEEK_BASE_URL = "https://api.together.xyz/v1"
# DEEPSEEK_MODEL = "mistralai/Mixtral-8x7B-Instruct-v0.1"
```

No code changes needed. The bot reads these from the environment at runtime.

> Claude (Anthropic) is not OpenAI compatible. This bot will not work with it without code changes.

### Why snippets refuse full code requests

The bot uses two things to keep snippets short:

1. **`FULL_CODE_PATTERNS`** in `src/index.ts`. Detects phrases like "full app", "production code", "complete project" and rejects them.
2. **`max_tokens: 600`** for snippets vs 1024 for questions. Limits output length.

This is intentional:
- **Save tokens.** Short responses cost less.
- **Keep it a reference tool.** The bot teaches concepts and patterns, not copy-paste solutions.
- **Ethical.** Blindly using AI-generated code without understanding it is bad practice.

You can remove or change `FULL_CODE_PATTERNS` if you want to allow full code requests.

### Other settings in `src/index.ts`

| Setting | Default | What it does |
|---------|---------|-------------|
| `MAX_INPUT_CHARS` | 800 | Max characters per question |
| `MIN_INPUT_CHARS` | 4 | Min characters per question |
| `COOLDOWN_MS` | 10,000 | Wait time (ms) between requests per user |
| `API_TIMEOUT_MS` | 25,000 | Max wait for DeepSeek response |
| `API_RETRIES` | 1 | Retry attempts on failure |
| `temperature` | 0 (snippet) / 0.1 (ask) | Lower = more predictable, higher = more creative |

### Edit the landing page (`docs/site.ts`)

The page served at the worker URL is a single HTML string in `docs/site.ts`. Edit the template literal to change the title, description, privacy policy, or terms.

## Project structure

```
├── docs/site.ts              # Landing page (edit the HTML here)
├── secrets/                  # Your secrets (gitignored)
│   ├── .env
│   └── .dev.vars
├── src/
│   ├── index.ts              # Main bot code
│   ├── prompts.ts            # AI instructions
│   └── register-commands.ts  # Command registration script
├── run.sh                    # Deploy and register helper
├── wrangler.toml             # Worker config
└── package.json
```

## License

MIT
