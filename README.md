# Pi-Bot

A Discord bot that answers questions and generates code snippets using DeepSeek V4 Flash. Runs on Cloudflare Workers.

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

### 3. Set up Cloudflare

1. Create a Cloudflare account if you don't have one
2. Get your API token from https://dash.cloudflare.com/profile/api-tokens (needs `Workers` permission)
3. Get a DeepSeek API key from https://platform.deepseek.com

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
