# Print It Huge — stats worker

A single Cloudflare Worker + D1 database that collects **anonymous aggregate
counters** for the site: posters generated, pages printed, wall area covered,
and a per-day series for the last 30 days.

Privacy properties (deliberate, load-bearing):

- No cookies, no localStorage, no identifiers of any kind.
- The client IP and User-Agent are never read and never stored.
- Only whitelisted event names and validated, clamped integer props are stored.
- Because nothing personal is processed and nothing is written to the visitor's
  device, no GDPR consent banner is needed.

## One-time setup

Requires Node 20+ and a (free) Cloudflare account.

```bash
cd worker
npm install
npx wrangler login
npx wrangler d1 create print-it-huge-stats
```

Copy the `database_id` from the create output into `wrangler.toml`, then create
the tables (in production and, for local dev, in the local database):

```bash
npm run db:init:remote   # wrangler d1 execute ... --remote --file=schema.sql
npm run db:init:local    # same, for `wrangler dev` local testing
```

Set the origins that may talk to the worker in `wrangler.toml`
(`ALLOWED_ORIGINS`), e.g. for a GitHub Pages project site:

```
ALLOWED_ORIGINS = "https://<user>.github.io,http://localhost:5173,http://127.0.0.1:5173"
```

## Deploy & run

```bash
npm run deploy   # wrangler deploy → prints the https://print-it-huge-stats.<account>.workers.dev URL
npm run dev      # local dev server on http://localhost:8787
```

Put the deployed URL in the site's `VITE_STATS_URL` build variable
(see the main README). With no `VITE_STATS_URL`, the site simply never sends
anything.

## Endpoints

### `POST /api/event`

Body (JSON, ≤512 bytes): `{"event": "...", "props": {...}}`

- `poster_generated` with `{style, paper, pages, area_cm2}` — increments
  `posters`, `pages`, `area_cm2`, `style:<name>`, `paper:<name>` and the daily
  `posters`/`pages` buckets.
- `image_loaded` with `{source: "upload"|"drop"|"gallery"}` — increments
  `images` and `image:<source>`.
- `poster_error` with `{style}` — increments `errors`.

Requests must carry an `Origin` header on the allowlist, otherwise `403`.
Invalid payloads get `400`. Valid events get `204`.

### `GET /api/stats`

Returns totals plus a zero-filled 30-day series (same origin rules):

```json
{
  "totals": {
    "posters": 12, "pages": 140, "area_cm2": 8448, "images": 30, "errors": 1,
    "styles": {"dots": 8}, "papers": {"letter": 12}, "sources": {"gallery": 20}
  },
  "daily": [{"day": "2026-08-01", "posters": 2, "pages": 24}]
}
```

## Try it locally

```bash
curl -X POST http://localhost:8787/api/event \
  -H "Origin: http://localhost:5173" \
  -H "Content-Type: text/plain;charset=UTF-8" \
  -d '{"event":"poster_generated","props":{"style":"dots","paper":"letter","pages":9,"area_cm2":5429}}'

curl http://localhost:8787/api/stats -H "Origin: http://localhost:5173"
```

## Known trade-off

The endpoint is open by design (no accounts, no keys), so a determined bad
actor could inflate counters with scripted requests — the same trade-off
rasterbator.net makes. The origin allowlist and strict payload validation stop
accidental and lazy abuse; the numbers are a fun scoreboard, not billing data.
