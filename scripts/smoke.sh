#!/usr/bin/env bash
# Smoke-test a deployed embed fixer.
#
#   ./scripts/smoke.sh                     # tests x1tt3r.com
#   ./scripts/smoke.sh your-domain.com     # tests your deployment
#
# Checks the human redirect, all three card types, the oembed document,
# and that hostile input is refused. Exits non-zero if anything fails.

set -u

HOST="${1:-x1tt3r.com}"
BASE="https://$HOST"
BOT="Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)"
PASS=0
FAIL=0

# Cache-buster so repeated runs never read a stale edge response.
CB="$(date +%s)"

check() { # check <label> <expected-substring> <actual>
	if printf '%s' "$3" | grep -qF -- "$2"; then
		printf '  ok    %s\n' "$1"
		PASS=$((PASS + 1))
	else
		printf '  FAIL  %s\n' "$1"
		printf '        wanted: %s\n' "$2"
		printf '        got:    %s\n' "$(printf '%s' "$3" | head -c 200)"
		FAIL=$((FAIL + 1))
	fi
}

bot()   { curl -sS -A "$BOT" "$BASE$1?cb=$CB"; }
human() { curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' "$BASE$1?cb=$CB"; }
code()  { curl -sS -o /dev/null -w '%{http_code}' "$BASE$1?cb=$CB"; }

printf 'smoke test: %s\n\n' "$BASE"

printf 'routing\n'
check 'human gets 302 to x.com'   '302 https://x.com/jack/status/20' "$(human /jack/status/20)"
check 'root serves usage text'    "Replace x.com with $HOST"         "$(curl -sS "$BASE/")"
check 'garbage path 404s'         '404'                              "$(code '/jack/status/20%27%22')"
check 'unknown path 404s'         '404'                              "$(code '/not/a/tweet')"

printf '\nembeds\n'
check 'text post: title'          'og:title" content="jack (@jack)"'            "$(bot /jack/status/20)"
check 'text post: description'    'just setting up my twttr'                    "$(bot /jack/status/20)"
check 'photo post: image card'    'twitter:card" content="summary_large_image"' "$(bot /i/status/1349129669258448897)"
check 'video post: player card'   'twitter:card" content="player"'              "$(bot /i/status/1585341984679469056)"
check 'video post: mp4 url'       'og:video" content="https://video.twimg.com'  "$(bot /i/status/1585341984679469056)"
check 'long post: full text'      'grow up and have happy lives.'               "$(bot /i/status/2018068911875346740)"
check 'reply post: parent quoted' 'Replying to @NASA'                           "$(bot /i/status/2092328884016415156)"

printf '\noembed\n'
check 'type is rich'              '"type":"rich"'                    "$(curl -sS "$BASE/oembed?a=test&u=https%3A%2F%2Fx.com%2Fjack%2Fstatus%2F20&cb=$CB")"
check 'author line reflected'     '"author_name":"test"'             "$(curl -sS "$BASE/oembed?a=test&u=https%3A%2F%2Fx.com%2Fjack%2Fstatus%2F20&cb=$CB")"
check 'hostile url pinned'        '"author_url":"https://x.com"'     "$(curl -sS "$BASE/oembed?u=https%3A%2F%2Fevil.example%2F&cb=$CB")"
check 'link tag uses raw &'       '&u=https%3A%2F%2Fx.com'           "$(bot /jack/status/20)"

printf '\n%d passed, %d failed\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
