# Pi-Bot

A Discord bot that answers questions and generates code snippets using any OpenAI-compatible API. Runs on Cloudflare Workers.

Commands: `/ask <question>` and `/snippet <refer> <language>`

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/Parven05/Pi-Bot
cd pi-bot
npm install
```

### 2. Create a Discord app

1. [Discord Dev Portal](https://discord.com/developers/applications) → new app
2. **Bot** page → copy token
3. **OAuth2 > General** → copy Client ID (app ID)
4. **General Information** → copy Public Key
5. Enable **Message Content Intent** on the Bot page
6. OAuth2 URL Generator → add bot to a server with `applications.commands` + `bot` scopes

### 3. Set up Cloudflare & an AI provider

- Cloudflare account → [API token](https://dash.cloudflare.com/profile/api-tokens) with `Workers` permission
- API key from any OpenAI-compatible provider (DeepSeek, OpenAI, Groq, Together, etc.)

### 4. Fill in secrets

Edit `secrets/.env`:

```
DISCORD_APP_ID=<app ID>
DISCORD_BOT_TOKEN=<bot token>
DISCORD_PUBLIC_KEY=<public key>
GUILD_ID=<server ID>          # optional, for instant command registration
CLOUDFLARE_API_TOKEN=<token>  # from step 3
AI_API_KEY=<API key>          # from step 3
```

Non-secret config lives in `wrangler.toml [vars]` — no need to touch `.env` for those.

### 5. Deploy

```bash
./run.sh all       # deploy worker + register commands
./run.sh deploy    # deploy only
./run.sh register  # register only
```

Or use npm scripts: `npm run dev` (local), `npm run register` (env-file), `npm run register:dev` (no env-file).

### 6. Connect Discord to your worker

Discord app → **General Information** → set **Interactions Endpoint URL** to `https://pi-bot.<your-subdomain>.workers.dev` → Save.

---

## Full `wrangler.toml`

```toml
name = "pi-bot"
main = "src/index.ts"
compatibility_date = "2025-07-01"

[vars]
# AI provider
AI_BASE_URL = "https://api.deepseek.com"
AI_MODEL = "deepseek-v4-flash"
AI_API_KEY = ""                          # set via secrets/.env instead
AI_INPUT_COST_PER_M = "0.14"             # cost tracking
AI_OUTPUT_COST_PER_M = "0.28"
AI_REASONING_ENABLED = "off"             # "on" for o-series, R1, etc.
AI_REASONING_EFFORT = "medium"           # low | medium | high

# Runtime tuning
COOLDOWN_MS = "10000"
COOLDOWN_CLEANUP_INTERVAL_MS = "60000"
MIN_INPUT_CHARS = "4"
MAX_INPUT_CHARS = "800"
API_TIMEOUT_MS = "25000"
API_RETRIES = "1"
RETRY_DELAY_MS = "1000"
```

### Vars reference

| Var | Default | Description |
|-----|---------|-------------|
| `AI_BASE_URL` | — | OpenAI-compatible API base URL |
| `AI_MODEL` | — | Model name (e.g. `gpt-4o-mini`, `deepseek-chat`) |
| `AI_API_KEY` | — | **Set in `secrets/.env`, not here** |
| `AI_INPUT_COST_PER_M` | — | Per-million input tokens cost (USD), for footer stats. Unset = token count only |
| `AI_OUTPUT_COST_PER_M` | — | Per-million output tokens cost (USD). Unset = token count only |
| `AI_REASONING_ENABLED` | `off` | `"on"` enables chain-of-thought reasoning (o-series, DeepSeek R1, etc.) |
| `AI_REASONING_EFFORT` | `medium` | `low` / `medium` / `high` — how much the model thinks |
| `COOLDOWN_MS` | `10000` | Wait (ms) between commands per user |
| `COOLDOWN_CLEANUP_INTERVAL_MS` | `60000` | How often stale cooldown entries are evicted |
| `MIN_INPUT_CHARS` | `4` | Minimum question length |
| `MAX_INPUT_CHARS` | `800` | Maximum question length |
| `API_TIMEOUT_MS` | `25000` | API request timeout |
| `API_RETRIES` | `1` | Retry attempts on failure |
| `RETRY_DELAY_MS` | `1000` | Delay (ms) between retries |
| `temperature` | `0` (snippet) / `0.1` (ask) | Set in code (`src/index.ts`), not in toml |

---

## Customization

### Personality (`src/prompts.ts`)

Edit `SYSTEM_PROMPT` (tone, audience level, rules) and `SNIPPET_PROMPT` (output format, max 30 lines, no placeholders).

### Languages (`src/commands.ts`)

Supported: `C`, `C++`, `C#`, `Rust`, `Java`, `JavaScript`, `Python`, `Bash`, `Nix`. Edit `LANGUAGES` array, re-run `./run.sh register`.

### Full code rejection (`src/index.ts`)

`FULL_CODE_PATTERNS` regexes reject "full app", "production code", etc. Remove or edit to allow full requests.

### Landing page (`docs/site.ts`)

Edit the HTML template literal for the worker root URL page.

### Unlimited output

No `max_tokens` set. Add it to the request body in `callAPI()` inside `src/index.ts` if you want a cap.

---

## Project structure

```
├── docs/site.ts              # Landing page HTML
├── secrets/.env              # Your secrets (gitignored)
├── scripts/
│   └── register-commands.ts  # Discord command registration
├── src/
│   ├── commands.ts           # Command defs + language list
│   ├── index.ts              # Main worker code
│   └── prompts.ts            # AI system prompts
├── run.sh                    # Deploy & register helper
├── wrangler.toml             # Worker config + non-secret vars
└── package.json
```

## License

MIT
