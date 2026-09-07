# x1tt3r

Twitter/X links do not embed properly in Discord. This fixes that.

Insert `1tt3r` after the `x` in any post link:

```
https://x.com/user/status/123        ->  no text, no video
https://x1tt3r.com/user/status/123   ->  full text, photos, playable video
```

Clicking the link still takes you to x.com. Only crawlers see anything different.

**What you get:** the entire post text, including long posts that X truncates,
plus the post it replies to, any quoted post, like and reply counts, photos, and
inline-playable video.

Live at **[x1tt3r.com](https://x1tt3r.com)**. To run your own, see **[SETUP.md](SETUP.md)**.

---

## Repository layout

| Path | What it does |
|---|---|
| `src/index.ts` | Routing: parse the path, redirect humans, serve crawlers |
| `src/config.ts` | Every knob worth turning (theme colour, crawler list, limits) |
| `src/twitter.ts` | Talks to X, assembles the post text |
| `src/render.ts` | Builds the meta tags and the oEmbed document |
| `src/activity.ts` | The Mastodon-style status document Discord renders, so text and video share one embed |
| `src/home.ts` | The root page: styled landing page and link converter |
| `scripts/smoke.sh` | Tests a live deployment end to end |
| `wrangler.toml` | Worker name and domains |

## Commands

```sh
npm install --legacy-peer-deps   # see SETUP.md for why the flag
npm run check                    # typecheck
npm run dev                      # local server
npm run deploy                   # ship it
npm run smoke -- your-domain.com # test a deployment
```

## How it works

A crawler (`Discordbot`, `TelegramBot`, `Slackbot`, ...) gets an HTML page of
OpenGraph meta tags built from X's public syndication endpoint. Everything else
gets a 302 to the canonical x.com URL. No API key, no login, no scraping.

Discord gets one extra hint: a `<link rel="alternate"
type="application/activity+json">` pointing at `/api/v1/statuses/:id` on the same
host. Discord treats that as a Mastodon post and renders the JSON it finds there,
which is the only way to get post text next to a playable video: Discord's plain
video card has no description slot. As a bonus, long posts escape the 350-character
cap Discord applies to scraped descriptions.

Only `/:user/status/:id` shapes are served; anything else returns 404, so the
worker cannot be used as an open redirect.

## Licence

MIT. Not affiliated with X Corp.
