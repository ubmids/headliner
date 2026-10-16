# Demo video script (target 1:45; hard cap 2:00)

**Rule for this video:** the payoff (plain LLM vs Qloo on a real artist) is on screen **before 0:20**. Judges include Live Nation's EVP of Strategic Initiatives, an owner of sports and entertainment franchises, and an investor: talk like a promoter, not like an engineer. Show Subomi on camera (face cam in a corner) for the open and the close.

**Record on the deployed URL: https://headliner-qloo-eta.vercel.app** (live Qloo data). Tyler Childers has the strongest live contrast of the samples, so he is the first sample button and the artist in the thumbnail and gallery. His run is pre-recorded on the host, so the on-camera click is an instant replay and the trace still animates. Numbers below are from that live run (16 Oct 2026); they stay the same until the seed runs are re-recorded.

Say "a plain LLM" or "Claude Haiku, asked the same question". The demo host has no LLM key, so the "without Qloo" column is a cached Haiku answer; the UI labels it "cached answer", which is fine to show.

| Time | Screen | Voice-over (Subomi) |
|---|---|---|
| 0:00–0:06 | Face cam, then the Headliner home page | "Routing a 20-city tour is a multi-million-dollar bet. Here's what happens when you ask an AI to make it." |
| 0:06–0:20 | Click **Try a sample → Tyler Childers**. The **Without Qloo / With Qloo** panel is the first thing on screen. Zoom on the "96 / 86" column | "Ask a plain LLM to route Tyler Childers and it sends him to Philadelphia, Boston and Toronto. Headliner asks Qloo where his fans actually are, and scores the LLM's own cities: Toronto 57, Philadelphia 75. Headliner's route averages 96 against 86, and it opens in Asheville, which the LLM never named." |
| 0:20–0:35 | Scroll the **reasoning trace**; hover the heatmap call (`urn:heatmap`) and one `signal.location.query` call | "This is the agent working. Every line is a real Qloo call: the heatmap of where fans concentrate, then each city scored with Qloo's location-aware affinity. 59 calls, five endpoints." |
| 0:35–0:55 | **Routing**: the date stack, then the map (pink = sleeper, blue dashed rings = the LLM's picks). Hover **Charlottesville, VA** (the pink bar in the ranked list) | "Asheville, Knoxville, Lexington, Louisville: the Appalachian core you'd hope for, with real rooms from Qloo, the Orange Peel, Rupp Arena. And the sleeper: Charlottesville over-indexes for its size, so you play a smaller room and sell it out." |
| 0:55–1:15 | **Support act**: the three openers and the per-market overlap table | "Openers: artists these fans love, capped below the headliner, then re-ranked city by city. Charley Crockett is strongest in Asheville, and Qloo's audience comparison says why: acoustic guitar, folk, blues, country." |
| 1:15–1:30 | **Sponsors & merch**; point at the local leads under Food & drink | "And who pays for it. Qloo's cross-domain graph shows what this crowd buys: Twisted Tea tour-wide, Coors Banquet only in Boulder. An LLM can't know that." |
| 1:30–1:40 | Click **Open printable brief**, then **Download CSV** | "One page and a spreadsheet to take into the meeting." |
| 1:40–1:50 | Face cam | "Headliner: tour decisions on taste data, not guesswork. Built on Qloo." |

## Shot list and tips
- 1080p, browser at 1440 px wide, zoom 110%. Hide bookmarks. Make sure no key is visible anywhere (the trace never shows the key, but terminal windows might).
- On-screen captions for every number; many judges watch muted.
- Lower-third at 0:06: "Without Qloo vs with Qloo: same question, same scoring." Overlay `docs/video/lower-third.png` (transparent 1920x1080). Open on `docs/video/title.png`, close on `docs/video/end.png` (already rendered from the live run).
- The page shows a one-line "Live Qloo data" note under the samples; leave it in shot, it is the honesty line.
- Optional live moment: type an artist that is not pre-recorded (e.g. Wet Leg, UK & Europe) to show a cold run; it takes about 15–25 s and the comparison panel says no plain-LLM answer is recorded for that artist.
- Thumbnail: `docs/gallery/thumbnail.png`, the two routes and 96 vs 86 (rendered from the live run).
