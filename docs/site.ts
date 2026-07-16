export const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pi-Bot</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:15px;line-height:1.7;color:#333;background:#fff;max-width:620px;margin:0 auto;padding:3rem 1.5rem}
h1{font-size:1.5rem;font-weight:600;margin-bottom:.2rem}
.sub{color:#777;margin-bottom:.5rem}
h2{font-size:1rem;font-weight:600;margin:2rem 0 .3rem}
p{color:#555;margin-bottom:.4rem}
a{color:#2563eb;text-decoration:none}
a:hover{text-decoration:underline}
code{background:#f5f5f5;padding:.12em .4em;border-radius:3px;font-size:.85em;color:#222}
.tag{display:inline-block;background:#f0f0f0;color:#444;font-size:.75rem;padding:.1rem .45rem;border-radius:3px;margin-right:.2rem}
hr{border:none;border-top:1px solid #eee;margin:2rem 0}
.foot{font-size:.8rem;color:#999}
</style>
</head>
<body>

<h1>Pi-Bot</h1>
<p>An Useful Discord Bot that Runs on Cloudflare Workers using DeepSeek V4 Flash via an OpenAI-compatible API.</p>

<h2>Commands</h2>
<p><strong>/ask</strong> <code>&lt;question&gt;</code> Any programming question.</p>
<p><strong>/snippet</strong> <code>&lt;refer&gt;</code> <code>&lt;language&gt;</code> Build-system snippet in Bash, PowerShell, CMake, Make, Nix, Python.</p>

<h2>Setup</h2>
<p><a href="https://github.com/Parven05/Pi-Bot">Clone the repo</a>, install deps, configure secrets, and deploy. See the <a href="https://github.com/Parven05/Pi-Bot/blob/main/README.md">README</a> for full setup instructions.</p>

<h2>Configuration</h2>
<p>Model, costs, cooldowns, and persona are configured via <code>wrangler.toml</code> and <code>src/prompts.ts</code>. No code changes needed for basic tuning.</p>

<h2>Privacy</h2>
<p>No data stored, logged, or shared. Input is sent to DeepSeek API solely to generate a response and is ephemeral. No cookies or trackers.</p>

<h2>Terms</h2>
<p>Provided as-is without warranty. No spam, harassment, or NSFW. Abuse may result in a block.</p>

<hr>
<div class="foot">
<p><a href="https://www.parven.me">Parven</a> &middot; MIT License &middot; <a href="https://github.com/Parven05/Pi-Bot">GitHub</a></p>
</div>

</body>
</html>`;
