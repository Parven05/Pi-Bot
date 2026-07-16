# Pi-Bot

A Discord bot with two modes: `/ask` answers any programming question, `/snippet` generates build-system script snippets only. Uses DeepSeek V4 Flash through an OpenAI compatible API. Runs on Cloudflare Workers.

- [Setup](#setup)
- [Commands](#commands)
- [Customize config](#customizing-the-config)
- [Customize persona](#customizing-the-bots-persona)
- [License](#license)

---

## Setup

1. **Fork or clone this repo.**

    ```
    git clone https://github.com/Parven05/Pi-Bot.git
    cd Pi-Bot
    npm install
    ```

2. **Create a Discord application.**

    - Go to the [Discord Developer Portal](https://discord.com/developers/applications).
    - Click New Application and name it.
    - Go to Bot, click Add Bot, then Reset Token. Copy the token.
    - Go to General Information. Copy the Application ID and Public Key.

    To invite the bot:
    - Go to OAuth2 then URL Generator.
    - Select the bot scope.
    - Select Send Messages and Use Slash Commands.
    - Open the generated URL and follow the prompts.

3. **Set up Cloudflare Workers.**

    - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/).
    - Go to Workers & Pages, click Create Application, then Create Worker. Name it and deploy.
    - Go to My Profile then API Tokens. Create a token using the Edit Cloudflare Workers template. Copy the token.

4. **Get an AI API key.**

    - Get an API key from any OpenAI compatible provider (DeepSeek, OpenAI, Groq, Together AI, etc).

5. **Configure secrets.**

    Create `secrets/.env` with these values.

    ```
    DISCORD_APP_ID =         # discord application id
    DISCORD_BOT_TOKEN =      # bot token from discord developer portal
    DISCORD_PUBLIC_KEY =     # public key from discord developer portal
    GUILD_ID =               # your discord server id
    CLOUDFLARE_API_TOKEN =   # api token from cloudflare dashboard
    AI_API_KEY =             # api key from your ai provider
    ```

    - Enable Developer Mode in Discord settings under Advanced.
    - Right click your server name and click Copy ID to find your server ID.

6. **Log in and register commands.**

    ```
    npx wrangler login
    npm run register
    ```

7. **Deploy.**

    ```
    npm run deploy  # or ./run.sh all 
    ```

8. **Set the interactions endpoint.**

    - Go to the Discord Developer Portal, open your application, then General Information.
    - Set the Interactions Endpoint URL to `https://your-worker-name.your-subdomain.workers.dev`.
    - Replace the worker name with yours. Click Save Changes.

9. **Test.**

    - Go to your Discord server and type `/ask what is a variable in programming`.
    - Check Cloudflare Worker logs if it does not respond.

---

## Commands

| Command | Description |
|---------|-------------|
| `/ask <question>` | Ask any programming question. No restrictions. |
| `/snippet <refer> <language>` | Generate a build-system script snippet. Pick from: Bash, PowerShell, CMake, Make, Nix, Python. |

---

## Customizing the config

Edit values in `wrangler.toml` and redeploy. No source code changes needed.

```toml
name = "pi-bot"                              # Cloudflare Worker name
main = "src/index.ts"                        # Entry point file
compatibility_date = "2025-07-01"            # Cloudflare runtime version

[vars]
AI_BASE_URL = "https://api.deepseek.com"     # AI provider API endpoint
AI_MODEL = "deepseek-v4-flash"               # Model name for responses
AI_INPUT_COST_PER_M = "0.14"                 # Cost per million input tokens (USD)
AI_OUTPUT_COST_PER_M = "0.28"                # Cost per million output tokens (USD)
AI_REASONING_ENABLED = "on"                  # Enable reasoning mode (on/off/true/1/yes)
AI_REASONING_EFFORT = "high"                 # Reasoning effort: low, medium, high

COOLDOWN_MS = "10000"                        # Wait time between commands (milliseconds)
COOLDOWN_CLEANUP_INTERVAL_MS = "60000"       # How often expired cooldowns are cleaned up
MIN_INPUT_CHARS = "4"                        # Minimum characters for a question
MAX_INPUT_CHARS = "800"                      # Maximum characters allowed
API_TIMEOUT_MS = "15000"                     # AI API timeout (milliseconds); single attempt, no retry
```

---

## Customizing the bot's persona

The bot's personality and behavior are controlled by system prompts in `src/prompts.ts`. You do not need to touch any other file to change how the bot talks, what it refuses, or what tone it uses.

`src/prompts.ts` exports two prompts. `SYSTEM_PROMPT` (applied globally) is a general helper. `SNIPPET_PROMPT` adds build-system-specific rules on top.

```typescript
export const SYSTEM_PROMPT = [
  "PERSONA — HELPFUL ASSISTANT:",
  "  - Answer any programming question. No scope restrictions.",
  "...",
].join("\n");

export const SNIPPET_PROMPT = [
  "PERSONA — BUILD-SYSTEM SNIPPETS ONLY:",
  "  - Supported: bash, powershell, cmake, make, nix, python.",
  "  - Refuse any language outside that list.",
  "...",
].join("\n");
```

To change the persona:

- Edit the lines inside the `SYSTEM_PROMPT` array. Each string is one instruction.
- Remove or replace them to match the tone you want.
- Save the file and run `npm run deploy` to push the updated prompts.

---

## Project structure

```
pi-bot/
├── .gitignore
├── LICENSE                    # MIT license
├── README.md
├── package.json               # Dependencies and scripts
├── tsconfig.json
├── run.sh                     # Helper for deploy and register commands
├── wrangler.toml              # Worker config with all parameters
├── docs/
│   └── site.ts                # HTML page for root URL (privacy policy, terms)
├── scripts/
│   └── register-commands.ts   # Registers Discord slash commands
├── secrets/
│   └── .env                   # API keys and tokens, not committed
└── src/
    ├── index.ts               # Main worker. Handles everything.
    ├── commands.ts            # Defines /ask and /snippet commands
    └── prompts.ts             # System prompts sent to the AI
```

## License

MIT License. See the [LICENSE](LICENSE) file.
