// Everything that talks to X, and the text assembly that depends on its
// payload shapes. Nothing here knows about HTML or routing.

import { CACHE_OK, QUOTE_TRUNCATION_HINT, USER_RE } from './config';

export interface Video {
	url: string;
	width: number;
	height: number;
}

export interface Media {
	type: 'photo' | 'video';
	/** The image itself, or the highest-bitrate mp4. */
	url: string;
	/** Thumbnail; for photos, the image again. */
	preview: string;
	width: number;
	height: number;
}

export interface TextParts {
	text: string;
	reply?: { user: string; text?: string };
	quote?: { user: string; text: string };
}

/**
 * Token for cdn.syndication.twimg.com. The value is not currently
 * validated server-side but must be present; this is the derivation
 * X's own embed widget uses.
 */
function synToken(id: string): string {
	return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
}

/**
 * Fetch a tweet from the public syndication endpoint. Returns null for
 * anything unusable: deleted, protected, age-restricted, or an empty
 * body (the endpoint fails intermittently by design).
 */
export async function fetchTweet(id: string): Promise<any | null> {
	const res = await fetch(
		`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${synToken(id)}`,
		{
			headers: { 'User-Agent': 'Mozilla/5.0 (compatible; embed-fixer/1.0)' },
			cf: { cacheTtl: CACHE_OK, cacheEverything: true },
		},
	);
	if (!res.ok) return null;
	const data: any = await res.json().catch(() => null);
	if (!data || data.__typename === 'TweetTombstone' || (!data.text && !data.user)) return null;
	return data;
}

/**
 * Posts over ~280 chars ("note tweets") come back truncated, with only
 * a `note_tweet` id stub standing in for the rest; oEmbed truncates
 * identically and x.com blocks crawler user agents. FxEmbed's public
 * API carries the complete text, so it fills the gap. Any failure
 * leaves the truncated syndication text in place.
 */
export async function fetchFullText(id: string): Promise<{ text?: string; quoteText?: string } | null> {
	try {
		const res = await fetch(`https://api.fxtwitter.com/status/${id}`, {
			headers: { 'User-Agent': 'embed-fixer/1.0 (note-tweet fallback)' },
			cf: { cacheTtl: CACHE_OK, cacheEverything: true },
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

/**
 * True when this tweet (or its quote) may be truncated by the endpoint.
 * The tweet itself carries a `note_tweet` stub when cut; a quoted note
 * tweet is cut silently at the classic limit, so a quote that long is
 * treated as suspect and the fallback decides by comparing lengths.
 */
export function isNoteTweet(t: any): boolean {
	return Boolean(t.note_tweet || t.quoted_tweet?.note_tweet)
		|| (t.quoted_tweet?.text?.length ?? 0) >= QUOTE_TRUNCATION_HINT;
}

/** Display text: t.co links expanded, media t.co tails removed. */
function expandText(t: any): string {
	let text: string = t.text || '';
	for (const u of t.entities?.urls ?? []) {
		if (u.url && u.expanded_url) text = text.split(u.url).join(u.expanded_url);
	}
	for (const m of t.entities?.media ?? []) {
		if (m.url) text = text.split(m.url).join('');
	}
	return text.trim();
}

/**
 * The post text and its context, kept separate so each renderer can
 * lay them out its own way: the tweet itself, the tweet it replies to,
 * and any quoted tweet. Replies *to* this tweet are not available from
 * the unauthenticated endpoint.
 */
export function textParts(t: any, full: { text?: string; quoteText?: string } | null): TextParts {
	const parts: TextParts = {
		text: (t.note_tweet && full?.text) ? full.text : expandText(t),
	};

	if (t.parent?.text) {
		parts.reply = {
			user: t.parent.user?.screen_name || t.in_reply_to_screen_name || '?',
			text: expandText(t.parent),
		};
	} else if (t.in_reply_to_screen_name) {
		parts.reply = { user: t.in_reply_to_screen_name };
	}

	if (t.quoted_tweet?.text) {
		// The fallback's quote text wins only when it actually carries
		// more than the endpoint gave us.
		const own = expandText(t.quoted_tweet);
		const fromFallback = full?.quoteText || '';
		parts.quote = {
			user: t.quoted_tweet.user?.screen_name || '?',
			text: fromFallback.length > own.length ? fromFallback : own,
		};
	}

	return parts;
}

/** The full embed description as one plain-text block, for og:description. */
export function buildText(t: any, full: { text?: string; quoteText?: string } | null): string {
	const p = textParts(t, full);
	let text = p.text;

	if (p.reply) {
		text += `\n\n↪️ Replying to @${p.reply.user}`;
		if (p.reply.text !== undefined) text += `: ${p.reply.text}`;
	}
	if (p.quote) {
		text += `\n\n❝ Quoting @${p.quote.user}: ${p.quote.text}`;
	}

	return text;
}

function bestMp4(variants: any[]): any | null {
	return variants
		.filter((v: any) => v.content_type === 'video/mp4')
		.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0] ?? null;
}

/** Highest-bitrate mp4, across both payload shapes the endpoint emits. */
export function pickVideo(t: any): Video | null {
	const media = Array.isArray(t.mediaDetails)
		? t.mediaDetails.find((m: any) => m.type === 'video' || m.type === 'animated_gif')
		: null;

	if (media?.video_info?.variants) {
		const best = bestMp4(media.video_info.variants);
		if (best) {
			return {
				url: best.url,
				width: media.original_info?.width || 1280,
				height: media.original_info?.height || 720,
			};
		}
	}

	if (Array.isArray(t.video?.variants)) {
		const best = t.video.variants.filter((v: any) => v.type === 'video/mp4').pop();
		if (best) return { url: best.src, width: 1280, height: 720 };
	}

	return null;
}

/** Photo urls, capped at Discord's four-image limit. */
export function pickPhotos(t: any): string[] {
	return (Array.isArray(t.photos) ? t.photos : [])
		.slice(0, 4)
		.map((p: any) => p.url)
		.filter(Boolean);
}

/**
 * Every attachment in post order, photos and videos together, from
 * `mediaDetails` when the endpoint sends it and the flat `photos` /
 * `video` fields otherwise.
 */
export function pickMedia(t: any): Media[] {
	const out: Media[] = [];

	if (Array.isArray(t.mediaDetails) && t.mediaDetails.length) {
		for (const m of t.mediaDetails) {
			const width = m.original_info?.width || 0;
			const height = m.original_info?.height || 0;
			if (m.type === 'photo' && m.media_url_https) {
				out.push({
					type: 'photo',
					url: m.media_url_https,
					preview: m.media_url_https,
					width: width || 1200,
					height: height || 675,
				});
			} else if ((m.type === 'video' || m.type === 'animated_gif') && m.video_info?.variants) {
				const best = bestMp4(m.video_info.variants);
				if (best) {
					out.push({
						type: 'video',
						url: best.url,
						preview: m.media_url_https || '',
						width: width || 1280,
						height: height || 720,
					});
				}
			}
		}
		return out.slice(0, 4);
	}

	for (const p of Array.isArray(t.photos) ? t.photos : []) {
		if (p.url) out.push({ type: 'photo', url: p.url, preview: p.url, width: p.width || 1200, height: p.height || 675 });
	}
	const v = pickVideo(t);
	if (v) out.push({ type: 'video', url: v.url, preview: t.video?.poster || '', width: v.width, height: v.height });

	return out.slice(0, 4);
}

/** The API's handle when it is valid, else whatever the path carried. */
export function resolveHandle(t: any, fromPath: string): string {
	const screen = t.user?.screen_name;
	return screen && USER_RE.test(screen) ? screen : fromPath;
}
