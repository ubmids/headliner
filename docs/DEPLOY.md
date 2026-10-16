# Deploying Headliner

**Host: Vercel** (Hobby plan, free), project `headliner-qloo`, production URL **https://headliner-qloo-eta.vercel.app**. Deployed from a local prebuilt build with the Vercel CLI. Git-triggered deployments are switched off in `vercel.json`, because a build from GitHub would not contain the pre-run demo artists (see below).

## How it works on serverless

- **Qloo is live.** `QLOO_API_KEY` is an encrypted (sensitive) Vercel environment variable, read only on the server. The key never reaches the browser: page HTML and every JS bundle were checked for it after deploy.
- **Caches.** `DATA_DIR=/tmp/headliner` holds the Qloo response cache and finished runs per function instance (memory + `/tmp`). A fresh instance starts empty, so:
- **Seed runs.** Before each deploy, `scripts/seed-runs.sh` runs the agent against live Qloo for 16 artists (the three samples plus a dozen judges might type) and writes the finished runs to `seed/runs/`. The run cache falls back to that directory, read only, so those artists replay instantly on any instance. `seed/` is gitignored: Qloo response data must not be published in a public repo, so it ships inside the deployment only. `next.config.mjs` traces it into the functions.
- **The LLM side.** The demo host has no LLM key. The planner is the deterministic one (the same Qloo tools in a fixed order). The "without Qloo" answers are recorded ahead of time from Claude Haiku 4.5 with the app's exact prompt (`scripts/record-baselines.ts`, stored in `fixtures/baseline/`, which is LLM output, not Qloo data) and labelled "cached answer" in the UI. For an artist without a recorded answer, the comparison panel says so and lists the artists that have one.
- **Duration.** `/api/run` streams NDJSON and allows 300 s (`vercel.json`); a cold live run takes about 15–25 s.

## Environment variables (Vercel, Production)

| Variable | Value | Notes |
|---|---|---|
| `QLOO_API_KEY` | (secret) | Added with `--sensitive`. Server-side only |
| `QLOO_BASE_URL` | `https://hackathon.api.qloo.com` | The client refuses any other host |
| `DATA_DIR` | `/tmp/headliner` | The only writable path on Vercel functions |

Do **not** add `LLM_*` variables on the host: the owner's LLM key never goes on a server. (Setting them would also change the run-cache key, so the seed runs would stop matching.)

## Redeploy (about 3 minutes)

```bash
# 0. Once: Vercel CLI logged in, project linked (vercel link --project headliner-qloo)
# 1. Load the Qloo key for local runs only (never commit it, never echo it)
set -a; . ~/.config/hackathons/qloo.env; set +a; export QLOO_BASE_URL="$QLOO_API_URL"
# 2. Optional: check every Qloo endpoint the app uses
npx tsx scripts/qloo-smoke.ts --no-record
# 3. Build, then pre-run the demo artists into seed/runs/ (needs the build; reuses .data/qloo to save quota)
npm run build && scripts/seed-runs.sh
# 4. Build for Vercel and deploy the prebuilt output (seed/runs is traced into the functions)
vercel pull --yes --environment=production
vercel build --prod && vercel deploy --prebuilt --prod
# 5. Verify
curl -s https://headliner-qloo-eta.vercel.app/api/health    # {"ok":true,"qloo":"live","planner":"rules","recorded":[...16 artists]}
```

To record "without Qloo" answers for more artists (local only, through an OpenAI-compatible endpoint):

```bash
LLM_BASE_URL=http://127.0.0.1:8765/v1 LLM_MODEL=claude-haiku-4-5-20251001 npx tsx scripts/record-baselines.ts "Artist|north-america" "Band|uk-europe"
```

Then add the same artists to `scripts/seed-runs.sh` and redeploy.

## Regenerating the submission assets

```bash
CHROME="/path/to/chrome" npx tsx scripts/assets.ts https://headliner-qloo-eta.vercel.app "Tyler Childers" north-america   # thumbnail, gallery, video cards
CHROME="/path/to/chrome" npx tsx scripts/screenshots.ts https://headliner-qloo-eta.vercel.app                           # README images
```

## Checks before 2 Nov (and once a week until 16 Nov)

- `curl https://headliner-qloo-eta.vercel.app/api/health` returns `"qloo":"live"`.
- Open the site on a phone, click **Tyler Childers**: the brief appears in a few seconds (replay from the seed).
- Type an artist that isn't seeded: the trace streams and the run finishes in about 15–25 s.
- `vercel logs headliner-qloo-eta.vercel.app` shows no `Qloo 401/403/429`. If the quota runs low, ask in #api-help on the Qloo Discord.

## Other hosts

The `Dockerfile` and `fly.toml` still work for an always-on container (Fly.io about US$3–4 a month with a volume; Railway or Render on a paid plan). On those hosts the disk cache persists, so seed runs are optional: run `scripts/warm-cache.ts <url>` after deploying instead.

```bash
npm ci && npm run build
cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public
cd .next/standalone && PORT=3077 DATA_DIR=/tmp/hl-data node server.js
```
