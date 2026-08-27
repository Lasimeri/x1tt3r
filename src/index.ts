// x1tt3r — Twitter/X embed fixer.
// Swap x.com for x1tt3r.com in a tweet link. Chat crawlers (Discord et
// al.) get OpenGraph HTML built from the public syndication API; humans
// get a 302 to x.com. Only validated /:user/status/:id shapes are
// served, everything else 404s, so the host cannot function as an open
// redirect.

const DOMAIN = 'x1tt3r.com';
const XCOM = 'https://x.com';

const BOT_UA = /discordbot|telegrambot|slackbot|twitterbot|whatsapp|facebookexternalhit|linkedinbot|mastodon|pleroma|misskey|summalybot|bluesky|skypeuripreview|redditbot|embed/i;
const USER_RE = /^[A-Za-z0-9_]{1,15}$/;
const ID_RE = /^\d{1,20}$/;

// Per-isolate rate limit; resets on isolate recycle, which is
// sufficient to blunt single-IP hammering without external state.
const rateMap = new Map<string, number[]>();
const RATE_LIMIT = 60;
const RATE_WINDOW = 60_000;

function rateOk(ip: string): boolean {
	const now = Date.now();
	const hits = (rateMap.get(ip) || []).filter(t => now - t < RATE_WINDOW);
	if (hits.length >= RATE_LIMIT) return false;
	hits.push(now);
	rateMap.set(ip, hits);
	return true;
}

function esc(s: string): string {
	return s.replace(/[&<>"']/g, c => (
		{ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>
	)[c]);
}

// Known-good token derivation for cdn.syndication.twimg.com; the value
// is not currently validated server-side but must be present.
function synToken(id: string): string {
	return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
}

async function fetchTweet(id: string): Promise<any | null> {
	const res = await fetch(
		`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${synToken(id)}`,
		{
			headers: { 'User-Agent': 'Mozilla/5.0 (compatible; x1tt3r-embed/1.0)' },
			cf: { cacheTtl: 3600, cacheEverything: true },
		},
	);
	if (!res.ok) return null;
	const data: any = await res.json().catch(() => null);
	if (!data || data.__typename === 'TweetTombstone' || (!data.text && !data.user)) return null;
	return data;
}

// Full display text: t.co links expanded from entities.urls, media t.co
// tails stripped via entities.media.
function expandText(t: any): string {
	let text: string = t.text || '';
	if (Array.isArray(t.entities?.urls)) {
		for (const u of t.entities.urls) {
			if (u.url && u.expanded_url) text = text.split(u.url).join(u.expanded_url);
		}
	}
	if (Array.isArray(t.entities?.media)) {
		for (const m of t.entities.media) {
			if (m.url) text = text.split(m.url).join('');
		}
	}
	return text.trim();
}

// Note-tweet fallback. tweet-result truncates posts over ~280 chars to
// a `note_tweet` id stub with no full text (oEmbed truncates too), so
// long posts need a second source. FxEmbed's public API carries the
// complete text; on any failure the truncated syndication text stands.
async function fetchFullText(id: string): Promise<{ text?: string; quoteText?: string } | null> {
	try {
		const res = await fetch(`https://api.fxtwitter.com/status/${id}`, {
			headers: { 'User-Agent': 'x1tt3r-embed/1.0 (note-tweet fallback)' },
			cf: { cacheTtl: 3600, cacheEverything: true },
		});
		if (!res.ok) return null;
		const d: any = await res.json().catch(() => null);
		const tw = d?.tweet;
		if (!tw?.text) return null;
		return { text: tw.text, quoteText: tw.quote?.text };
	} catch {
		return null;
	}
}

function tweetPage(t: any, user: string, id: string, host: string, full: { text?: string; quoteText?: string } | null): Response {
	const canonical = `${XCOM}/${user}/status/${id}`;
	const name = t.user?.name || user;
	const screen = t.user?.screen_name || user;

	// Entire tweet text, then reply-to context (the tweet this one
	// answers, carried in `parent`), then quoted-tweet text. FxEmbed
	// text is pre-expanded; it wins only when the tweet is note-flagged.
	let text = (t.note_tweet && full?.text) ? full.text : expandText(t);
	if (t.parent?.text) {
		const pu = t.parent.user?.screen_name || t.in_reply_to_screen_name || '?';
		text += `\n\n↪️ Replying to @${pu}: ${expandText(t.parent)}`;
	} else if (t.in_reply_to_screen_name) {
		text += `\n\n↪️ Replying to @${t.in_reply_to_screen_name}`;
	}
	if (t.quoted_tweet?.text) {
		const qu = t.quoted_tweet.user?.screen_name || '?';
		const qt = (t.quoted_tweet.note_tweet && full?.quoteText) ? full.quoteText : expandText(t.quoted_tweet);
		text += `\n\n❝ Quoting @${qu}: ${qt}`;
	}
	const photos: any[] = Array.isArray(t.photos) ? t.photos : [];

	// Highest-bitrate mp4, covering both payload shapes the endpoint emits.
	let video: { url: string; width: number; height: number } | null = null;
	const md = Array.isArray(t.mediaDetails)
		? t.mediaDetails.find((m: any) => m.type === 'video' || m.type === 'animated_gif')
		: null;
	if (md?.video_info?.variants) {
		const best = md.video_info.variants
			.filter((v: any) => v.content_type === 'video/mp4')
			.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
		if (best) video = {
			url: best.url,
			width: md.original_info?.width || 1280,
			height: md.original_info?.height || 720,
		};
	} else if (Array.isArray(t.video?.variants)) {
		const best = t.video.variants.filter((v: any) => v.type === 'video/mp4').pop();
		if (best) video = { url: best.src, width: 1280, height: 720 };
	}

	const stats = `💬 ${(t.conversation_count ?? 0).toLocaleString('en-US')}   ❤️ ${(t.favorite_count ?? 0).toLocaleString('en-US')}`;
	const oembed = `https://${host}/oembed?` + new URLSearchParams({ a: stats, u: canonical });

	const tags: string[] = [
		'<meta charset="utf-8">',
		'<meta name="theme-color" content="#1d9bf0">',
		`<meta property="og:site_name" content="${DOMAIN}">`,
		`<meta property="og:url" content="${esc(canonical)}">`,
		`<meta property="og:title" content="${esc(`${name} (@${screen})`)}">`,
		`<meta property="og:description" content="${esc(text)}">`,
		// href deliberately unescaped: URLSearchParams percent-encodes
		// everything unsafe, and Discord's scraper fetches the raw bytes
		// without entity-decoding, so an &amp; would mangle the params.
		`<link rel="alternate" type="application/json+oembed" href="${oembed}" title="${esc(name)}">`,
	];
	if (video) {
		tags.push(
			'<meta property="twitter:card" content="player">',
			`<meta property="og:video" content="${esc(video.url)}">`,
			`<meta property="og:video:secure_url" content="${esc(video.url)}">`,
			'<meta property="og:video:type" content="video/mp4">',
			`<meta property="og:video:width" content="${video.width}">`,
			`<meta property="og:video:height" content="${video.height}">`,
		);
	} else if (photos.length) {
		tags.push('<meta property="twitter:card" content="summary_large_image">');
		for (const p of photos.slice(0, 4)) tags.push(`<meta property="og:image" content="${esc(p.url)}">`);
	} else {
		tags.push('<meta property="twitter:card" content="summary">');
		if (t.user?.profile_image_url_https) {
			tags.push(`<meta property="og:image" content="${esc(t.user.profile_image_url_https)}">`);
		}
	}

	const html = `<!DOCTYPE html><html><head>${tags.join('')}<meta http-equiv="refresh" content="0;url=${esc(canonical)}"></head><body></body></html>`;
	return new Response(html, {
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
			'X-Content-Type-Options': 'nosniff',
			'Referrer-Policy': 'no-referrer',
		},
	});
}

export default {
	async fetch(request: Request): Promise<Response> {
		if (request.method !== 'GET' && request.method !== 'HEAD') {
			return new Response('method not allowed', { status: 405 });
		}
		const url = new URL(request.url);
		const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
		if (!rateOk(ip)) return new Response('rate limited', { status: 429 });

		const seg = url.pathname.split('/').filter(Boolean);

		// GET /oembed — reflected JSON Discord fetches for the author line.
		// Query params are attacker-controllable; output is JSON.stringify'd
		// with a JSON content-type and the url is pinned to x.com, so the
		// reflection is inert.
		if (seg[0] === 'oembed') {
			const a = (url.searchParams.get('a') || '').slice(0, 256);
			const u = url.searchParams.get('u') || XCOM;
			const safeU = /^https:\/\/x\.com\//.test(u) ? u : XCOM;
			// type "rich" (not "link"): Discord treats a link-type oembed
			// as having no embeddable content and suppresses the OG title
			// and description, leaving media-only embeds.
			return new Response(JSON.stringify({
				type: 'rich', version: '1.0', title: 'Embed',
				author_name: a, author_url: safeU,
				provider_name: DOMAIN, provider_url: `https://${DOMAIN}`,
			}), {
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'public, max-age=3600',
					'X-Content-Type-Options': 'nosniff',
				},
			});
		}

		// Accepted shapes: /:user/status/:id[/...], /i/status/:id, /status/:id
		let user = 'i', id = '';
		if (seg.length >= 3 && seg[1] === 'status' && USER_RE.test(seg[0]) && ID_RE.test(seg[2])) {
			user = seg[0];
			id = seg[2];
		} else if (seg.length >= 2 && seg[0] === 'status' && ID_RE.test(seg[1])) {
			id = seg[1];
		}

		if (!id) {
			if (seg.length === 0) {
				return new Response(
					`usage: replace x.com with ${DOMAIN} in a tweet link\n`,
					{ headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
				);
			}
			return new Response('not found', { status: 404 });
		}

		const canonical = `${XCOM}/${user}/status/${id}`;
		const ua = request.headers.get('User-Agent') || '';
		if (!BOT_UA.test(ua)) {
			return new Response(null, {
				status: 302,
				headers: { 'Location': canonical, 'Cache-Control': 'no-store' },
			});
		}

		const t = await fetchTweet(id);
		if (!t) {
			const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta property="og:title" content="Tweet unavailable"><meta property="og:description" content="Deleted, protected, or age-restricted."><meta property="og:url" content="${esc(canonical)}"></head><body></body></html>`;
			return new Response(html, {
				status: 200,
				headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
			});
		}
		// Prefer the API's screen_name when the path used /i/ or a stale handle.
		const screen = t.user?.screen_name && USER_RE.test(t.user.screen_name) ? t.user.screen_name : user;
		const full = (t.note_tweet || t.quoted_tweet?.note_tweet) ? await fetchFullText(id) : null;
		return tweetPage(t, screen, id, url.hostname, full);
	},
};
