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

Edit `secrets/.env`:

```
# Discord
DISCORD_APP_ID=<from step 2>
DISCORD_BOT_TOKEN=<from step 2>
DISCORD_PUBLIC_KEY=<from step 2>
GUILD_ID=<your Discord server ID> (optional, for instant registration)

# Cloudflare
CLOUDFLARE_API_TOKEN=<from step 3>

# AI provider
AI_API_KEY=<from step 3>
```

Non-secret config (model, base URL, cost tracking, reasoning settings) lives in `wrangler.toml` under `[vars]` — no need to touch `.env` for those.

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

Or use npm scripts directly:
```bash
npm run dev          # local dev with wrangler
npm run register     # register commands (loads secrets/.env)
npm run register:dev # register commands without node --env-file
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

Open `wrangler.toml` and change the `[vars]` section:

```toml
[vars]
AI_BASE_URL = "https://api.openai.com/v1"
AI_MODEL = "gpt-4o-mini"
AI_INPUT_COST_PER_M = "0.15"
AI_OUTPUT_COST_PER_M = "0.60"
AI_REASONING_ENABLED = "off"
AI_REASONING_EFFORT = "medium"
```

No code changes needed for any OpenAI-compatible provider. Just change the values and put your key in `secrets/.env` as `AI_API_KEY`.

### Cost tracking

The bot shows a token usage footer on every response. To get accurate cost display, set `AI_INPUT_COST_PER_M` and `AI_OUTPUT_COST_PER_M` in `wrangler.toml` to your provider's per-million-token prices in USD. If these are unset or invalid, it falls back to showing just the token count.

### Reasoning / thinking models

For models that support chain-of-thought reasoning (e.g. OpenAI o-series, DeepSeek R1), set `AI_REASONING_ENABLED = "true"` in `wrangler.toml`. The `AI_REASONING_EFFORT` value (`low` / `medium` / `high`) controls how much thinking the model does.

### Supported languages for snippets

The `/snippet` command only allows these 9 languages:

`C`, `C++`, `C#`, `Rust`, `Java`, `JavaScript`, `Python`, `Bash`, `Nix`

This is intentional. Fewer languages means:
- **Better syntax highlighting.** Clean formatting for every output.
- **Deeper model knowledge.** The model has more training data per language, so code is more accurate and hallucinations are lower.
- **Higher quality.** Each language gets tested and tuned. Adding random languages would make the bot less reliable.

To add or remove languages, edit `LANGUAGES` in `src/commands.ts` (the single source of truth). After changing, run `./run.sh register` to update the Discord commands.

### Why snippets refuse full code requests

The bot uses **`FULL_CODE_PATTERNS`** in `src/index.ts` to detect phrases like "full app", "production code", "complete project" and rejects them.

This is intentional:
- **Keep it a reference tool.** The bot teaches concepts and patterns, not copy-paste solutions.
- **Ethical.** Blindly using AI-generated code without understanding it is bad practice.

You can remove or change `FULL_CODE_PATTERNS` if you want to allow full code requests.

### Output is unlimited

There is no output token limit. The model can generate as long as it wants. Only input has a character limit (`MAX_INPUT_CHARS`).

If you want to cap output length, add `max_tokens` to the request body in `callAPI()` inside `src/index.ts`.

### Other settings in `src/index.ts`

| Setting | Default | What it does |
|---------|---------|-------------|
| `MAX_INPUT_CHARS` | 800 | Max characters per question |
| `MIN_INPUT_CHARS` | 4 | Min characters per question |
| `COOLDOWN_MS` | 10,000 | Wait time (ms) between requests per user |
| `API_TIMEOUT_MS` | 25,000 | Max wait for the API response |
| `API_RETRIES` | 1 | Retry attempts on failure |
| `temperature` | 0 (snippet) / 0.1 (ask) | Lower = more predictable, higher = more creative |

### Edit the landing page (`docs/site.ts`)

The page served at the worker URL is a single HTML string in `docs/site.ts`. Edit the template literal to change the title, description, privacy policy, or terms.

## Project structure

```
├── docs/site.ts              # Landing page (edit the HTML here)
├── secrets/                  # Your secrets (gitignored)
│   └── .env
├── scripts/
│   └── register-commands.ts  # Command registration script
├── src/
│   ├── commands.ts           # Command definitions and language list
│   ├── index.ts              # Main bot code (worker)
│   └── prompts.ts            # AI instructions
├── run.sh                    # Deploy and register helper
├── wrangler.toml             # Worker config and non-secret vars
└── package.json
```

## License

MIT
