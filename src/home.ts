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
/* tables: hairlines between rows, the first column the subject */
table.t {
	width: 100%;
	border-collapse: separate;
	border-spacing: 0 1px;
	background: var(--border);
	border: 1px solid var(--border);
	margin-bottom: 2rem;
}
.t th, .t td {
	background: var(--bg);
	padding: 0.8rem 1.2rem;
	text-align: left;
	vertical-align: top;
	font-weight: 400;
}
.t th {
	font-size: 0.6rem;
	color: var(--text-dim);
	letter-spacing: 0.1em;
	text-transform: lowercase;
	opacity: 0.7;
}
.t td {
	font-size: 0.68rem;
	color: var(--text-dim);
	line-height: 1.7;
}
.t td:first-child { color: var(--text); font-size: 0.75rem; }
.t td span { color: var(--accent); }
.t td code { font-family: inherit; color: var(--text); }
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
	.t th, .t td { padding: 0.7rem 0.8rem; }
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

/**
 * The page's inline style and script are constants, so their SHA-256
 * hashes are the content security policy: no other script or style can
 * run, and nothing loads from anywhere. Computed once per isolate.
 */
let cspPromise: Promise<string> | null = null;

async function sha256(s: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
	return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

function csp(): Promise<string> {
	if (!cspPromise) {
		cspPromise = Promise.all([sha256(CSS), sha256(JS)]).then(([css, js]) =>
			`default-src 'none'; style-src 'sha256-${css}'; script-src 'sha256-${js}'; ` +
			`img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`);
	}
	return cspPromise;
}

/** The root page, styled after seaof.glass. */
export async function homePage(host: string): Promise<Response> {
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
<table class="t">
	<thead><tr><th>part</th><th>what the embed carries</th></tr></thead>
	<tbody>
		<tr><td><span>/</span>text</td><td>the whole post, long ones included</td></tr>
		<tr><td><span>/</span>context</td><td>the post it replies to, and any quote</td></tr>
		<tr><td><span>/</span>media</td><td>photos, and video that plays inline</td></tr>
		<tr><td><span>/</span>counts</td><td>replies and likes</td></tr>
	</tbody>
</table>

<div class="section-label">-- where a link lands --</div>
<table class="t">
	<thead><tr><th>you paste</th><th>discord, telegram, slack</th><th>a person who clicks</th></tr></thead>
	<tbody>
		<tr><td><code>/user/status/123</code></td><td>the embed above</td><td>that post on x.com</td></tr>
		<tr><td><code>/i/status/123</code></td><td>the embed above</td><td>that post on x.com</td></tr>
		<tr><td><code>/user</code>, <code>/hashtag/...</code>, <code>/search?q=</code></td><td>sent on to x.com</td><td>the same page on x.com</td></tr>
		<tr><td>anything that is not an x.com path</td><td>not found</td><td>not found</td></tr>
	</tbody>
</table>

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
			'Content-Security-Policy': await csp(),
			'X-Content-Type-Options': 'nosniff',
			'Referrer-Policy': 'no-referrer',
		},
	});
}
