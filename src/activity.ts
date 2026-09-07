// The Mastodon-shaped status document Discord renders in place of the
// meta tags.
//
// Discord's OpenGraph video card has no description slot: when og:video
// is present the post text is dropped. Discord does, however, render
// Mastodon posts natively, with text, up to four images, and video in
// one embed. A page advertising
//   <link rel="alternate" type="application/activity+json" href=".../users/:handle/statuses/:id">
// makes Discord call /api/v1/statuses/:id on the same host and draw
// that JSON instead. This module builds it from the syndication payload.
// Only fields Discord reads carry real data; the rest are Mastodon
// API v1 filler so the document validates.

import { CACHE_MISSING, CACHE_OK, XCOM } from './config';
import { esc } from './render';
import { pickMedia, textParts } from './twitter';

const URL_RE = /https?:\/\/[^\s<>"']+/g;

/** Escape a run of plain text, linkify @mentions and #hashtags, keep line breaks. */
function plainRun(s: string): string {
	return esc(s)
		.replace(/(^|[^\w/])@([A-Za-z0-9_]{1,15})(?!\w)/g, (_m, p, h) => `${p}<a href="${XCOM}/${h}">@${h}</a>`)
		.replace(/(^|[^\w&/])#([\p{L}\p{N}_]+)/gu, (_m, p, h) => `${p}<a href="${XCOM}/hashtag/${h}">#${h}</a>`)
		.replace(/\n/g, '<br>');
}

/** Post text as Mastodon-style HTML. URLs become links, everything else is escaped. */
export function textHtml(text: string): string {
	let out = '';
	let last = 0;
	for (const m of text.matchAll(URL_RE)) {
		const at = m.index ?? 0;
		out += plainRun(text.slice(last, at));
		out += `<a href="${esc(m[0])}">${esc(m[0])}</a>`;
		last = at + m[0].length;
	}
	return out + plainRun(text.slice(last));
}

function userLink(handle: string): string {
	return `<a href="${XCOM}/${esc(handle)}">@${esc(handle)}</a>`;
}

function json(body: unknown, status = 200, maxAge = CACHE_OK): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': `public, max-age=${maxAge}`,
			'X-Content-Type-Options': 'nosniff',
		},
	});
}

/** Mastodon's own 404 body, so Discord treats the post as gone rather than broken. */
export function activityUnavailable(): Response {
	return json({ error: 'Record not found' }, 404, CACHE_MISSING);
}

export function activityResponse(
	t: any,
	handle: string,
	id: string,
	full: { text?: string; quoteText?: string } | null,
): Response {
	const canonical = `${XCOM}/${handle}/status/${id}`;
	const parts = textParts(t, full);

	// Stats sit between the post and its context: Discord caps rendered
	// activity content at roughly a thousand characters, and a long
	// quoted post would otherwise push the stats past the cut.
	const replies = (t.conversation_count ?? 0).toLocaleString('en-US');
	const likes = (t.favorite_count ?? 0).toLocaleString('en-US');
	let content = `${textHtml(parts.text)}<br><br><b>💬 ${replies}&ensp;❤️ ${likes}</b>`;
	if (parts.reply) {
		content += `<br><br><blockquote>↪️ Replying to ${userLink(parts.reply.user)}`;
		if (parts.reply.text !== undefined) content += `: ${textHtml(parts.reply.text)}`;
		content += '</blockquote>';
	}
	if (parts.quote) {
		// The blockquote already reads as a quote; the handle alone on its
		// first line is enough and keeps characters inside Discord's cap.
		content += `<br><br><blockquote>${userLink(parts.quote.user)}:<br>${textHtml(parts.quote.text)}</blockquote>`;
	}

	// A quote post with no media of its own shows the quoted post's media.
	let media = pickMedia(t);
	if (!media.length && t.quoted_tweet) media = pickMedia(t.quoted_tweet);

	const attachments = media.map((m, i) => {
		// Discord refuses videos it considers too large and draws small
		// ones tiny; halving or doubling the advertised size fixes both.
		let k = 1;
		if (m.type === 'video') {
			if (m.width > 1920 || m.height > 1920) k = 0.5;
			if (m.width < 400 || m.height < 400) k = 2;
		}
		const width = Math.round(m.width * k);
		const height = Math.round(m.height * k);
		return {
			id: `${id}${i}`,
			type: m.type === 'photo' ? 'image' : 'video',
			url: m.url,
			preview_url: m.preview,
			remote_url: null,
			preview_remote_url: null,
			text_url: null,
			description: null,
			meta: { original: { width, height, size: `${width}x${height}`, aspect: m.width / m.height } },
		};
	});

	const created = new Date(t.created_at || Date.now());
	const createdAt = isNaN(created.getTime()) ? new Date().toISOString() : created.toISOString();
	const avatar = String(t.user?.profile_image_url_https || '').replace('_normal.', '_400x400.');

	return json({
		id,
		url: canonical,
		uri: canonical,
		created_at: createdAt,
		edited_at: null,
		reblog: null,
		in_reply_to_id: null,
		in_reply_to_account_id: null,
		language: t.lang || 'en',
		content,
		spoiler_text: '',
		visibility: 'public',
		application: { name: 'X', website: null },
		media_attachments: attachments,
		account: {
			id: String(t.user?.id_str || '0'),
			display_name: t.user?.name || handle,
			username: handle,
			acct: handle,
			url: `${XCOM}/${handle}`,
			uri: `${XCOM}/${handle}`,
			created_at: createdAt,
			locked: false,
			bot: false,
			discoverable: true,
			indexable: false,
			group: false,
			avatar,
			avatar_static: avatar,
			header: null,
			header_static: null,
			followers_count: 0,
			following_count: 0,
			statuses_count: 0,
			hide_collections: false,
			noindex: false,
			emojis: [],
			roles: [],
			fields: [],
		},
		mentions: [],
		tags: [],
		emojis: [],
		card: null,
		poll: null,
	});
}
