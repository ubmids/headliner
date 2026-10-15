# Headliner design spec

This file is binding. Any change to the UI, the printable brief, the README images, the Devpost gallery, the thumbnail or the video cards follows it. When code and this file disagree, fix the code or change this file in the same commit, with a reason.

Status: **Direction C, "Tour poster", picked by Subomi on 15 Oct 2026.** `design/directions.html` shows all three directions considered; only C is binding.

## 0. Who judges this, and what they score

Qloo Agentic Hackathon on Devpost, due 30 Oct 2026, 11:45 pm EDT. Stage 2 has four equally weighted criteria, with ties broken in this order:

1. Technological implementation: how thoroughly and skilfully Qloo's API is used.
2. **Design: a complete, coherent product, not a proof of concept.**
3. Potential impact.
4. Quality of idea: a creative, non obvious use of Qloo.

The brief's key line: *"If your submission would work the same without Qloo, you're building the wrong thing."* Judges include Live Nation's EVP of Strategic Initiatives, Todd Boehly, Jason Calacanis, Cedric the Entertainer, an OpenAI board member and Qloo's CTO. Most will judge "solely on the text description, images and video" and will never run the app. So the gallery images and the thumbnail are the product for most of them, and they must read in two seconds.

The users we design for are booking agents, tour managers, promoters and talent buyers. They read day sheets, itineraries, settlement sheets and Pollstar charts all day. They trust numbers that look like those documents, and they distrust anything that looks like a marketing dashboard.

## 1. Audit of the current UI (15 Oct 2026, fixture mode, Noah Kahan)

What reads as generic AI made UI today:

1. **Rounded cards everywhere.** Every section, decision, stat, act and sponsor is a 12 to 14px rounded dark card inside another rounded dark card. Up to three levels of nested boxes, so nothing has priority.
2. **Radial blue and orange gradient hero.** The page opens on a glow, the most common AI dashboard tell, then spends 240px of the first screen on a paragraph of marketing copy.
3. **Fonts that are not loaded.** The CSS names Inter and Archivo Black, but neither is imported. Judges get system UI plus Arial Black for every headline. The brief headline is a 36px Arial Black sentence of 20 words.
4. **The verdict is below the fold.** At 1440 by 900 the first screen after a run shows the form, a large yellow fixture banner and the brief headline. The "83 vs 72" result, which is the whole pitch, starts about 1,000px down.
5. **Colour soup.** Ten hues in use: blue Qloo, orange LLM, blue anchor (same as Qloo), green sleeper, amber volume, yellow accent, yellow route, red, green status, a blue heat ramp. Anchor and Qloo share a colour, the yellow accent means "on tour", "button" and "running step" at once.
6. **The fixture banner shouts.** A full width amber box above every result. Honesty is right, but it reads as an error and it will be in every screenshot until the key lands.
7. **Mobile overflows.** At 390px the page is 477px wide: `.layout` uses `grid-template-columns: 1fr` (not `minmax(0, 1fr)`), so the routing table pushes the whole result column off screen.
8. **Pill everything.** Chips, tabs, tiers, badges and the "powered by" label are all 999px pills with a 1px border, so states and data tags look the same as buttons.
9. **Tiny grey meta text.** 11 and 12px muted text carries real information (overlap, popularity, endpoint counts). It passes contrast but is hard to read in a 1080p video.
10. **No music.** Apart from the word "Headliner", nothing says live music: no set list, no itinerary, no poster, no room. It could be a SaaS analytics app for any industry.

What is already good and must survive: the two column result plus sticky trace, the side by side contrast with a measured number, the self hosted Natural Earth map, the printable brief, tabular numerals in tables, honest fixture labelling, the one click samples, and the deep link `/?artist=…`.

## 2. Principles (each one is testable)

1. **The verdict is above the fold.** After a run, a 1440 by 900 screenshot shows the with/without numbers ("83 vs 72") and both routes, with the cities the LLM missed marked, without scrolling. At 390 by 844 the score pair is on the first screen. Every submission image includes it.
2. **One pink, and it means Qloo.** Fluoro pink marks only what Qloo found: Qloo's route and score, sleeper markets, stops the LLM missed. Riso blue marks only what the plain LLM said. The one sanctioned non-data use of pink is the offset overprint on the HEADLINER wordmark, because the product is the "with Qloo" side. No pink buttons, pink backgrounds, pink stamps, pink icons or pink tints behind large areas. Test: every pink declaration in the CSS sits on a Qloo or sleeper selector, or on `.wordmark`.
3. **Loud type, calm data.** Big Shoulders Display 900 is for the verdict numbers, city names in the route and the two route lists, section headings and the wordmark. Everything that is read rather than seen (tables, venue lists, the trace, captions, sponsor lists) is Instrument Sans or Space Mono at 13 to 15px on hairline rows. Test: no table cell and no trace line uses the display face.
4. **Numbers look like a settlement sheet.** Every number in a column uses tabular figures and right alignment. Fan score is always 0 to 100, always called "fan score", and the scale is named once per view.
5. **The route is the hero object.** Stops are shown in tour order as a date stack: stop number, city in poster type, tier, room, drive leg. The same list, in the same order, appears in the app, the printable brief and the thumbnail.
6. **Every claim is one hop from its Qloo call.** Each decision section names its source (endpoint and request count) in a mono source line, and the trace sits beside the result on desktop.
7. **Honest, not loud.** Fixture mode is an ink-outlined mono stamp in the masthead and a one line note, at most 32px tall. It never uses pink, never looks like an error, and disappears in live mode.
8. **Legible from the back of the room.** Data text at least 13px, meta at least 12px, nothing below 11px. Text contrast at least 4.5:1 (3:1 only for display text at 24px and up), marks at least 3:1, in both themes. No horizontal page scroll at 390px.

## 3. Reference board

| # | Product | Take | Avoid |
|---|---|---|---|
| 1 | **Swiss concert posters** (Josef Müller-Brockmann's Tonhalle series) | A strict grid, type as the image, black plus one ink | Abstraction that hides the information |
| 2 | **Swissted** (Mike Joyce) | Punk and indie gig bills reset as Swiss posters: proof that a date stack can be loud and orderly | Pastiche, decoration for its own sake |
| 3 | **Riso printed gig posters** (any small press, e.g. Hato Press, Colorama) | Two flat inks, fluoro pink and blue, a slight misregistration on the headline only | Halftone noise and grain over data |
| 4 | **Tour announcement posts** (the dates graphic every artist posts) | The universal format of a tour: artist, then cities in a stack | Photo backgrounds, script fonts |
| 5 | **DICE** app | Bold artist and city names as typography, rows that scan fast | Consumer gloss |
| 6 | **Resident Advisor** (ra.co) | Black and white confidence, dense listings under loud headings | Tiny low contrast grey |
| 7 | **Pollstar Boxoffice and Top Tours charts** | Ranked tables with no decoration, numbers as the headline | Ad cluttered chrome |
| 8 | **Master Tour** itineraries and day sheets | The data under the poster: room, drive leg, order of stops | Enterprise chrome |
| 9 | **Prism.fm** settlement sheets | Right aligned tabular money columns, the register investors trust | SaaS sidebar and cards |
| 10 | **NYT and FT graphics desks** | One annotated takeaway sentence above each chart, direct labels on maps | Long scrollytelling |
| 11 | **Chartmetric** | Shows what music data tools look like today | Card soup and rainbow charts: what we must not look like |
| 12 | **Spotify Wrapped** | One huge number per frame, for video cards | Gradients, blobs, a pink that means nothing |

## 4. Tokens (Direction C, "Tour poster", picked by Subomi on 15 Oct 2026)

The idea: Headliner's answer is the tour poster you would announce, backed by the data sheet underneath. Two flat inks on paper. Qloo prints in fluoro pink, the plain LLM in riso blue, everything else in black.

### Colour

Contrast is WCAG 2 relative luminance, computed with `python3 design/contrast.py` (the ratios below are its output). The pink and blue pair was run through the dataviz palette validator in both modes: lightness band, chroma floor, CVD separation and the normal vision floor all pass (light: protan ΔE 12.0, normal ΔE 33.0; dark: pass).

| Token | Role | Light | Dark |
|---|---|---|---|
| `--paper` | page background | `#FAFAF7` | `#111111` |
| `--sheet` | raised data surface (tables, inputs) | `#FFFFFF` | `#1A1A1A` |
| `--sunk` | inset rows, map land | `#F0F0EC` | `#232323` |
| `--ink` | text, rules, anchor tier, buttons | `#0D0D0D` (18.6:1 on paper) | `#F5F5F2` (17.3:1) |
| `--ink-2` | secondary text | `#3D3D3D` (10.4:1) | `#C2C2BE` (10.6:1) |
| `--ink-3` | meta text | `#616161` (5.9:1 paper, 5.4:1 sunk) | `#929290` (6.1:1 paper, 5.0:1 sunk) |
| `--hair` | row hairlines | `#DADAD4` | `#2E2E2C` |
| `--qloo` | Qloo marks, display text 24px and up, sleeper tier | `#E6007E` (4.3:1 paper, 4.5:1 sheet) | `#E8429A` (5.1:1 paper, 4.7:1 sheet) |
| `--qloo-text` | Qloo text under 24px | `#B00060` (6.7:1 paper) | `#FF8CC6` (8.8:1) |
| `--on-qloo` | text on a pink mark | `#FFFFFF` (4.5:1) | `#111111` (5.1:1) |
| `--llm` | plain LLM marks, strikes, rings | `#0078BF` (4.5:1 paper) | `#2E8AD8` (5.2:1 paper) |
| `--llm-text` | plain LLM text | `#005A91` (7.0:1) | `#8CC8FF` (10.6:1) |
| `--neutral` | volume tier, context marks | `#858585` (3.5:1 paper, 3.7:1 sheet) | `#77777A` (4.2:1) |
| `--skip` | skip tier (hollow ring) | `#BDBDB7` | `#45453F` |
| `--panel` / `--panel-text` | the trace panel (an ink block) | `#0D0D0D` / `#F5F5F2` (17.8:1) | `#050505` / `#F5F5F2` (18.7:1) |
| `--panel-text-2` | trace secondary text | `#B8B8B4` (9.8:1) | `#B8B8B4` (10.2:1) |
| `--panel-text-3` | trace meta | `#8E8E8A` (5.9:1) | `#929290` (6.5:1) |
| `--panel-qloo` | Qloo endpoints in the trace | `#FF5CAD` (6.8:1) | `#FF8CC6` (9.5:1) |
| `--panel-llm` | plain LLM lines in the trace | `#5CB3FF` (8.7:1) | `#8CC8FF` (11.5:1) |
| `--seq-1` to `--seq-5` | overlap heat cells, one neutral hue light to dark | `#E4E4DF` `#BDBDB7` `#6F6F6A` `#4A4A46` `#1F1F1D` (cell text 15.2, 10.3, 5.1, 8.9, 16.5:1) | `#2A2A28` `#45453F` `#8C8C86` `#BDBDB7` `#E8E8E3` (13.2, 8.8, 5.6, 10.0, 15.4:1) |

Tier encoding: **anchor** solid ink disc, **sleeper** solid pink disc, **volume** solid neutral disc, **skip** hollow ring, each always with its word. The plain LLM's picks are a blue dashed ring, a blue strike through, or blue type; never a filled mark. Heat and sequential data use the neutral ramp, never pink, so pink stays a signal. The audience age chart encodes polarity by position (left or right of the zero line) with ink bars and a signed number; it uses no hue.

### Type

| Role | Family | Size / line height | Why |
|---|---|---|---|
| Wordmark | Big Shoulders Display 900, caps, pink offset overprint (3px right, 3px down) | 44 desktop, 34 mobile | The poster headline; the only decorative pink |
| Verdict numbers | Big Shoulders Display 900 | 88/0.85 desktop, 64 mobile | Read from across a room and in a 300px thumbnail |
| Route cities, section headings | Big Shoulders Display 800 to 900, caps | cities 26 to 30, headings 30 | The tour date stack. Condensed, so a long city still fits |
| Body, tables, lists | Instrument Sans 400, 500, 600 | 15/22 body, 14/20 tables | A neutral grotesque with a slightly editorial tone; calm under loud headings |
| Data, labels, trace, stamps | Space Mono 400, 700 | 12 to 13/18 | Monospace with character: reads like a ticket stub and an API log |

Google Fonts now ships Big Shoulders Display as the family "Big Shoulders" with an optical size axis (10 to 72); `next/font` loads it as `Big_Shoulders` with `axes: ["opsz"]`, and at display sizes the browser picks the Display cut automatically. All three are loaded with `next/font/google` (self hosted at build time, no runtime request to Google) and exposed as `--font-display`, `--font-body` and `--font-mono`. No Inter, no Arial Black, no system stack as the design.

### Spacing, radius, motion

- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64. Section gap 40 desktop, 28 mobile. Page gutter 32 desktop, 16 mobile.
- Radius: 0 everywhere. Tier discs and stop numbers are circles.
- Rules: a 3px ink rule under every section heading, 1px hairlines between data rows, a 3px ink frame around the run bar. No shadows (the wordmark overprint is a flat text shadow, not a blur). No gradients.
- Motion: only to show the agent working. Trace lines fade in over 120ms. Nothing else moves. Respect `prefers-reduced-motion`.

## 5. Component and screen inventory

Screens:

1. **Home, empty**: masthead (wordmark, one line of who it's for, mode stamp), run bar (artist, region, dates, optional cities, Plan the tour), sample artists as a poster style bill (artist in display type, genre and region in mono), the trace panel placeholder.
2. **Running**: run bar disabled, a "Planning" panel with steps and Qloo request counts, trace streaming.
3. **Result**, in this order: (a) the verdict: "The guess tour" vs "The taste tour", the score pair between them, then the three facts; (b) the brief headline and the three decisions as a sheet; (c) routing: date stack, map, ranked markets; (d) support act; (e) sponsors and merch; (f) audience.
4. **Printable brief** `/brief/[id]`: light tokens only, poster heading, calm tables, A4 and US Letter safe.
5. **States**: fixture stamp, live stamp, replayed from cache, LLM unavailable, Qloo empty result, error.
6. **Mobile** 390px: one column, trace below the result.

Components: wordmark; mode stamp; run bar; sample bill; verdict (two route posters, score pair, fact row); decision sheet; date stack row; route map (Leaflet on a paper basemap: ink route, tier discs, blue dashed rings for LLM picks, numbered stops); ranked market rows; opener cards and the per market overlap grid (neutral ramp); sponsor columns with local leads; audience tags, age bars, momentum line; trace step and call line with mono source badges; primary (ink) and secondary (outlined) buttons; segmented toggle (outlined, ink when pressed); tooltip (ink box, paper text); source line; footer.

## 6. Submission assets

All assets are rendered from the running app by `scripts/assets.ts`: real screens, or poster layouts filled from a real run's JSON. No stock photos, no AI images, nothing the app cannot produce.

- **Thumbnail** (Devpost 3:2, `docs/gallery/thumbnail.png`, 1500 by 1000): HEADLINER wordmark, artist, both route lists side by side ("Ask an LLM" in ink with blue strikes on the weak picks, "Ask Qloo" with pink on the cities only Qloo found), and the 83 vs 72 pair as the largest element. At 300 by 200 the score pair, both column heads and the strike marks must still read: check by downscaling (`docs/gallery/thumbnail-300.png`).
- **Gallery images** (3:2, 1500 by 1000, `docs/gallery/01-…png` to `06-…png`): 1 verdict, 2 routing, 3 trace, 4 openers, 5 sponsors, 6 printable brief. Each has a caption band on top: the takeaway in display type ("Burlington, VT: the sleeper the LLM never named"), with a mono source line.
- **README images** (`docs/img/`): re-shot by `scripts/screenshots.ts` in the new design. README hero = the verdict.
- **Video cards** (1920 by 1080, `docs/video/`): title card (thumbnail layout at 16:9), lower third (transparent PNG: ink band, display label, mono number, 64px safe margin, at least 3 seconds on screen), end card ("Headliner. Tour decisions on taste data, not guesswork." plus the live URL slot and "Built on Qloo").
- **Fixture rule**: until the key is live, every asset that shows Qloo numbers carries the mono stamp "FIXTURE DATA · ILLUSTRATIVE". Final assets are re-shot in live mode by re-running `scripts/assets.ts`.

## 7. Do and don't

Do:
- Lead with the verdict and the two routes.
- Keep pink for Qloo's signal and blue for the plain LLM.
- Set data in Instrument Sans and Space Mono on hairlines; save poster type for what should be seen from across a room.
- Name the source of every number.
- Write labels the way a tour manager talks: "dates", "rooms", "drive", "opener", "sleeper".
- Test at 1440 by 900, 1280 by 800 and 390 by 844 before every commit that touches UI.

Don't:
- No pink buttons, pink stamps, pink backgrounds, pink tints or pink decoration (except the wordmark overprint).
- No gradients, glows, blurs, shadows or rounded corners.
- No cards inside cards. A section is a heading and a 3px rule.
- No emoji or decorative icons. Use stop numbers, tier discs and words.
- No poster type in tables, the trace or captions.
- No Inter, no Arial Black, no system stack as the design.
- No new hues for new features.
- No paragraph of marketing copy above the run bar.
- Never change scoring, data or behaviour in a design commit.

## Appendix: directions not picked

A ("Advance sheet") and B ("Front of house") are kept in `design/directions.html` for reference only. Their tokens are not binding.
