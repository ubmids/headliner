# Deploying Headliner

**Host: Fly.io**, one always-on machine (`auto_stop_machines = "off"`, `min_machines_running = 1`) with a 1 GB volume for the server-side cache. Why Fly: it bills per second (about US$3–4/month for a `shared-cpu-1x` 512 MB machine plus the volume), it never sleeps, and the config lives in the repo (`fly.toml`). Free tiers on Render and Railway put idle apps to sleep, and the rules require the demo to stay up through judging (2–16 Nov 2026) with no cold starts.

The `Dockerfile` is host-agnostic, so the same image runs on Railway or Render (paid, always-on plan) if you prefer. The steps for those are at the end.

## Environment variables

| Variable | Required | Example | Notes |
|---|---|---|---|
| `QLOO_API_KEY` | yes, for live data | `(secret)` | Hackathon key from Qloo. Server-side only. Without it the app runs in **fixture mode** (sample artists only, banner shown) |
| `QLOO_BASE_URL` | no | `https://hackathon.api.qloo.com` | Already set in `fly.toml`. The client refuses any other host |
| `LLM_BASE_URL` | recommended | `https://api.openai.com/v1` | Any OpenAI-compatible chat-completions endpoint with tool calling |
| `LLM_API_KEY` | with the above | `(secret)` | Sent as `Authorization: Bearer …` |
| `LLM_MODEL` | with the above | `gpt-4.1-mini` | Any tool-calling model. Without `LLM_*` the agent uses the deterministic planner and the "without Qloo" panel shows the recorded LLM answer |
| `DATA_DIR` | no | `/data` | Cache directory (Qloo responses + finished runs). Set in `fly.toml`, on the volume |
| `MAX_ACTIVE_RUNS` | no | `3` | Concurrent fresh agent runs (protects the Qloo quota) |

Use a decent model for `LLM_MODEL`: the "without Qloo" column must be a fair answer from a capable LLM, not a strawman. The recorded baselines in `fixtures/baseline/` came from a small local model (Qwen3-VL 4B on llama.cpp). Re-record them with the production model (step 6).

## First deploy (about 15 minutes)

```bash
# 0. Install flyctl and log in
curl -L https://fly.io/install.sh | sh
fly auth login

# 1. From the repo root: create the app from fly.toml without deploying yet
fly launch --no-deploy --copy-config --name headliner-qloo --region iad
#    (if the name is taken, pick another and update `app` in fly.toml)

# 2. Volume for the cache (same region as the machine)
fly volumes create headliner_data --region iad --size 1 --yes

# 3. Secrets
fly secrets set QLOO_API_KEY=... LLM_BASE_URL=https://api.openai.com/v1 LLM_API_KEY=... LLM_MODEL=gpt-4.1-mini

# 4. Deploy
fly deploy

# 5. Verify: expect {"ok":true,"qloo":"live","planner":"llm","model":"..."}
curl -s https://headliner-qloo.fly.dev/api/health
fly status          # exactly 1 machine, state "started"
fly scale count 1   # one machine (the cache volume is per machine)

# 6. Before judging: smoke-test Qloo, re-record baselines with the production LLM, warm the cache
QLOO_API_KEY=... scripts/qloo-smoke.sh
LLM_BASE_URL=... LLM_API_KEY=... LLM_MODEL=... npx tsx scripts/record-baselines.ts && git commit -am "Re-record baselines with the production LLM" && fly deploy
npx tsx scripts/warm-cache.ts https://headliner-qloo.fly.dev
```

`warm-cache.ts` runs the agent for the three samples and about a dozen artists judges are likely to type. Finished runs are cached on the volume and replayed instantly, trace included.

## Checks before 2 Nov (and once a week until 16 Nov)

- `curl https://headliner-qloo.fly.dev/api/health` returns `"qloo":"live"`.
- Open the site on a phone, click **Noah Kahan**: the brief appears in under 5 s (cached replay).
- Type an artist that isn't cached: the trace streams, and the run finishes in about 20–60 s depending on the LLM.
- `fly logs` shows no `Qloo 401/403/429`. If the quota runs low, ask in #api-help on the Qloo Discord (the dev guide says limits can be raised per user).

## Local production check (already verified on mmfarm, 13 Oct 2026)

```bash
npm ci && npm run build
cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public
cd .next/standalone && PORT=3077 DATA_DIR=/tmp/hl-data node server.js
curl -s localhost:3077/api/health
```

## Alternatives

**Railway** (paid "Hobby" plan; services don't sleep): New Project → Deploy from GitHub repo → it detects the `Dockerfile`. Add the variables above, plus a volume mounted at `/data`. Set the health check path to `/api/health`.

**Render** (needs a paid instance type; the free tier sleeps after 15 minutes): New → Web Service → Docker. Instance type Starter or above, Persistent Disk at `/data`, health check path `/api/health`, and the variables above.

**Vercel** works for the UI, but serverless functions have no shared disk cache and cap function duration, so a slow LLM run can be cut off. Not recommended for this app.
