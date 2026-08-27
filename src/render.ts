// HTML and JSON the crawlers consume. Every value that reaches a meta
// tag passes through esc(); nothing here fetches anything.

import { CACHE_MISSING, CACHE_OK, THEME_COLOR, XCOM } from './config';
import { buildText, pickPhotos, pickVideo } from './twitter';

/** HTML entity escape for attribute-position interpolation. */
function esc(s: string): string {
	return s.replace(/[&<>"']/g, c => (
		{ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>
	)[c]);
}

function html(body: string, status = 200, maxAge = CACHE_OK): Response {
	return new Response(body, {
		status,
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': `public, max-age=${maxAge}`,
			'X-Content-Type-Options': 'nosniff',
			'Referrer-Policy': 'no-referrer',
		},
	});
}

/** The crawler-facing page: meta tags only, no visible body. */
export function tweetPage(
	t: any,
	handle: string,
	id: string,
	host: string,
	full: { text?: string; quoteText?: string } | null,
): Response {
	const canonical = `${XCOM}/${handle}/status/${id}`;
	const name = t.user?.name || handle;
	const text = buildText(t, full);
	const video = pickVideo(t);
	const photos = pickPhotos(t);

	const stats = `💬 ${(t.conversation_count ?? 0).toLocaleString('en-US')}   ❤️ ${(t.favorite_count ?? 0).toLocaleString('en-US')}`;

	// Discord sizes an embed to its media, and a narrow card truncates
	// the title. The author line truncates too but fits more characters,
	// so identity leads there: a cut costs stats, not the handle.
	const oembedUrl = `https://${host}/oembed?` + new URLSearchParams({
		a: `${name} (@${handle})   ${stats}`,
		u: canonical,
	});

	const tags = [
		'<meta charset="utf-8">',
		`<meta name="theme-color" content="${THEME_COLOR}">`,
		`<meta property="og:site_name" content="${esc(host)}">`,
		`<meta property="og:url" content="${esc(canonical)}">`,
		`<meta property="og:title" content="${esc(`${name} (@${handle})`)}">`,
		`<meta property="og:description" content="${esc(text)}">`,
		// href is deliberately not escaped: URLSearchParams already
		// percent-encodes everything unsafe, and Discord fetches the raw
		// bytes without entity-decoding, so "&amp;" would mangle the
		// query into an "amp;u" parameter.
		`<link rel="alternate" type="application/json+oembed" href="${oembedUrl}" title="${esc(name)}">`,
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
		for (const url of photos) tags.push(`<meta property="og:image" content="${esc(url)}">`);
	} else {
		tags.push('<meta property="twitter:card" content="summary">');
		if (t.user?.profile_image_url_https) {
			tags.push(`<meta property="og:image" content="${esc(t.user.profile_image_url_https)}">`);
		}
	}

	tags.push(`<meta http-equiv="refresh" content="0;url=${esc(canonical)}">`);
	return html(`<!DOCTYPE html><html><head>${tags.join('')}</head><body></body></html>`);
}

/** Shown when the tweet is deleted, protected, or age-restricted. */
export function unavailablePage(canonical: string): Response {
	const tags = [
		'<meta charset="utf-8">',
		'<meta property="og:title" content="Tweet unavailable">',
		'<meta property="og:description" content="Deleted, protected, or age-restricted.">',
		`<meta property="og:url" content="${esc(canonical)}">`,
	];
	return html(`<!DOCTYPE html><html><head>${tags.join('')}</head><body></body></html>`, 200, CACHE_MISSING);
}

/**
 * The oEmbed document Discord fetches to fill the author line.
 *
 * Type must be "rich": Discord reads a "link" type as having no
 * embeddable content and drops the OG title and description with it,
 * leaving a media-only embed.
 *
 * Both parameters are attacker-controllable, so `a` is length-capped
 * and `u` is pinned to an x.com url. Output is JSON.stringify'd and
 * served as application/json with nosniff, making the reflection inert.
 */
export function oembedResponse(host: string, params: URLSearchParams): Response {
	const author = (params.get('a') || '').slice(0, 256);
	const url = params.get('u') || XCOM;
	const safeUrl = /^https:\/\/x\.com\//.test(url) ? url : XCOM;

	return new Response(JSON.stringify({
		type: 'rich',
		version: '1.0',
		title: 'Embed',
		author_name: author,
		author_url: safeUrl,
		provider_name: host,
		provider_url: `https://${host}`,
	}), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': `public, max-age=${CACHE_OK}`,
			'X-Content-Type-Options': 'nosniff',
		},
	});
}

/** Plain-text landing page at the root. */
export function usagePage(host: string): Response {
	const body = [
		`${host}`,
		'',
		`Replace x.com with ${host} in any post link and it embeds properly in Discord.`,
		'',
		`  https://x.com/user/status/123   ->   https://${host}/user/status/123`,
		'',
		'Clicking the link still takes you to x.com.',
		'',
	].join('\n');
	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': `public, max-age=${CACHE_OK}`,
		},
	});
}
