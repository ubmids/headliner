# Headliner

Qloo Agentic Hackathon entry (Devpost, due 30 Oct 2026, 11:45 pm EDT). Next.js 15 app, tests with `npm test`.

## Design is binding

`design/DESIGN.md` is the binding design spec for the app, the printable brief, README images, Devpost gallery, thumbnail and video cards. `design/directions.html` shows the candidate directions. Read DESIGN.md before touching any UI or asset. Design commits never change scoring, data or behaviour, and `npm test` stays green.

The five rules most likely to be broken (written for Direction A, the recommendation; adjust if another direction is picked):

1. **Two data colours only.** Qloo signal and LLM mark-up, everything else ink and neutrals. No new hue for a new feature; tiers use fill plus a text label.
2. **No cards in cards, no gradients, no shadows.** A section is a 2px rule and a heading. Radius 0 on surfaces, 2px on controls.
3. **Verdict above the fold.** After a run, a 1440 by 900 screenshot shows the with/without numbers and the missed cities without scrolling.
4. **Load the fonts.** Archivo and IBM Plex Mono via `next/font/google`. Never fall back to Inter, the system stack or Arial Black as the design.
5. **No horizontal scroll at 390px.** Grid columns use `minmax(0, 1fr)`; test 1440, 1280 and 390 widths before committing UI.
