export const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pi-Bot</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;line-height:1.8;color:#c9d1d9;background:#0d1117}
.wrap{max-width:640px;margin:0 auto;padding:2.5rem 1.5rem 3rem}
h1{font-size:1.6rem;font-weight:700;color:#f0f6fc}
.sub{color:#8b949e;font-size:.85rem;margin-bottom:1.5rem}
h2{font-size:1rem;font-weight:600;color:#f0f6fc;margin:1.5rem 0 .4rem}
p{color:#8b949e;margin-bottom:.5rem}
a{color:#58a6ff;text-decoration:none}
a:hover{text-decoration:underline}
code{background:#161b22;padding:.1em .4em;border-radius:4px;font-size:.85em;color:#e6edf3}
.tag{display:inline-block;background:#21262d;color:#e6edf3;font-size:.7rem;font-weight:500;padding:.15rem .5rem;border-radius:4px;border:1px solid #30363d;margin-right:.25rem}
.card{background:#161b22;border:1px solid #30363d;border-radius:6px;padding:.9rem;margin:.6rem 0}
.card p:last-child{margin-bottom:0}
hr{border:none;border-top:1px solid #21262d;margin:1.5rem 0}
.foot{font-size:.8rem;color:#484f58}
</style>
</head>
<body>
<div class="wrap">

<h1>Pi-Bot</h1>
<p class="sub"><span class="tag">/ask</span><span class="tag">/snippet</span> on ParvenPi Discord</p>
<p>A Discord bot for the ParvenPi server. Answers questions and generates quick code examples through DeepSeek V4 Flash, hosted on Cloudflare Workers.</p>
<h2>Commands</h2>
<div class="card">
<p><strong style="color:#f0f6fc;">/ask</strong> <code>&lt;question&gt;</code> Ask me anything.</p>
<p style="margin-bottom:0;"><strong style="color:#f0f6fc;">/snippet</strong> <code>&lt;refer&gt;</code> <code>&lt;language&gt;</code> Quick example or boilerplate for a specific concept. Pick a language from the dropdown. Full code requests are rejected because referring AI-generated code isn't good practice.</p>
</div>
<h2>Privacy Policy</h2>
<div class="card">
<p>Pi-Bot does not store, log, or share any user data. Your question is sent to the DeepSeek API solely to generate a response. No data is retained server side.</p>
<p style="margin-bottom:0;">No cookies, trackers, or analytics are used. Discord metadata such as your user ID and command name exists transiently in memory for rate limiting and is discarded immediately after. By using this bot, you consent to ephemeral processing of your input for the sole purpose of responding.</p>
</div>
<h2>Terms and Conditions</h2>
<div class="card">
<p>Pi-Bot is provided as is, without warranty. Responses may contain errors. Always verify critical information against official sources.</p>
<p><strong style="color:#f0f6fc;">Acceptable Use:</strong> No spam, harassment, NSFW content, or unlawful activity. Abuse may result in a block.</p>
<p><strong style="color:#f0f6fc;">Liability:</strong> The creator is not responsible for any issues that may arise from using this bot.</p>
<p style="margin-bottom:0;"><strong style="color:#f0f6fc;">Changes:</strong> These terms may be updated. Continued use after changes constitutes acceptance.</p>
</div>
<hr>
<div class="foot">
<p><a href="https://github.com/Parven05/Pi-Bot">Open source</a> &middot; fork or use freely. Created by <a href="https://www.parven.me">Parven</a>. Powered by DeepSeek and Cloudflare Workers.</p>
</div>

</div>
</body>
</html>`;
