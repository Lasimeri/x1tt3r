// The root page. Design follows seaof.glass: monospace, amber on
// near-black, a 700px column, hairline-separated cards, lowercase
// section labels.

import { CACHE_OK } from './config';
import { esc } from './render';

const REPO = 'https://github.com/Lasimeri/x1tt3r';
const REPO_NAME = 'Lasimeri/x1tt3r';

const CSS = `
:root {
	--bg: #0a0a0f;
	--surface: #12121a;
	--border: #1e1e2e;
	--text: #c4945a;
	--text-dim: #8a6a3e;
	--accent: #c4945a;
	--accent-dim: #7a5c38;
	--mono: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
	font-family: var(--mono);
	background: var(--bg);
	color: var(--text);
	min-height: 100vh;
	display: flex;
	justify-content: center;
	padding: 2rem;
}
.container { max-width: 700px; width: 100%; }
header { margin-bottom: 2.5rem; }
h1 {
	font-size: 1.1rem;
	font-weight: 400;
	color: var(--accent);
	margin-bottom: 0.5rem;
	letter-spacing: 0.05em;
}
.tagline {
	font-size: 0.7rem;
	color: var(--text-dim);
	opacity: 0.6;
	line-height: 1.6;
}
.tagline em {
	display: block;
	margin-top: 0.2rem;
	font-style: normal;
	opacity: 0.8;
}
.sep { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
.section-label {
	font-size: 0.65rem;
	color: var(--text-dim);
	margin-bottom: 0.75rem;
	letter-spacing: 0.1em;
	text-transform: lowercase;
}
.rows {
	display: flex;
	flex-direction: column;
	gap: 1px;
	background: var(--border);
	border: 1px solid var(--border);
	margin-bottom: 2rem;
}
.row {
	background: var(--bg);
	padding: 1rem 1.2rem;
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	text-decoration: none;
	transition: background 0.15s;
}
a.row:hover { background: var(--surface); }
.row-name { font-size: 0.8rem; color: var(--text); letter-spacing: 0.02em; }
.row-name span { color: var(--accent); }
.row-desc {
	font-size: 0.65rem;
	color: var(--text-dim);
	text-align: right;
	flex-shrink: 0;
	margin-left: 1rem;
}
/* the transform, shown literally */
.transform {
	background: var(--bg);
	border: 1px solid var(--border);
	padding: 1.2rem;
	margin-bottom: 2rem;
	font-size: 0.75rem;
	line-height: 2;
	overflow-x: auto;
	white-space: nowrap;
}
.transform .before { color: var(--text-dim); opacity: 0.7; }
.transform .after { color: var(--text); }
.transform .ins {
	color: var(--bg);
	background: var(--accent);
	padding: 0 0.15rem;
}
.transform .mark { color: var(--accent-dim); }
/* converter */
.convert { margin-bottom: 2rem; }
.convert input {
	width: 100%;
	background: var(--surface);
	border: 1px solid var(--border);
	color: var(--text);
	font-family: var(--mono);
	font-size: 0.72rem;
	padding: 0.8rem 1rem;
	outline: none;
}
.convert input::placeholder { color: var(--text-dim); opacity: 0.5; }
.convert input:focus { border-color: var(--accent-dim); }
.convert-out {
	display: flex;
	gap: 1px;
	background: var(--border);
	border: 1px solid var(--border);
	border-top: none;
}
.convert-out output {
	background: var(--bg);
	flex: 1;
	padding: 0.8rem 1rem;
	font-size: 0.72rem;
	color: var(--text-dim);
	overflow-x: auto;
	white-space: nowrap;
}
.convert-out button {
	background: var(--bg);
	border: none;
	color: var(--accent);
	font-family: var(--mono);
	font-size: 0.65rem;
	letter-spacing: 0.1em;
	padding: 0 1.2rem;
	cursor: pointer;
	transition: background 0.15s;
}
.convert-out button:hover { background: var(--surface); }
.convert-out button:disabled { color: var(--text-dim); opacity: 0.4; cursor: default; }
/* repo card */
.repo {
	display: block;
	background: var(--bg);
	border: 1px solid var(--border);
	padding: 1.2rem;
	margin-bottom: 2rem;
	text-decoration: none;
	transition: background 0.15s;
}
.repo:hover { background: var(--surface); }
.repo-head { font-size: 0.8rem; color: var(--text); margin-bottom: 0.5rem; }
.repo-head span { color: var(--text-dim); }
.repo-desc { font-size: 0.68rem; color: var(--text-dim); line-height: 1.7; margin-bottom: 0.8rem; }
.repo-meta {
	display: flex;
	gap: 1.5rem;
	flex-wrap: wrap;
	font-size: 0.6rem;
	color: var(--text-dim);
	opacity: 0.7;
}
.repo-meta span::before {
	content: '';
	display: inline-block;
	width: 5px;
	height: 5px;
	border-radius: 50%;
	background: var(--accent-dim);
	margin-right: 0.4rem;
	vertical-align: middle;
}
.about { font-size: 0.7rem; color: var(--text-dim); line-height: 1.8; margin-bottom: 2rem; }
.about p { margin-bottom: 0.75rem; }
.about a { color: var(--accent); text-decoration: none; }
.about a:hover { text-decoration: underline; }
.status-line {
	display: flex;
	gap: 1.5rem;
	flex-wrap: wrap;
	font-size: 0.6rem;
	color: var(--text-dim);
	opacity: 0.4;
	margin-bottom: 2rem;
}
.status-line span::before {
	content: '';
	display: inline-block;
	width: 5px;
	height: 5px;
	border-radius: 50%;
	background: var(--accent-dim);
	margin-right: 0.4rem;
	vertical-align: middle;
}
.footer { font-size: 0.6rem; color: var(--text-dim); opacity: 0.35; line-height: 1.8; }
.footer a { color: var(--accent); text-decoration: none; }
.footer a:hover { text-decoration: underline; }
@media (max-width: 600px) {
	body { padding: 1.25rem; }
	.row { flex-direction: column; gap: 0.25rem; }
	.row-desc { text-align: left; margin-left: 0; }
	.status-line, .repo-meta { flex-direction: column; gap: 0.5rem; }
	.transform { font-size: 0.65rem; }
}
`;

// Rewrites a pasted x.com link to this host. Kept small and dependency
// free; the page works without it, the box is a convenience.
const JS = `
const box = document.getElementById('in');
const out = document.getElementById('out');
const copy = document.getElementById('copy');
const HOST = location.host;
function convert() {
	const v = box.value.trim();
	const m = v.match(/^(?:https?:\\/\\/)?(?:www\\.)?(?:twitter|x|fixupx|vxtwitter|fxtwitter)\\.com(\\/.+)$/i);
	if (!m) { out.textContent = v ? 'not an x.com post link' : ''; copy.disabled = true; return; }
	out.textContent = 'https://' + HOST + m[1];
	copy.disabled = false;
}
box.addEventListener('input', convert);
copy.addEventListener('click', async () => {
	try {
		await navigator.clipboard.writeText(out.textContent);
		copy.textContent = 'copied';
		setTimeout(() => { copy.textContent = 'copy'; }, 1200);
	} catch {
		copy.textContent = 'select it';
		setTimeout(() => { copy.textContent = 'copy'; }, 1200);
	}
});
`;

/**
 * How this host differs from "x.com", as a prefix/insertion/suffix
 * split, so the page can highlight exactly what a visitor types.
 * "x1tt3r.com" yields x + 1tt3r + .com. Returns null for hostnames
 * that share no edges with x.com, such as a workers.dev subdomain.
 */
function affixDiff(host: string): { prefix: string; ins: string; suffix: string } | null {
	const from = 'x.com';
	if (host.length <= from.length) return null;

	let p = 0;
	while (p < from.length && from[p] === host[p]) p++;

	let s = 0;
	while (s < from.length - p && from[from.length - 1 - s] === host[host.length - 1 - s]) s++;

	if (p === 0 && s === 0) return null;
	return {
		prefix: host.slice(0, p),
		ins: host.slice(p, host.length - s),
		suffix: host.slice(host.length - s),
	};
}

/** The root page, styled after seaof.glass. */
export function homePage(host: string): Response {
	const diff = affixDiff(host);
	const name = host.split('.')[0];

	// The after-line highlights only the characters a visitor adds,
	// falling back to highlighting the whole host when the domain is
	// not an x.com lookalike.
	const after = diff
		? `https://${esc(diff.prefix)}<span class="ins">${esc(diff.ins)}</span>${esc(diff.suffix)}/user/status/123`
		: `https://<span class="ins">${esc(host)}</span>/user/status/123`;
	const tagline = diff
		? `put ${esc(diff.ins)} after the ${esc(diff.prefix || 'x')}`
		: `swap x.com for ${esc(host)}`;

	const body = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(host)}</title>
<meta name="theme-color" content="#c4945a">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(host)}">
<meta property="og:url" content="https://${esc(host)}/">
<meta property="og:title" content="${esc(host)}">
<meta property="og:description" content="x.com links do not embed in Discord. ${esc(tagline)} and they do: full post text, photos, playable video.">
<meta property="twitter:card" content="summary">
<style>${CSS}</style>
</head>
<body>
<div class="container">

<header>
	<h1>${esc(name)}</h1>
	<p class="tagline">
		x.com links do not embed in discord. this fixes them.
		<em>${tagline}</em>
	</p>
</header>

<div class="section-label">-- usage --</div>
<div class="transform">
	<div><span class="mark">x</span> <span class="before">https://x.com/user/status/123</span></div>
	<div><span class="mark">y</span> <span class="after">${after}</span></div>
</div>

<div class="section-label">-- convert --</div>
<div class="convert">
	<input id="in" type="text" spellcheck="false" autocomplete="off" placeholder="paste an x.com post link">
	<div class="convert-out">
		<output id="out"></output>
		<button id="copy" disabled>copy</button>
	</div>
</div>

<div class="section-label">-- what embeds --</div>
<div class="rows">
	<div class="row">
		<div class="row-name"><span>/</span>text</div>
		<div class="row-desc">the whole post, long ones included</div>
	</div>
	<div class="row">
		<div class="row-name"><span>/</span>context</div>
		<div class="row-desc">the post it replies to, and any quote</div>
	</div>
	<div class="row">
		<div class="row-name"><span>/</span>media</div>
		<div class="row-desc">photos, and video that plays inline</div>
	</div>
	<div class="row">
		<div class="row-name"><span>/</span>counts</div>
		<div class="row-desc">replies and likes</div>
	</div>
	<div class="row">
		<div class="row-name"><span>/</span>humans</div>
		<div class="row-desc">clicking still lands on x.com</div>
	</div>
</div>

<div class="section-label">-- source --</div>
<a class="repo" href="${REPO}">
	<div class="repo-head"><span>github.com/</span>${REPO_NAME}</div>
	<div class="repo-desc">
		twitter/x embed fixer for discord, on a cloudflare worker.
		reads x's public syndication endpoint, no api key, no login,
		no tracking. deploy your own in five minutes.
	</div>
	<div class="repo-meta">
		<span>typescript</span>
		<span>mit</span>
		<span>setup.md</span>
	</div>
</a>

<hr class="sep">

<div class="section-label">-- about --</div>
<div class="about">
	<p>
		crawlers get opengraph tags built from x's own public embed endpoint.
		everyone else gets redirected to x.com untouched. nothing is stored
		and nothing is logged.
	</p>
	<p>
		run your own on any domain: <a href="${REPO}/blob/main/SETUP.md">setup.md</a>
	</p>
</div>

<div class="status-line">
	<span>no tracking</span>
	<span>cloudflare worker</span>
	<span>${esc(host)}</span>
</div>

<hr class="sep">

<div class="footer">
	mit licensed &middot; <a href="${REPO}">source</a> &middot; <a href="${REPO}/blob/main/SETUP.md">setup</a><br>
	not affiliated with, endorsed by, or connected to x corp.
</div>

</div>
<script>${JS}</script>
</body>
</html>`;

	return new Response(body, {
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': `public, max-age=${CACHE_OK}`,
			'X-Content-Type-Options': 'nosniff',
			'Referrer-Policy': 'no-referrer',
		},
	});
}
