# peterjespersen.com API

Merged GitHub contribution history of both accounts — **piijt** (personal) and **peterhjespersen** (work) —
persisted in MongoDB and served to the portfolio's hero city and graph.

## Why scraping and not the GraphQL API

GitHub's GraphQL `contributionsCollection` only counts contributions the calling token can see. A fine-grained
token for one account hides the other account's org/private work (peterhjespersen showed **1** contribution via
the API vs **~1,150** on the public profile). The public calendar at
`github.com/users/<login>/contributions?from=YYYY-01-01&to=YYYY-12-31` is exactly what an anonymous visitor
sees, needs no token, and never expires. Parsing lives in [`../shared/contributions.ts`](../shared/contributions.ts).

## Run locally

```sh
docker run -d --name portfolio-mongo -p 27018:27017 -v portfolio-mongo-data:/data/db mongo:7
cp .env.example .env
pnpm install
pnpm dev            # http://localhost:4000 — first start backfills every year, then syncs every 6h
```

| Command | What it does |
| --- | --- |
| `pnpm dev` / `pnpm start` | API server; syncs on start and every `SYNC_EVERY_HOURS` |
| `pnpm sync [--full]` | one-off sync without the server (`--full` re-fetches every year) |
| `pnpm snapshot` | writes `../public/contributions.snapshot.json`, the site's offline fallback |

## Endpoints

| Route | |
| --- | --- |
| `GET /contributions` | `{ generatedAt, syncedAt, source, accounts[], days: [date, personal, work][], years[], stats }` — cached in memory until the next sync, `Cache-Control: max-age=300` |
| `GET /health` | `{ ok, lastSync }` |
| `POST /sync` | force a sync; `Authorization: Bearer $SYNC_TOKEN`, `?full=1` for every year. Disabled when `SYNC_TOKEN` is empty |

## Data

- `contribution_days` — `{ login, date: "YYYY-MM-DD", count }`, unique on `(login, date)`; syncs upsert, so they're idempotent.
- `sync_runs` — every sync attempt with what it fetched or the error.

An account with no stored days gets a full backfill (from its `since` year in `ACCOUNTS`); after that only the
current year is re-fetched, plus the previous year during January.

## Deploy (later)

Any Node 22 host with a MongoDB (Atlas free tier works). Build from the **repo root**, since the API imports `../shared`:

```sh
docker build -f api/Dockerfile -t portfolio-api .
docker run -p 4000:4000 -e MONGODB_URI=... -e SYNC_TOKEN=... -e CORS_ORIGINS=https://peterjespersen.com portfolio-api
```

Then build the site with `NUXT_PUBLIC_API_BASE=https://<api host>`. Until then the site uses the bundled snapshot,
so refresh it with `pnpm snapshot` before deploying the site.
