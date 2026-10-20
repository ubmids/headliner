"""Narrated demo video for Headliner, built from cached ElevenLabs lines.

    python3 scripts/video/narrated.py voice     # generate missing lines (spends credits once, cached)
    python3 scripts/video/narrated.py plan      # timeline.json from line durations + whisper word times
    python3 scripts/video/narrated.py record    # drive the live site in headless Chromium, capture frames
    python3 scripts/video/narrated.py build     # mix narration, retime, captions, export mp4 + srt
    python3 scripts/video/narrated.py all       # plan, record, build (no voice spend if cached)

Audio cache, frames and outputs live OUTSIDE git (default ~/Desktop/hackathons/headliner-video).
The narration text is scripts/video/lines.json; docs/NARRATION.md is its readable copy.
The recorder (record.ts) cues every hover and scroll on a word in the narration, so a retaken
line re-times the footage automatically after `plan` + `record`.
"""
import json
import os
import pathlib
import shutil
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent
OUT = pathlib.Path(os.environ.get("HEADLINER_VIDEO_DIR", pathlib.Path.home() / "Desktop/hackathons/headliner-video"))
VOICE = OUT / "voice"
WORK = OUT / "work"
LINES = json.loads((HERE / "lines.json").read_text())

GAP = 0.45            # silence between lines
LEAD = 0.4            # title card before the first word
AFTER = {"click": 1.6, "brief": 3.2}   # extra room: result loads after the click; brief page after "brief"
FPS = 30
W, H = 1920, 1080


def sh(*cmd, **kw):
    return subprocess.run([str(c) for c in cmd], check=True, **kw)


def dur(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def voice():
    sys.path.insert(0, str(HERE))
    from voice import line, spent
    for l in LINES:
        print(l["id"], line(l["text"], VOICE).name)
    print("characters spent (ledger):", spent(VOICE))


def mp3(l):
    sys.path.insert(0, str(HERE))
    from voice import _key
    p = VOICE / f"{_key(l['text'])}.mp3"
    if not p.exists():
        raise SystemExit(f"missing audio for {l['id']}: run `voice` first")
    return p


def words(p):
    """Word start times from whisper (base.en, local); cached next to the audio."""
    j = VOICE / "words" / (p.stem + ".json")
    if not j.exists():
        sh("whisper", p, "--model", "base.en", "--language", "en", "--word_timestamps", "True",
           "--output_format", "json", "--output_dir", j.parent, "--fp16", "False", capture_output=True)
    d = json.loads(j.read_text())
    return [{"w": w["word"].strip(), "t": round(w["start"], 2)} for s in d["segments"] for w in s["words"]]


def plan():
    t = LEAD
    tl = []
    for l in LINES:
        p = mp3(l)
        d = dur(p)
        tl.append({"id": l["id"], "text": l["text"], "audio": str(p), "start": round(t, 3), "dur": d, "words": words(p)})
        t += d + GAP + AFTER.get(l["id"], 0)
    by = {x["id"]: x for x in tl}
    browser_start = by["problem"]["start"] - 0.3       # cut from title card to the site
    end_card = by["close"]["start"] - 0.4               # cut from the brief page to the end card
    total = by["close"]["start"] + by["close"]["dur"] + 1.0
    WORK.mkdir(parents=True, exist_ok=True)
    (WORK / "timeline.json").write_text(json.dumps(
        {"lines": tl, "browserStart": browser_start, "endCard": end_card, "total": round(total, 3)}, indent=1))
    print(f"timeline: {len(tl)} lines, browser {browser_start:.2f}-{end_card:.2f}s, total {total:.2f}s")


def record():
    frames = WORK / "frames"
    if frames.exists():
        shutil.rmtree(frames)
    frames.mkdir(parents=True)
    env = dict(os.environ, NODE_PATH=str(REPO / "node_modules"))
    sh("npx", "tsx", HERE / "record.ts", WORK / "timeline.json", frames, cwd=REPO, env=env)


def build():
    tl = json.loads((WORK / "timeline.json").read_text())
    B, E, T = tl["browserStart"], tl["endCard"], tl["total"]
    frames = WORK / "frames"
    log = json.loads((frames / "frames.json").read_text())   # [{f, t}] t = seconds since browserStart
    # 1. Browser clip: variable-rate screencast frames -> constant 30 fps, exactly E-B seconds.
    span = E - B
    rows = [r for r in log if r["t"] < span]
    first = max([r for r in log if r["t"] <= 0] or [rows[0]], key=lambda r: r["t"])
    rows = [first] + [r for r in rows if r["t"] > 0]
    lst = WORK / "frames.txt"
    with lst.open("w") as f:
        for i, r in enumerate(rows):
            t0 = max(r["t"], 0)
            t1 = rows[i + 1]["t"] if i + 1 < len(rows) else span
            f.write(f"file '{frames / r['f']}'\nduration {max(t1 - t0, 0.001):.4f}\n")
        f.write(f"file '{frames / rows[-1]['f']}'\n")
    browser = WORK / "browser.mp4"
    sh("ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst,
       "-vf", f"scale={W}:{H}:flags=lanczos:in_range=pc:out_range=tv,fps={FPS},format=yuv420p", "-t", f"{span:.3f}",
       "-c:v", "libx264", "-preset", "medium", "-crf", "16", browser)

    # 2. Narration track: every line placed at its start time.
    inputs, parts = [], []
    for i, l in enumerate(tl["lines"]):
        inputs += ["-i", l["audio"]]
        ms = int(round(l["start"] * 1000))
        parts.append(f"[{i}:a]aresample=48000,adelay={ms}|{ms}[a{i}]")
    n = len(tl["lines"])
    mix = ";".join(parts) + ";" + "".join(f"[a{i}]" for i in range(n)) + \
        f"amix=inputs={n}:normalize=0,apad,atrim=0:{T:.3f},loudnorm=I=-16:TP=-1.5:LRA=11[aout]"
    narr = WORK / "narration.wav"
    sh("ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", mix, "-map", "[aout]", "-ar", "48000", narr)

    # 3. Picture: title card -> browser clip (+ lower third under the verdict) -> end card.
    by = {x["id"]: x for x in tl["lines"]}
    q = by["qloo"]
    ov = next(w["t"] for w in q["words"] if w["w"].lower().startswith("overall"))
    lt0, lt1 = q["start"] + ov - 0.3, q["start"] + q["dur"] + 0.3
    vid = REPO / "docs" / "video"
    final = OUT / "headliner-narrated.mp4"
    fc = (
        f"[0:v]scale={W}:{H},fps={FPS},format=yuv420p,trim=duration={B:.3f},setpts=PTS-STARTPTS[t];"
        f"[1:v]setpts=PTS-STARTPTS[b];"
        f"[2:v]scale={W}:{H},fps={FPS},format=yuv420p,trim=duration={T - E:.3f},setpts=PTS-STARTPTS[e];"
        f"[t][b][e]concat=n=3:v=1:a=0[v0];"
        f"[3:v]format=rgba,fade=t=in:st={lt0:.2f}:d=0.3:alpha=1,fade=t=out:st={lt1 - 0.3:.2f}:d=0.3:alpha=1[lt];"
        f"[v0][lt]overlay=0:0:enable='between(t,{lt0:.2f},{lt1:.2f})',format=yuv420p[v]"
    )
    sh("ffmpeg", "-y", "-loglevel", "error",
       "-loop", "1", "-framerate", str(FPS), "-t", f"{B:.3f}", "-i", vid / "title.png",
       "-i", browser,
       "-loop", "1", "-framerate", str(FPS), "-t", f"{T - E:.3f}", "-i", vid / "end.png",
       "-loop", "1", "-framerate", str(FPS), "-t", f"{T:.3f}", "-i", vid / "lower-third.png",
       "-i", narr,
       "-filter_complex", fc, "-map", "[v]", "-map", "4:a",
       "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-profile:v", "high", "-pix_fmt", "yuv420p", "-color_range", "tv",
       "-c:a", "aac", "-b:a", "160k", "-t", f"{T:.3f}", "-movflags", "+faststart", final)

    # 4. Captions: one cue per sentence, timed from the whisper word starts, text exactly as narrated.
    srt = OUT / "headliner-narrated.srt"
    cues = []
    for l in tl["lines"]:
        cues += sentence_cues(l)
    with srt.open("w") as f:
        for i, (a, b, text) in enumerate(cues, 1):
            f.write(f"{i}\n{ts(a)} --> {ts(b)}\n{text}\n\n")
    print("wrote", final, f"{dur(final):.2f}s", f"{final.stat().st_size / 1e6:.1f} MB")
    print("wrote", srt, len(cues), "cues")


def sentence_cues(l):
    """Split a line into sentences; each cue starts at its first word (whisper) and ends at the next."""
    import difflib
    import re
    tok = lambda s: [t.lower() for t in re.findall(r"[A-Za-z0-9']+", s)]
    sents = [s for s in re.split(r"(?<=[.?!])\s+", l["text"]) if s]
    wt, wtime = [], []                       # whisper tokens with their start times
    for w in l["words"]:
        for t in tok(w["w"]):
            wt.append(t)
            wtime.append(w["t"])
    st, sent_of = [], []                     # script tokens, and the sentence each starts
    for i, s in enumerate(sents):
        for j, t in enumerate(tok(s)):
            st.append(t)
            sent_of.append(i if j == 0 else None)
    m = {}
    for a, b, n in difflib.SequenceMatcher(None, st, wt, autojunk=False).get_matching_blocks():
        for k in range(n):
            m[a + k] = b + k
    starts = []
    for i in range(len(sents)):
        k0 = sent_of.index(i)
        k = next((k for k in range(k0, len(st)) if k in m), None)
        if k is not None and (k - k0) < 3:
            starts.append(l["start"] + wtime[m[k]])
        else:                                # proportional fallback
            starts.append(l["start"] + l["dur"] * k0 / max(len(st), 1))
    end = l["start"] + l["dur"]
    out = []
    for i, s in enumerate(sents):
        b = starts[i + 1] - 0.05 if i + 1 < len(sents) else end
        out.append((starts[i], b, s))
    return out


def ts(s):
    ms = int(round(s * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "all"
    {"voice": voice, "plan": plan, "record": record, "build": build,
     "all": lambda: (plan(), record(), build())}[cmd]()
