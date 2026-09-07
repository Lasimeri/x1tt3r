// Twitter/X embed fixer for Discord.
//
// Swap x.com for this worker's domain in a post link. Chat crawlers get
// OpenGraph HTML built from X's public syndication endpoint; Discord is
// additionally pointed at a Mastodon-style status document so text and
// video share one embed; humans get a 302 to x.com. Only validated
// /:user/status/:id shapes are served, so the host cannot be used as an
// open redirect.
//
// The worker takes its identity from the request hostname, so it runs
// unchanged on any domain you point at it. See SETUP.md.

import { activityResponse, activityUnavailable } from './activity';
import { BOT_UA, ID_RE, RATE_LIMIT, RATE_WINDOW_MS, USER_RE, XCOM } from './config';
import { homePage } from './home';
import { oembedResponse, tweetPage, unavailablePage } from './render';
import { fetchFullText, fetchTweet, isNoteTweet, resolveHandle } from './twitter';

// Per-isolate rate limit. Resets when the isolate recycles, which is
// enough to blunt single-IP hammering without external state.
const rateMap = new Map<string, number[]>();

function rateOk(ip: string): boolean {
	const now = Date.now();
	const hits = (rateMap.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
	if (hits.length >= RATE_LIMIT) return false;
	hits.push(now);
	rateMap.set(ip, hits);
	return true;
}

/**
 * Pull a handle and post id out of the path. Accepted shapes:
 *   /:user/status/:id   (trailing segments such as /photo/1 are ignored)
 *   /i/status/:id
 *   /status/:id
 * Anything else yields no id and is refused by the caller.
 */
function parsePath(pathname: string): { handle: string; id: string } | null {
	const seg = pathname.split('/').filter(Boolean);

	if (seg.length >= 3 && seg[1] === 'status' && USER_RE.test(seg[0]) && ID_RE.test(seg[2])) {
		return { handle: seg[0], id: seg[2] };
	}
	if (seg.length >= 2 && seg[0] === 'status' && ID_RE.test(seg[1])) {
		return { handle: 'i', id: seg[1] };
	}
	return null;
}

function redirect(to: string): Response {
	return new Response(null, {
		status: 302,
		headers: { 'Location': to, 'Cache-Control': 'no-store' },
	});
}

export default {
	async fetch(request: Request): Promise<Response> {
		if (request.method !== 'GET' && request.method !== 'HEAD') {
			return new Response('method not allowed', { status: 405 });
		}

		const url = new URL(request.url);
		const host = url.hostname;
		const ua = request.headers.get('User-Agent') || '';

		const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
		if (!rateOk(ip)) return new Response('rate limited', { status: 429 });

		if (url.pathname === '/oembed') {
			return oembedResponse(host, url.searchParams);
		}
		if (url.pathname === '/') {
			return homePage(host);
		}

		const seg = url.pathname.split('/').filter(Boolean);

		// Discord's follow-up fetch after seeing the activity+json link.
		// Not gated on user agent: Discord identifies itself here, but
		// nothing in the document is worth hiding from anyone else.
		if (seg.length === 4 && seg[0] === 'api' && seg[1] === 'v1' && seg[2] === 'statuses' && ID_RE.test(seg[3])) {
			const tweet = await fetchTweet(seg[3]);
			if (!tweet) return activityUnavailable();
			const handle = resolveHandle(tweet, 'i');
			const full = isNoteTweet(tweet) ? await fetchFullText(seg[3]) : null;
			return activityResponse(tweet, handle, seg[3], full);
		}

		// The activity link's own href, should a human ever follow it.
		if (seg.length === 4 && seg[0] === 'users' && seg[2] === 'statuses' && USER_RE.test(seg[1]) && ID_RE.test(seg[3])) {
			return redirect(`${XCOM}/${seg[1]}/status/${seg[3]}`);
		}

		const parsed = parsePath(url.pathname);
		if (!parsed) return new Response('not found', { status: 404 });

		const canonical = `${XCOM}/${parsed.handle}/status/${parsed.id}`;

		// Humans never see the meta-tag page.
		if (!BOT_UA.test(ua)) return redirect(canonical);

		const tweet = await fetchTweet(parsed.id);
		if (!tweet) return unavailablePage(canonical);

		const handle = resolveHandle(tweet, parsed.handle);
		const full = isNoteTweet(tweet) ? await fetchFullText(parsed.id) : null;
		return tweetPage(tweet, handle, parsed.id, host, full, /discordbot/i.test(ua));
	},
};
