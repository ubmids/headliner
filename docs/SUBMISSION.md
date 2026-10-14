# Devpost submission draft: Qloo Agentic Hackathon

Deadline **30 Oct 2026, 11:45 pm EDT** (31 Oct 03:45 UTC). Judging 2–16 Nov; winners 23 Nov.

Fields below follow the standard Devpost "Enter a submission" form and the official rules' requirements (functional demo link, public repo with an open-source licence visible in the GitHub About section, text description). The hackathon-specific questions are only visible after logging in; check the form for extra questions and answer them from the sections below. The Qloo hackathon kit's submission guide (github.com/qloo/qloo-hackathon-kit, `docs/SUBMISSION.md`) asks for six things, all covered: problem statement, Qloo workflow and why, a redacted request-to-result example, screenshots, setup steps, and known limitations.

> **Before pasting:** replace every `[[…]]` placeholder with live numbers from the deployed app once the Qloo key is in. Do not publish fixture numbers as Qloo findings.

---

## Project name
**Headliner**

## Elevator pitch (≤ 200 characters)
An agent for tour promoters: it routes the tour, picks the opener and finds sponsors from Qloo's taste graph, then shows what a plain LLM would have got wrong.

_(158 characters)_

## Thumbnail
`docs/img/contrast.png`, cropped to 3:2 (the side-by-side "Without Qloo / With Qloo" panel). Re-shoot from live mode.

## Try it out
- Live demo: `https://headliner-qloo.fly.dev` (no login; click **Try a sample → Noah Kahan**)
- Code: `https://github.com/ubmids/headliner` (MIT)

## Video
90–120 s, see `docs/DEMO_SCRIPT.md`. Upload unlisted to YouTube and paste the link.

---

## About the project (paste as markdown)

### Inspiration
A headline tour is one of the most expensive bets in entertainment: 20 cities, rooms booked months ahead, an opening act, and sponsors who want to know who's in the crowd. Those calls are still made from last tour's ticket counts, streaming dashboards and gut feel. Ask an LLM and you get the biggest cities in the country and Coca-Cola as a sponsor. **Qloo knows where a particular artist's fans actually concentrate, which other artists they love, and what they buy.** That's the missing input.

### What it does
Headliner is an **agent for live-music promoters and tour planners**. Type an artist (or click a sample) and it makes the three expensive decisions of a tour, each grounded in Qloo calls it plans itself:

1. **Routing.** A Qloo **heatmap** shows where the artist's fans concentrate across the region. Qloo's **location-aware affinity** scores each city, and the agent tiers markets (*anchor*, *sleeper*, *volume*, *skip*), orders them into a drivable route on a map, and pulls Qloo-matched **venues** for every stop. *Sleeper* markets are the point: cities where fans over-index for the city's size, which a promoter can sell out in a smaller room.
2. **Support act.** Qloo returns artists the headliner's fans love, capped below the headliner's popularity. The agent **re-ranks them against the fans in each market**, because the right opener in Boston isn't always the right one in Burlington, and explains the overlap with Qloo's **audience comparison** (shared taste tags).
3. **Sponsors & merch.** Qloo's **cross-domain** graph gives the brands this audience over-indexes on (food & drink, fashion, beer/wine/spirits), tour-wide and per market. That surfaces local-only activation leads and pre/after-show hospitality partners.
4. **The brief.** One printable page and a CSV a promoter can take into a meeting.

Every Qloo request (endpoint, parameters, result count, latency) streams into a **reasoning trace** as it happens.

**Without Qloo / with Qloo.** The same question goes to the plain LLM with no tools. Headliner then **fact-checks** that answer with the same Qloo calls it used for its own plan. In [[live run, artist]], the LLM's cities averaged a fan score of [[X]] against [[Y]] for Headliner's route, and it never mentioned [[sleeper market]]. [[Keep only if the live run shows it: Some of its suggested openers don't exist in Qloo at all.]] The brief says it directly: *"If your submission would work the same without Qloo, you're building the wrong thing."* Headliner shows the gap as a number.

### How we built it
- **Next.js 15 + TypeScript**, one app. The agent streams its events (steps, Qloo calls, the LLM baseline, the result) as NDJSON to a React UI with a Leaflet map and hand-built SVG charts.
- **Agent:** 12 tools, each wrapping documented Qloo calls. An **OpenAI-compatible tool-calling loop** lets the LLM choose the next tool, and every call carries a one-sentence reason that becomes the trace. A deterministic planner runs the same tools when no LLM is configured. A coverage guard refuses to finish a brief until routing, support act and sponsors are each grounded in Qloo results.
- **Qloo client:** typed endpoints validated with zod, the `hackathon.api.qloo.com` host enforced, retries on 429/5xx, empty-result flagging (Qloo silently ignores invalid parameters), and a server-side cache of responses and finished runs, so judges get instant replays.
- **Qloo endpoints:** `/search`, `/v2/tags`, `/v2/insights` (heatmap, artist, place, brand, tag, demographics), `/v2/analysis/compare`, `/v2/trending`. About 60 requests per plan.
- **Scoring:** fan score blends heatmap affinity with location-conditioned artist affinity, normalised across the whole region. Over-index = concentration minus volume (heatmap popularity).
- **Tests:** 50 unit and integration tests (client, fixtures, scoring, contrast, CSV, the LLM loop with a scripted model, and the full agent on fixtures). One test asserts that every request uses only documented Qloo parameters.

### Challenges we ran into
- **No API key for most of the build.** We wrote the client against the published reference and Qloo's own harness, then built a fixture mode by running the real agent against a schema-faithful stand-in. `scripts/qloo-smoke.sh` validated every call the moment the key arrived.
- **Silent failures.** Qloo ignores invalid parameters, so a typo returns an empty list rather than an error. The client flags every empty result in the trace, and the smoke test checks that location parameters actually change the answer.
- **Keeping the LLM honest.** Tools return Qloo IDs and scores. The brief's numbers come from tool results and are never generated, and the coverage guard catches a model that tries to finish early.

### Accomplishments that we're proud of
- The with/without comparison is **measured, not asserted**: the LLM's own cities are scored by Qloo.
- Sleeper-market detection: concentration vs volume from one heatmap call.
- Per-market support-act overlap, which no streaming "fans also like" list gives you.
- It looks and behaves like a product: one click, mobile-friendly, printable brief, CSV, no login.

### What we learned
Taste data is most valuable where the decision is expensive and the obvious answer is wrong. The agent pattern earns its keep when every claim in the output can be traced to a call in the log.

### What's next for Headliner
Ticketing and capacity data next to fan concentration (room-size recommendations), date-aware routing around festivals, multi-artist bills (co-headline compatibility), and an API for agency booking tools.

### Known limitations (Qloo kit guidance)
- Qloo affinities describe aggregate audiences, not individuals. Headliner sends no personal data.
- Fan score is relative to the cities scored in a run, not an absolute demand forecast. It doesn't replace ticketing history.
- Venue capacity and availability aren't in Qloo, so venues are taste matches, not holds.
- The hackathon environment may lack data for some artists or regions. Empty results are shown, not hidden.

### Request-to-result example (redacted)
```
GET https://hackathon.api.qloo.com/v2/insights
    ?filter.type=urn:heatmap
    &signal.interests.entities=<Noah Kahan entity ID>
    &filter.location=POLYGON((-125 24, -66 24, -66 50, -125 50, -125 24))
    &output.heatmap.boundary=urn:entity:locality
    &take=50
X-Api-Key: <redacted>
→ results.heatmap[]: { location: {latitude, longitude}, query: {affinity, affinity_rank, popularity} }
→ folded to cities; affinity high + popularity low = "sleeper" market ([[live example]])
```

---

## Built with
`qloo` · `qloo-insights-api` · `typescript` · `next.js` · `react` · `node.js` · `leaflet` · `natural-earth` · `zod` · `vitest` · `openai-compatible-api` · `llm-tool-calling` · `fly.io` · `docker`

## Submission checklist (rules)
- [ ] Functional demo link, externally hosted, free, no login, up until 16 Nov 23:45 EST
- [ ] Public GitHub repo with all source, assets and instructions (`README.md`, `docs/DEPLOY.md`)
- [ ] Open-source licence file (MIT) **visible in the GitHub About section** (GitHub detects `LICENSE` automatically once the repo is public; check the sidebar)
- [ ] Text description (above), in English
- [ ] Uses Qloo's API (Stage 1 pass/fail) and is agentic (tool-calling agent)
- [ ] Video (optional per the rules, but judges "may judge on text, images and video")
- [ ] Screenshots re-shot in live mode; no fixture numbers presented as Qloo data
- [ ] No API keys in the repo, screenshots or video
