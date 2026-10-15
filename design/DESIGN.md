# Headliner design spec

This file is binding. Any change to the UI, the printable brief, the README images, the Devpost gallery, the thumbnail or the video cards follows it. When code and this file disagree, fix the code or change this file in the same commit, with a reason.

Status: Phase 1 (audit and directions). The direction is not picked yet. `design/directions.html` shows three; Direction A ("Advance sheet") is recommended and its tokens are in section 4. If Subomi picks B or C, swap section 4 for that direction's tokens from the appendix and keep everything else.

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

1. **The verdict is above the fold.** After a run, a 1440 by 900 screenshot shows the with/without numbers ("83 vs 72") and the cities the LLM missed, without scrolling. At 390 by 844 it is on the first or second screen. Every submission image includes it.
2. **Two data colours, and only two.** One signal colour means "Qloo found this". One mark-up colour means "the plain LLM said this". Everything else is ink and neutrals. Tiers are told apart by fill and shape (solid, signal, hollow) plus a text label, never by hue alone. Test: no chart or status colour in the CSS outside the tokens in section 4.
3. **Numbers look like a settlement sheet.** Every number uses tabular figures and right alignment in columns. Fan score is always 0 to 100, always called "fan score", and the scale is named once per view. Test: every numeric cell has `font-variant-numeric: tabular-nums`.
4. **The route is the hero object.** Stops are shown in tour order with a stop number, city, tier, room and drive leg, the way an itinerary or a tour poster lists dates. The same list, in the same order, appears in the app, the printable brief and the thumbnail.
5. **Every claim is one hop from its Qloo call.** Each decision block names its source (endpoint and request count) in a footnote line, and the trace sits beside the result on desktop. Test: each decision section ends with a source line.
6. **Honest, not loud.** Fixture mode is a persistent stamp on the masthead and a footnote on each data block, at most 32px tall. It never looks like an error. It disappears in live mode.
7. **Legible from the back of the room.** Data text is at least 13px, meta at least 12px, nothing below 11px. Text contrast at least 4.5:1, marks at least 3:1, in both themes. No horizontal page scroll at 390px.

## 3. Reference board

| # | Product | Take | Avoid |
|---|---|---|---|
| 1 | **Master Tour** (Eventric), tour itineraries and day sheets | The day sheet grammar the industry already reads: date, city, venue, drive leg, in a strict ruled list | Dated enterprise chrome, tiny controls |
| 2 | **Prism.fm**, promoter booking and settlement | Settlement sheet numerals, right aligned money columns, holds as a grid | Generic SaaS sidebar and card layout |
| 3 | **Pollstar Boxoffice and Top Tours charts** | Ranked tables with no decoration, numbers as the headline | Ad cluttered web chrome |
| 4 | **Resident Advisor** (ra.co) | Monochrome, type led listings, one accent, confident black and white | Low contrast tiny grey type |
| 5 | **DICE** app | Bold artist names as typography, event rows that scan fast | Consumer gloss, dependence on photos |
| 6 | **Swiss concert posters** (Müller-Brockmann's Tonhalle series, Mike Joyce's Swissted) | The tour date stack, a strict grid, type as image | Unreadable at thumbnail size when over styled |
| 7 | **Bloomberg Terminal** | Density, every pixel carries data, amber on black for a console direction | Hostile to a first time viewer |
| 8 | **NYT and FT graphics desks** (route maps, election needles) | Direct labels on the map, an annotated takeaway sentence above every chart | Long scrollytelling |
| 9 | **Ableton Live** | Flat functional colour, hairline structure, small caps labels, a tool made for music people | Very small hit targets |
| 10 | **Teenage Engineering** (OP-1, product pages) | Numbered parts, precise orange and grey, playful but exact | Novelty that costs clarity |
| 11 | **Chartmetric** | Shows what the market already sees in music data | Card soup, rainbow charts: what we must not look like |
| 12 | **Spotify Wrapped** | One huge number per frame, for video cards only | Gradients and blobs |

## 4. Tokens (Direction A, "Advance sheet", recommended)

The idea: Headliner's output is the document a tour manager already trusts, an advance sheet or itinerary on paper. Qloo's findings are printed in ink and ultramarine. The plain LLM's answer is marked up in red pencil.

### Colour

Contrast is WCAG 2 relative luminance, computed (run `python3 design/contrast.py`; the ratios below are its output). Data colours were run through the dataviz palette validator (lightness band, chroma, CVD separation, normal vision floor) in both modes.

| Token | Role | Light | Dark |
|---|---|---|---|
| `--paper` | page background | `#F2F2EF` | `#0E0E0D` |
| `--sheet` | data surface | `#FFFFFF` | `#181817` |
| `--sunk` | inset rows, inputs | `#E9E9E5` | `#222220` |
| `--ink` | primary text, rules, anchor tier | `#111111` (16.8:1 on paper) | `#F1F1EC` (17.1:1) |
| `--ink-2` | secondary text | `#44443F` (8.7:1) | `#BDBDB5` (10.2:1) |
| `--ink-3` | meta text | `#66665F` (5.2:1 paper, 4.8:1 sunk) | `#8F8F87` (5.9:1 paper, 4.9:1 sunk) |
| `--hair` | hairline rules | `#D4D4CE` | `#34342F` |
| `--qloo` | "Qloo found this" marks, sleeper tier | `#2638C9` (7.5:1 paper) | `#6878F2` (5.1:1) |
| `--qloo-ink` | Qloo text and links | `#1B2A9E` (10.0:1) | `#A7B1FF` (9.5:1) |
| `--qloo-tint` | Qloo highlight band | `#E6E9FB` (qloo-ink on it 9.3:1) | `#1E2340` (7.6:1) |
| `--llm` | "plain LLM said this" marks, red pencil | `#C42A1C` (5.1:1 paper) | `#E5533F` (5.2:1) |
| `--llm-ink` | LLM text | `#A3200F` (6.8:1) | `#FF9A8A` (9.4:1) |
| `--llm-tint` | LLM highlight band | `#FBE7E4` (llm-ink on it 6.4:1) | `#3A1C17` (7.5:1) |
| `--neutral-mark` | volume tier, context marks | `#83837C` (3.4:1 paper) | `#75756E` (4.2:1) |
| `--skip-mark` | skip tier (hollow outline) | `#C4C4BD` | `#46463F` |
| `--stamp-bg` / `--stamp-ink` | fixture stamp | `#FFF1C7` / `#6B4A00` (7.2:1) | `#2E2508` / `#F2D48A` (10.5:1) |

Validator results: light pair `#2638C9 / #C42A1C` passes every check (protan ΔE 27.8, normal ΔE 37.2). Dark pair `#6878F2 / #E5533F` passes every check. The neutral marks are deliberately grey: they are context, not identity, and always carry a text label.

Tier encoding: **anchor** solid ink disc, **sleeper** solid ultramarine disc, **volume** solid neutral disc, **skip** hollow ring. Each always has its word next to it. The plain LLM's picks are a red pencil ring or a red strike through, never a filled mark.

### Type

| Role | Family | Size / line height | Why |
|---|---|---|---|
| Display (artist, verdict number) | Archivo, width 62 to 75, weight 800 | 40/40 desktop, 32/34 mobile | A grotesque built for print and screen with a real condensed width axis: tour poster and day sheet headers in one family, no second display face |
| Section label | Archivo, width 100, weight 700, caps, tracking 0.08em | 12/16 | Day sheet column heads |
| Body | Archivo, width 100, weight 400 | 15/22 | Same family keeps the page quiet |
| Data, numbers, trace | IBM Plex Mono, 400 and 600 | 13/18, numbers 14 | Tabular by design, reads like a printed itinerary and an API log at once |

Load from Google Fonts with `display=swap` via `next/font/google` (self hosts at build time, no runtime request): `Archivo` (axes `wdth`, `wght`) and `IBM Plex Mono` (400, 600). No Inter. Arial Black never appears.

### Spacing, radius, motion

- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64. Section gap 32 desktop, 24 mobile. Page gutter 32 desktop, 16 mobile.
- Radius: 0 on sheets, tables and sections; 2px on inputs and buttons; stop number discs are circles. No pills except the fixture stamp.
- Rules: a 2px ink rule opens each section (day sheet style), 1px hairlines between rows. No box shadows. No gradients.
- Motion: only to show the agent working. Trace lines enter with a 120ms fade; the route strip draws left to right once (400ms ease-out) when a result lands. Respect `prefers-reduced-motion` (no draw, no fade). No hover lifts, no shimmer.

## 5. Component and screen inventory

Screens:

1. **Home, empty**: masthead, run bar (artist, region, dates, optional cities, Plan the tour), three sample artists as itinerary rows ("Noah Kahan, folk-pop, US and Canada, 8 dates"), the trace placeholder.
2. **Running**: run bar disabled, trace streaming, a progress line ("step 6 of ~13, 41 Qloo requests").
3. **Result**: in this order. (a) Verdict strip: without vs with, avg fan score pair, missed cities, unfindable openers. (b) Brief headline and three decisions. (c) Routing: route strip, map, itinerary table. (d) Support act. (e) Sponsors and merch. (f) Audience.
4. **Printable brief** `/brief/[id]`: the same tokens in light mode only, A4 and US Letter safe.
5. **States**: fixture stamp, live stamp, replayed from cache, LLM unavailable, Qloo empty result, error.
6. **Mobile** 390px: trace moves below the result and collapses to its last 5 lines with "show all".

Components: masthead with mode stamp; run bar; sample row; verdict strip (stat pair, missed list, opener check); score row (city, bar, number); tier mark and label; route strip (stops, drive legs in km); route map (Leaflet, tier discs, red pencil rings for LLM picks, numbered stops); itinerary table; opener cards and per market overlap grid (single hue ramp of `--qloo`); sponsor columns with local leads; audience tags, diverging age bars, momentum line; trace step and call line with source badges; primary and secondary button; segmented toggle; tooltip; source footnote; footer.

## 6. Submission assets

All assets are rendered from the real app or from `design/` HTML with the tokens above. No stock photos, no AI images, no mock data that the app cannot produce.

- **Thumbnail** (Devpost, 3:2, export 1500 by 1000 PNG): artist name, the two route lists side by side (LLM's cities struck through in red pencil, Qloo's route in ink with sleeper stops in ultramarine), and the "83 vs 72" pair. At most 8 words of copy besides city names. Must read at 300 by 200: test by downscaling.
- **Gallery images** (3:2, 1500 by 1000, up to 6): 1 the verdict, 2 route strip plus map, 3 the trace with one heatmap call highlighted, 4 opener overlap by market, 5 sponsors with local leads, 6 the printable brief. Each has a one line caption bar on top in the display face stating the takeaway, not the feature name ("Burlington, VT: the sleeper market the LLM never named").
- **README hero**: gallery image 1. Keep the fixture caption until live data replaces it.
- **Video cards** (1920 by 1080): title card is the thumbnail layout at 16:9. Lower thirds sit on a `--sheet` band with a 2px ink rule, Archivo 700 caps label plus a Plex Mono number, bottom left, 64px safe margin, on screen for at least 3 seconds. Every spoken number is also on screen. End card: "Headliner. Tour decisions on taste data, not guesswork." plus the live URL and "Built on Qloo".
- **Fixture rule**: until the key is live, every asset that shows Qloo numbers carries the stamp "Fixture data, illustrative". Final assets are re-shot in live mode.

## 7. Do and don't

Do:
- Lead with the verdict and the route.
- Use ink, paper and two data colours.
- Name the source of every number.
- Write labels the way a tour manager talks: "dates", "rooms", "drive", "opener", "sleeper".
- Test at 1440 by 900, 1280 by 800 and 390 by 844 before every commit that touches UI.

Don't:
- No gradients, glows, glassmorphism or box shadows.
- No rounded cards inside rounded cards. A section is a rule and a heading, not a box.
- No emoji or decorative icons. Use stop numbers, tier marks and words.
- No Inter, no system font stack as the design, no Arial Black.
- No new hues for new features. Fold them into ink, neutrals or the two data colours.
- No purple, no cream with terracotta.
- No paragraph of marketing copy above the run bar. One line of who it is for is enough.
- Never change scoring, data or behaviour in a design commit.

## Appendix: tokens for the other directions

Both pass the same contrast and validator checks (computed 15 Oct 2026).

**B, "Front of house"** (console, dark first). Fonts: Barlow Condensed 600 (labels, like scribble strips), Barlow 400 (body), JetBrains Mono (data).

| Token | Dark | Light |
|---|---|---|
| deck (page) | `#0B0C0E` | `#E9EBEE` |
| strip (surface) | `#15171B` | `#FFFFFF` |
| strip-2 (inset) | `#1E2126` | `#F3F4F6` |
| line | `#2B2F36` | `#D3D7DD` |
| text / text-2 / text-3 | `#E9EBEE` 16.4:1, `#A9AFB9` 8.9:1, `#868D99` 4.8:1 on inset | `#0F1114` 15.8:1, `#464C55` 7.3:1, `#626973` 4.6:1 |
| qloo mark / qloo text | `#C08300` / `#FFB733` 11.3:1 | `#A36D00` / `#7A5200` 5.8:1 |
| llm mark / llm text | `#5A8CF0` / `#8FB0FF` 9.2:1 | `#3F6FD6` / `#2A55B0` 5.8:1 |
| neutral mark / LED off | `#6A717D` / `#23262C` | `#80868F` / `#E1E4E8` |

**C, "Tour poster"** (riso print, light first). Fonts: Big Shoulders Display 900 (poster type), Instrument Sans (body), Space Mono (data).

| Token | Light | Dark |
|---|---|---|
| paper / sheet / sunk | `#FAFAF7` / `#FFFFFF` / `#F0F0EC` | `#111111` / `#1A1A1A` / `#232323` |
| ink / ink-2 / ink-3 | `#0D0D0D` 18.6:1, `#3D3D3D` 10.4:1, `#616161` 5.9:1 | `#F5F5F2` 17.3:1, `#C2C2BE` 10.6:1, `#929290` 6.1:1 |
| qloo (fluoro pink) mark / text | `#E6007E` / `#B00060` 6.7:1 | `#E8429A` / `#FF8CC6` 8.8:1 |
| llm (riso blue) mark / text | `#0078BF` / `#005A91` 7.0:1 | `#2E8AD8` / `#8CC8FF` 10.6:1 |
| neutral mark | `#858585` 3.5:1 | `#77777A` 4.2:1 |
