# Demo video script (target 1:45; hard cap 2:00)

**Rule for this video:** the payoff (plain LLM vs Qloo on a real artist) is on screen **before 0:20**. Judges include Live Nation's EVP of Strategic Initiatives, an owner of sports and entertainment franchises, and an investor: talk like a promoter, not like an engineer. Show Subomi on camera (face cam in a corner) for the open and the close.

**Record in live mode** (real Qloo key, production LLM) on the deployed URL. Do the run once off camera first, so the on-camera run is a cached replay and the trace still animates. Use the artist whose live contrast is strongest (check Noah Kahan, Tyler Childers and Fontaines D.C. after the smoke test, and pick one). Fill the `[[…]]` from that run.

| Time | Screen | Voice-over (Subomi) |
|---|---|---|
| 0:00–0:06 | Face cam, then the Headliner home page | "Routing a 20-city tour is a multi-million-dollar bet. Here's what happens when you ask an AI to make it." |
| 0:06–0:20 | Click **Try a sample → [[artist]]**. Cut straight to the **Without Qloo / With Qloo** panel. Zoom on the callout and the "[[X]] vs [[Y]]" stat | "A plain LLM sends [[artist]] to New York, LA and Chicago. Headliner asks Qloo where the fans actually are, and scores the LLM's own cities: an average fan score of [[Y]] against [[X]]. It also found [[sleeper city]], which the LLM never mentioned." |
| 0:20–0:35 | Scroll the **reasoning trace**; hover one heatmap call and one `signal.location.query` call | "This is the agent working. Every line is a real Qloo call it chose: the heatmap of where fans concentrate, then each city scored with Qloo's location-aware affinity. [[N]] calls, five endpoints." |
| 0:35–0:55 | **Routing** card: the map with tiers, the route, the orange rings for the LLM's picks. Hover a sleeper market | "Anchor markets you'd expect. The sleepers are the money: [[city]] over-indexes for its size, so you play a smaller room and sell it out. Every stop comes with venues whose crowds share this taste." |
| 0:55–1:15 | **Support act** card: top three acts and the per-market overlap table | "Openers: artists these fans love, capped below the headliner, then re-ranked city by city. [[act]] is strongest in [[city]], and Qloo's audience comparison says why: [[shared tags]]." |
| 1:15–1:30 | **Sponsors & merch** card; point at a local-only lead | "And who pays for it. Qloo's cross-domain graph shows what this crowd buys: [[brand]] tour-wide, [[local brand]] only in [[city]]. An LLM can't know that." |
| 1:30–1:40 | Click **Open printable brief**, then **Download CSV** | "One page and a spreadsheet to take into the meeting." |
| 1:40–1:50 | Face cam | "Headliner: tour decisions on taste data, not guesswork. Built on Qloo." |

## Shot list and tips
- 1080p, browser at 1440 px wide, zoom 110%. Hide bookmarks. Make sure no key is visible anywhere (the trace never shows the key, but terminal windows might).
- On-screen captions for every number; many judges watch muted.
- Lower-third at 0:06: "Without Qloo vs with Qloo: same question, same scoring."
- Don't show the fixture banner. The video must be recorded in live mode.
- Thumbnail: the contrast panel with the "[[X]] vs [[Y]]" stat.
