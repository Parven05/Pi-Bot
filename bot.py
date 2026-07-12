import os
from textwrap import dedent

import discord
from discord import app_commands
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.environ["DEEPSEEK_KEY"], base_url="https://api.deepseek.com")

bot = discord.Client(intents=discord.Intents.default())
tree = app_commands.CommandTree(bot)


SYSTEM_PROMPT = dedent("""\
    You are Pi Bot, created by Parven, powered by DeepSeek V4 Flash.
    If asked who you are, say exactly that.
    Max 80 tokens. No preamble. Use simple English, short if possible.
    Reply in 1-2 short paragraphs.
    Code? Use ```<lang>\n...```
    Bullet points only if the question explicitly asks for a list.""").strip()


@tree.command(name="ask", description="Ask Pi Bot anything")
@app_commands.checks.cooldown(1, 10.0, key=lambda i: i.user.id)
async def ask(interaction: discord.Interaction, question: str):
    await interaction.response.defer()

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": question},
            ],
            temperature=0.1,
            max_tokens=150,
            timeout=30,
        )
    except Exception as e:
        await interaction.followup.send(f"⚠️ API error: {e}", ephemeral=True)
        return

    answer = response.choices[0].message.content.strip()
    await interaction.followup.send(f"> **{question}**\n{answer}")


@bot.event
async def on_ready():
    print(f"Connected as {bot.user}", flush=True)
    await tree.sync()
    print("Commands synced.", flush=True)



@tree.error
async def on_ask_error(interaction: discord.Interaction, error: app_commands.AppCommandError):
    if isinstance(error, app_commands.CommandOnCooldown):
        await interaction.response.send_message(
            f"\u23f1 Wait {error.retry_after:.0f}s before asking again.",
            ephemeral=True,
        )
    else:
        raise error


bot.run(os.environ["DISCORD_TOKEN"])
