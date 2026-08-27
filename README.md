# x1tt3r

Twitter/X embed fixer on a Cloudflare Worker. Swap `x.com` for
`x1tt3r.com` in a tweet link and Discord (or any chat crawler) renders a
proper embed: text, photos, playable video, like/reply counts. Humans
who click the link get a 302 straight to x.com.

## Mechanism

- Crawler user agents (`Discordbot`, `TelegramBot`, `Slackbot`, ...) get
  an HTML shell of OpenGraph/Twitter-card meta tags built from the
  public `cdn.syndication.twimg.com/tweet-result` endpoint. No auth, no
  scraping.
- The description carries the entire tweet text with t.co links
  expanded and media-link tails stripped, then the text of the tweet it
  replies to (the `parent` object), then any quoted tweet's text.
  Replies *to* the linked tweet (children) are not available from the
  unauthenticated endpoint and are not included.
- Long posts ("note tweets", over ~280 chars) are truncated by the
  syndication endpoint to a `note_tweet` id stub. For those the worker
  makes one fallback fetch to `api.fxtwitter.com/status/:id` for the
  complete text; if that fails, the truncated text is served.
- The Cloudflare worker is named `dmcamyass`; the public surface is
  `x1tt3r.com`.
- Every other user agent gets a 302 to the canonical x.com URL.
- `/oembed` serves the small JSON Discord fetches for the author line
  (reply/like counts).

## Accepted paths

    /:user/status/:id      user: [A-Za-z0-9_]{1,15}, id: digits
    /i/status/:id
    /status/:id

Anything else 404s. The redirect target is rebuilt from the validated
components only, so the worker cannot be used as an open redirect.

## Security properties

- All upstream-derived strings are HTML-entity-escaped before meta-tag
  interpolation.
- `/oembed` reflection is inert: JSON output, `application/json`,
  `X-Content-Type-Options: nosniff`, and the `u` param is pinned to
  `https://x.com/`.
- Per-IP rate limit (60 req/min, per isolate).
- Tweet fetches and crawler responses edge-cache for 1h; tombstones for
  5min; human redirects are `no-store`.

## Deploy

    npm install
    npx wrangler deploy

`wrangler.toml` registers `x1tt3r.com` and `www.x1tt3r.com` as Workers
custom domains; the zone must be active in the Cloudflare account
first. DNS records and certificates are created automatically.

## Failure signature

If x.com starts validating the syndication `token` beyond the known
`((id / 1e15) * Math.PI).toString(36)` derivation, every embed
degrades to the "Tweet unavailable" card. That is the signal to check
the endpoint, not the worker.
