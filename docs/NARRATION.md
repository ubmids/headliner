# Headliner: narrated demo script

First-person voiceover in Subomi's approved ElevenLabs voice (model eleven_v4, voice Olaniyi Victor, stability 0.3 / similarity 0.7 / style 0.35, speaker boost off). Screen footage is a headless Chromium recording of the live site, https://headliner-qloo-eta.vercel.app, with the Tyler Childers sample (live Qloo data; that run is pre-recorded on the host, so the click replays it). Every number spoken is on screen when it is said.

- Length: 153.3 s (2:33.3)
- Narration: 13 lines, 1865 characters
- Source of truth: `scripts/video/lines.json`; rebuild with `python3 scripts/video/narrated.py all` (cached audio, no credits spent)

## Shot list

| Starts | On screen | Voiceover |
|---|---|---|
| 0:00.4 | Title card (docs/video/title.png) | Hey, I'm Subomi. This is Headliner, my entry for the Qloo hackathon. |
| 0:06.5 | Home page, cursor along the pitch line | So, a headline tour is a big bet. Rooms booked months ahead, an opening act, sponsors who want to know who's actually in the crowd. And a lot of that still comes down to gut feel. |
| 0:20.5 | The three bold decisions in the pitch line, then the intro card | Headliner is an agent that makes those calls from Qloo's taste graph. Where to play, who opens, and who pays. And it shows you what a plain LLM would have said instead. |
| 0:32.5 | Click Try a sample: Tyler Childers | Let me show you. I'll click Tyler Childers. |
| 0:38.0 | Without Qloo column: model label (cached answer, recorded 2026-10-16), then Philadelphia 75, Boston 86, Toronto 57 (rank 19 of 19) | On the left, a plain LLM. Claude Haiku, same question, no data, and yes, it's a cached answer. It sends Tyler to Philadelphia, Boston and Toronto. Qloo scores those seventy-five, eighty-six, fifty-seven. |
| 0:55.5 | With Qloo column: Asheville 98, the pink stops, then 96 vs 86 (lower third overlay) | On the right, the Qloo route. It opens in Asheville, a ninety-eight, which the LLM never named. Overall, ninety-six against eighty-six. |
| 1:06.7 | Reasoning trace: heatmap call (urn:heatmap), per-city signal.location.query calls, 59 requests, REPLAYED FROM CACHE badge | Over here is the reasoning trace. Every line is a real Qloo call, with the reason it was made. A heatmap of where his fans are, then every city scored. Fifty-nine requests, replayed from cache here, so it's instant. |
| 1:22.7 | Routing date stack; The Orange Peel (Asheville), Rupp Arena (Lexington) | So, the routing. Asheville, Knoxville, Lexington, Louisville. Kind of the heartland you'd hope for, with real rooms from Qloo, like the Orange Peel and Rupp Arena. |
| 1:34.6 | Map: blue dashed LLM rings; ranked list: Charlottesville pink sleeper bar (93) | The blue dashed rings are the LLM's picks. And that pink bar is a sleeper, Charlottesville. Fans over-index for its size, so you play a smaller room and sell it out. |
| 1:46.6 | Support act cards, per-market overlap table, Charley Crockett, shared-taste chips | Who opens? Artists his fans already love, kept below his popularity, then re-ranked city by city. Charley Crockett comes out on top, and Qloo's comparison shows why. Acoustic guitar, folk, blues, country. |
| 2:04.1 | Sponsors: cross-domain graph line, Twisted Tea, local lead Ole Smoky Distillery (Knoxville) | And who pays. Qloo shows what this crowd actually buys. Twisted Tea tour-wide, and local leads like Ole Smoky Distillery in Knoxville. You can't guess that. |
| 2:16.9 | Tour brief card (Open printable brief, Download CSV), then the printable brief page | Then it all goes into a one-page brief and a spreadsheet, ready for the meeting. |
| 2:25.6 | End card (docs/video/end.png) | So that's Headliner. Tour decisions on taste data, not guesswork. Thanks for watching. |

## Full script

Hey, I'm Subomi. This is Headliner, my entry for the Qloo hackathon.

So, a headline tour is a big bet. Rooms booked months ahead, an opening act, sponsors who want to know who's actually in the crowd. And a lot of that still comes down to gut feel.

Headliner is an agent that makes those calls from Qloo's taste graph. Where to play, who opens, and who pays. And it shows you what a plain LLM would have said instead.

Let me show you. I'll click Tyler Childers.

On the left, a plain LLM. Claude Haiku, same question, no data, and yes, it's a cached answer. It sends Tyler to Philadelphia, Boston and Toronto. Qloo scores those seventy-five, eighty-six, fifty-seven.

On the right, the Qloo route. It opens in Asheville, a ninety-eight, which the LLM never named. Overall, ninety-six against eighty-six.

Over here is the reasoning trace. Every line is a real Qloo call, with the reason it was made. A heatmap of where his fans are, then every city scored. Fifty-nine requests, replayed from cache here, so it's instant.

So, the routing. Asheville, Knoxville, Lexington, Louisville. Kind of the heartland you'd hope for, with real rooms from Qloo, like the Orange Peel and Rupp Arena.

The blue dashed rings are the LLM's picks. And that pink bar is a sleeper, Charlottesville. Fans over-index for its size, so you play a smaller room and sell it out.

Who opens? Artists his fans already love, kept below his popularity, then re-ranked city by city. Charley Crockett comes out on top, and Qloo's comparison shows why. Acoustic guitar, folk, blues, country.

And who pays. Qloo shows what this crowd actually buys. Twisted Tea tour-wide, and local leads like Ole Smoky Distillery in Knoxville. You can't guess that.

Then it all goes into a one-page brief and a spreadsheet, ready for the meeting.

So that's Headliner. Tour decisions on taste data, not guesswork. Thanks for watching.
