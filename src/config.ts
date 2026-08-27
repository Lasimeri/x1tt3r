// Everything worth tweaking lives here.
//
// The worker is domain-agnostic: it reads its own hostname from each
// request, so forking needs no edits in this directory. Point
// wrangler.toml at your domain and deploy.

/** Canonical destination for human visitors and og:url. */
export const XCOM = 'https://x.com';

/** Accent colour of the Discord embed's left bar. */
export const THEME_COLOR = '#1d9bf0';

/**
 * User agents that receive OpenGraph HTML instead of a redirect.
 * Anything not matching here is treated as a human and redirected.
 */
export const BOT_UA =
	/discordbot|telegrambot|slackbot|twitterbot|whatsapp|facebookexternalhit|linkedinbot|mastodon|pleroma|misskey|summalybot|bluesky|skypeuripreview|redditbot|embed/i;

/** X handle rules: 1-15 chars, letters/digits/underscore. */
export const USER_RE = /^[A-Za-z0-9_]{1,15}$/;

/** Tweet ids are digits only. */
export const ID_RE = /^\d{1,20}$/;

/** Requests per IP per window before a 429. */
export const RATE_LIMIT = 60;
export const RATE_WINDOW_MS = 60_000;

/** Edge cache lifetimes, seconds. */
export const CACHE_OK = 3600;
export const CACHE_MISSING = 300;
