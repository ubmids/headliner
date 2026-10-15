# Headliner

Qloo Agentic Hackathon entry (Devpost, due 30 Oct 2026, 11:45 pm EDT). Next.js 15 app, tests with `npm test`.

## Design is binding

`design/DESIGN.md` is the binding design spec (Direction C, "Tour poster") for the app, the printable brief, README images, Devpost gallery, thumbnail and video cards. Read it before touching any UI or asset. Design commits never change scoring, data or behaviour, and `npm test` stays green. Regenerate assets with `scripts/assets.ts` and README images with `scripts/screenshots.ts`.

The five rules most likely to be broken:

1. **One pink, and it means Qloo.** Pink only on Qloo's route, score, sleeper markets and stops the LLM missed (plus the wordmark overprint). Blue only for the plain LLM. No pink buttons, stamps, backgrounds or decoration; no new hues.
2. **Loud type, calm data.** Big Shoulders Display for the verdict, route cities, headings and wordmark only. Tables, the trace, captions and lists are Instrument Sans or Space Mono at 13px and up on hairlines.
3. **Verdict above the fold.** After a run, a 1440x900 screenshot shows 83 vs 72 and both routes without scrolling.
4. **Load the fonts with `next/font/google`.** Big Shoulders Display, Instrument Sans, Space Mono via the `--font-display/body/mono` variables. Never Inter, Arial Black or the system stack as the design.
5. **No horizontal scroll at 390px.** Grid columns use `minmax(0, 1fr)`; test 1440, 1280 and 390 widths before committing UI.
