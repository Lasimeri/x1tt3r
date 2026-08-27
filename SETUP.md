# Setup

Everything needed to run your own copy, from nothing to a working domain.

If you only want to *use* the public instance, you do not need this file. Put
`1tt3r` after the `x` in any post link and you are done.

---

## Table of contents

1. [What you need](#1-what-you-need)
2. [Fast path: deploy in five minutes, no domain](#2-fast-path-deploy-in-five-minutes-no-domain)
3. [Full path: your own domain](#3-full-path-your-own-domain)
4. [Verifying it works](#4-verifying-it-works)
5. [Customizing](#5-customizing)
6. [Troubleshooting](#6-troubleshooting)
7. [How it works](#7-how-it-works)
8. [Known limits](#8-known-limits)
9. [Maintenance](#9-maintenance)
10. [Legal note](#10-legal-note)

---

## 1. What you need

| Requirement | Notes |
|---|---|
| Node.js 18 or newer | `node --version`. Only used to run wrangler locally. |
| A Cloudflare account | Free tier is enough. No credit card. |
| A domain (optional) | Only for section 3. Short domains embed best. |
| Git | To clone. |

You do **not** need an X/Twitter account, an API key, developer access, or a
paid Cloudflare plan. The worker reads a public endpoint that X's own embed
widget uses.

**Cost:** zero for normal use. Cloudflare's free tier covers 100,000 worker
requests per day, and only crawler hits and human redirects count. A domain
costs whatever your registrar charges.

---

## 2. Fast path: deploy in five minutes, no domain

This gets you a working fixer at `https://<worker-name>.<your-subdomain>.workers.dev`.
Fine for personal use; the URL is just long.

```sh
git clone https://github.com/Lasimeri/x1tt3r.git
cd x1tt3r
npm install --legacy-peer-deps
```

> **Why `--legacy-peer-deps`:** wrangler 4 declares an optional peer dependency
> on `@cloudflare/workers-types` v5 while pinning ranges that npm reads as
> conflicting. The flag tells npm to proceed. Nothing is actually broken, and
> `npm run check` passing confirms it.

Open `wrangler.toml` and make two edits:

```toml
name = "my-embed-fixer"   # any name you like, this becomes the workers.dev subdomain
```

Delete both `[[routes]]` blocks (they are for custom domains, covered in the
next section).

Then:

```sh
npx wrangler login    # opens a browser, authorizes your account
npm run deploy
```

Wrangler prints the live URL. Test it:

```sh
npm run smoke -- my-embed-fixer.your-subdomain.workers.dev
```

Skip to [section 4](#4-verifying-it-works).

---

## 3. Full path: your own domain

A short domain is the point of the exercise: it must be quick to type in the
middle of a URL. Pick something where inserting your change into `x.com` is
obvious to anyone reading the link.

### 3.1 Add the domain to Cloudflare

1. Buy the domain at any registrar.
2. In the Cloudflare dashboard: **Add a site**, enter the domain, choose **Free**.
3. Cloudflare shows two nameservers, for example `daniella.ns.cloudflare.com`
   and `trace.ns.cloudflare.com`. Copy both.
4. At your registrar, replace the existing nameservers with those two.
5. Back in Cloudflare, click **Check nameservers**. The zone flips from
   *Pending* to *Active*, usually in minutes, occasionally hours.

**Do not create DNS records for the apex or `www` yourself.** The deploy step
creates them. If Cloudflare's import scan pulled in parking records from your
registrar, delete those two now; a pre-existing record on either name makes the
next step stop and ask for confirmation.

### 3.2 Point the worker at it

Edit `wrangler.toml`:

```toml
name = "my-embed-fixer"

[[routes]]
pattern = "your-domain.com"
custom_domain = true

[[routes]]
pattern = "www.your-domain.com"
custom_domain = true
```

Deploy:

```sh
npm install --legacy-peer-deps
npx wrangler login
npm run deploy
```

Wrangler creates the DNS records, requests certificates, and attaches both
hostnames. Output ends with your domains listed under the worker name.

If it prints `Can't infer zone from route [code: 10082]`, the zone is not
active yet. Wait for *Active* in the dashboard and run `npm run deploy` again.

### 3.3 Optional: mail hygiene records

Your domain will never send email, so tell the world that explicitly. This
stops it being used to forge mail. In **DNS > Records**, add:

| Type | Name | Content |
|---|---|---|
| TXT | `your-domain.com` | `v=spf1 -all` |
| TXT | `_dmarc` | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s` |
| MX | `your-domain.com` | `0 .` (priority 0, content is a single dot) |

Not required for embeds. Takes two minutes and closes a real abuse vector.

---

## 4. Verifying it works

### Automated

```sh
npm run smoke -- your-domain.com
```

Fifteen checks: the human redirect, all three card types, long-post text, reply
context, the oEmbed document, and that hostile input is refused. Every line
should read `ok`.

### By hand

```sh
# Humans get redirected
curl -sI https://your-domain.com/jack/status/20 | head -1

# Crawlers get meta tags
curl -s -A "Discordbot/2.0" https://your-domain.com/jack/status/20
```

### In Discord

Post a link. **Use a post URL you have never posted before**, or add `?v=2` to
the end.

> **This trips up everyone.** Discord caches scraped embeds server-side, keyed
> by URL, for hours. A link you posted before deploying keeps showing the old
> result no matter how many times you redeploy. A fresh URL or a changed query
> string forces a new scrape.

A correct embed shows: the author line with name, handle, and counts; the title;
the full post text; and any media, with video playable inline.

---

## 5. Customizing

Everything adjustable is in `src/config.ts`. Nothing else needs editing to run
on your own domain.

| Setting | Default | Effect |
|---|---|---|
| `THEME_COLOR` | `#1d9bf0` | Colour of the embed's left bar |
| `BOT_UA` | Discord, Telegram, Slack, Mastodon, ... | Which user agents get meta tags instead of a redirect |
| `RATE_LIMIT` | `60` | Requests per IP per minute before a 429 |
| `RATE_WINDOW_MS` | `60000` | Length of that window |
| `CACHE_OK` | `3600` | Seconds to cache a successful embed at the edge |
| `CACHE_MISSING` | `300` | Seconds to cache a deleted or unavailable post |
| `XCOM` | `https://x.com` | Where humans land |

After editing:

```sh
npm run check && npm run deploy
```

### Adding a crawler

If a chat app is not embedding, find its user agent and add it to `BOT_UA`:

```sh
npx wrangler tail    # then post a link and watch the request come in
```

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| No embed at all | Discord cached an old scrape of that URL | Post a URL Discord has not seen, or append `?v=2` |
| Media shows, no text | An oEmbed document returning `type: "link"` | Already fixed here; if you edited `render.ts`, keep it `"rich"` |
| Text cut around 350 characters | Discord's display cap for scraped embeds | Not fixable server-side. Every fixer hits this, including fxtwitter |
| Title cut around 18 characters | Narrow media makes a narrow card | Not fixable. The author line carries the identity as a fallback |
| "Tweet unavailable" on a live post | The syndication endpoint returned nothing | Usually the post is age-restricted or the endpoint is failing intermittently. Retry |
| Long posts truncated at ~280 | The FxEmbed fallback is unreachable | Check `curl https://api.fxtwitter.com/status/20`. If it is down, long posts degrade until it returns |
| `Can't infer zone [code: 10082]` | Zone not active in Cloudflare | Wait for *Active*, redeploy |
| `Authentication error [code: 10000]` | API token lacks a permission | Use `npx wrangler login` instead of a token, or add Workers Routes edit for the zone |
| npm install fails on peer deps | wrangler 4 vs workers-types ranges | `npm install --legacy-peer-deps` |
| Domain resolves nowhere right after deploy | Your resolver cached the pre-deploy NXDOMAIN | Wait out the negative TTL, or test with `dig @1.1.1.1` |

### Watching live requests

```sh
npx wrangler tail
```

Streams every request the worker handles, with status codes. The fastest way to
tell "Discord never asked" from "Discord asked and we answered wrong".

---

## 7. How it works

```
Discord sees a link
        |
        v
GET /user/status/123   with User-Agent: Discordbot
        |
        +-- not a crawler? --> 302 to x.com, done
        |
        v
fetch cdn.syndication.twimg.com/tweet-result?id=123
        |
        +-- long post? --> also fetch api.fxtwitter.com for the full text
        |
        v
HTML page of OpenGraph meta tags
        |
        v
Discord fetches /oembed for the author line, renders the embed
```

**Why two data sources.** The syndication endpoint is X's own, unauthenticated,
and returns everything for a normal post. For posts over roughly 280 characters
it returns truncated text plus a stub id, and no unauthenticated X surface has
the rest. FxEmbed's public API does, so it fills that one gap. If it goes away,
long posts fall back to truncated text and nothing else breaks.

**Why the oEmbed endpoint.** Discord fetches it to fill the small author line
above the title. It must report `type: "rich"`; a `"link"` type makes Discord
treat the page as having no embeddable content and drop the title and
description entirely.

**Security properties.** The redirect target is rebuilt from a validated handle
and a numeric id, never from user input, so this cannot be used as an open
redirect. Everything reaching a meta tag is HTML-escaped. The oEmbed reflection
is length-capped, pinned to an x.com URL, and served as JSON with `nosniff`.
There is a per-IP rate limit. The worker stores nothing and logs nothing.

---

## 8. Known limits

- **Replies to the post are not shown.** The post's own text, its parent, and
  any quoted post are all included. Fetching the replies *below* a post needs
  an authenticated API.
- **Discord truncates long descriptions at display time**, around 350
  characters. Server-side output is complete; the cut is in Discord's renderer.
- **Narrow media makes a narrow card**, which truncates the title. The author
  line is ordered to keep identity visible when that happens.
- **Age-restricted and protected posts return nothing** from the public
  endpoint and render as "Tweet unavailable".
- **The syndication endpoint is undocumented.** X can change or remove it
  without notice. If every embed suddenly says unavailable, check that endpoint
  before debugging the worker.

---

## 9. Maintenance

```sh
npm run deploy          # deploy current code
npx wrangler deployments list    # see history
npx wrangler rollback            # revert to the previous version
npx wrangler tail                # live request log
```

Dependencies are dev-only; the deployed worker bundles no third-party code.
Updating wrangler occasionally is enough.

**Health check.** `npm run smoke -- your-domain.com` is safe to run any time and
catches upstream breakage immediately.

---

## 10. Legal note

This project reads a public, unauthenticated endpoint that X's own embed widget
uses, and redirects humans to x.com. It does not scrape logged-in surfaces, mint
guest tokens, or circumvent authentication.

That said: in August 2026 X Corp sent cease-and-desist letters to Nitter and its
public instances, citing API circumvention and trademark claims, and demanded
repositories be taken down. Front ends for X carry non-zero legal risk right
now, particularly ones whose name or domain resembles X's branding. Run your own
instance with that in mind.

Not affiliated with, endorsed by, or connected to X Corp.
