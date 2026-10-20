/**
 * Screen recording for the narrated demo: drives the LIVE site in headless Chromium and saves
 * screencast frames with timestamps. Every hover/scroll/click is cued on a word of the narration
 * (timeline.json from narrated.py plan), so the picture follows the voice.
 *
 *   NODE_PATH=node_modules npx tsx scripts/video/record.ts <timeline.json> <framesDir>
 *
 * 1536x864 CSS px at deviceScaleFactor 1.25 = 1920x1080 frames. No keys are involved: the page
 * only talks to the public deployment.
 */
import { chromium, type Page } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const SITE = process.env.SITE ?? "https://headliner-qloo-eta.vercel.app";
const CHROME =
  process.env.CHROME ??
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const [tlPath, framesDir] = process.argv.slice(2);
const tl = JSON.parse(fs.readFileSync(tlPath, "utf8"));
const B: number = tl.browserStart;
const SPAN: number = tl.endCard - B;
const lines: Record<string, { start: number; dur: number; words: { w: string; t: number }[] }> = Object.fromEntries(
  tl.lines.map((l: any) => [l.id, l]),
);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
/** Recording time (s since browserStart) of the nth word in a line starting with `prefix`. */
function at(id: string, prefix: string, nth = 0, off = 0): number {
  const l = lines[id];
  if (!prefix) return l.start - B + off;
  const hits = l.words.filter((w) => norm(w.w).startsWith(norm(prefix)));
  if (!hits[nth]) throw new Error(`cue word "${prefix}" #${nth} not in line ${id}`);
  return l.start + hits[nth].t - B + off;
}

const CURSOR = `
globalThis.__name = globalThis.__name || ((f) => f);
(() => {
  const mk = () => {
    if (document.getElementById('__cur')) return;
    const c = document.createElement('div'); c.id = '__cur';
    c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2 L4 19 L8.5 14.8 L11.6 21.5 L14.4 20.3 L11.3 13.7 L17.5 13.7 Z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, {position:'fixed', left:'0', top:'0', zIndex:'2147483647', pointerEvents:'none', transform:'translate(-200px,-200px)', filter:'drop-shadow(0 1px 2px rgba(0,0,0,.35))'});
    document.documentElement.appendChild(c);
    const p = (window as any).__curPos; if (p) c.style.transform = 'translate(' + (p[0]-4) + 'px,' + (p[1]-2) + 'px)';
  };
  document.addEventListener('mousemove', e => { (window as any).__curPos = [e.clientX, e.clientY]; mk(); const c = document.getElementById('__cur'); if (c) c.style.transform = 'translate(' + (e.clientX-4) + 'px,' + (e.clientY-2) + 'px)'; }, true);
  if (document.readyState !== 'loading') mk(); else document.addEventListener('DOMContentLoaded', mk);
})();`.replace(/ as any/g, "");

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME });
  const ctx = await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25 });
  await ctx.addInitScript(CURSOR);
  // Warm the serverless function and the cached run first, so the on-camera click replays at once.
  for (let i = 0; i < 2; i++) {
    const warm = await ctx.newPage();
    const t = Date.now();
    await warm.goto(`${SITE}/?artist=Tyler%20Childers&region=north-america`, { waitUntil: "networkidle" });
    await warm.waitForSelector("section[aria-labelledby=vs-h]", { timeout: 90000 });
    console.log(`warm-up ${i + 1}: result in ${((Date.now() - t) / 1000).toFixed(1)}s`);
    await warm.close();
  }
  const page = await ctx.newPage();
  await page.goto(SITE, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);

  let mouse = { x: 760, y: 560 };
  await page.mouse.move(mouse.x, mouse.y);

  // Screencast -> numbered JPEGs + frames.json (t = seconds since browserStart).
  const cdp = await ctx.newCDPSession(page);
  const log: { f: string; t: number }[] = [];
  let n = 0;
  let T0 = 0;
  cdp.on("Page.screencastFrame", async (e: any) => {
    const f = `${String(n++).padStart(5, "0")}.jpg`;
    fs.writeFileSync(path.join(framesDir, f), Buffer.from(e.data, "base64"));
    log.push({ f, t: +(e.metadata.timestamp - T0).toFixed(4) });
    cdp.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => {});
  });
  const startCast = () =>
    cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  T0 = Date.now() / 1000;
  await startCast();
  // nudge a repaint so there is a frame at t=0
  await page.mouse.move(mouse.x + 1, mouse.y);

  const now = () => Date.now() / 1000 - T0;
  const late: string[] = [];
  async function cue(t: number, label: string, fn: () => Promise<unknown>) {
    const wait = t - now();
    if (wait > 0) await page.waitForTimeout(wait * 1000);
    else if (wait < -0.25) late.push(`${label} late by ${(-wait).toFixed(2)}s`);
    try {
      await fn();
    } catch (e) {
      late.push(`${label} FAILED: ${String(e).split("\n")[0]}`);
    }
  }

  // ---- helpers -------------------------------------------------------------------------------
  const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  async function moveTo(x: number, y: number, ms = 650) {
    const steps = Math.max(6, Math.round(ms / 22));
    const a = { ...mouse };
    for (let i = 1; i <= steps; i++) {
      const k = ease(i / steps);
      await page.mouse.move(a.x + (x - a.x) * k, a.y + (y - a.y) * k);
    }
    mouse = { x, y };
  }
  async function hover(sel: string, opts: { dx?: number; dy?: number; ms?: number; nth?: number; left?: boolean } = {}) {
    const loc = page.locator(sel).nth(opts.nth ?? 0);
    const b = await loc.boundingBox();
    if (!b) throw new Error(`no box for ${sel}`);
    const x = (opts.left ? b.x + Math.min(40, b.width / 2) : b.x + b.width / 2) + (opts.dx ?? 0);
    await moveTo(x, b.y + b.height / 2 + (opts.dy ?? 0), opts.ms);
  }
  /** Centre of the first occurrence of `text` inside `root` (a text-node range, so it works mid-sentence). */
  async function hoverText(root: string, text: string, ms = 650, nth = 0) {
    const r = await page.evaluate(
      ([root, text, nth]) => {
        const roots = Array.from(document.querySelectorAll(root as string));
        let seen = 0;
        for (const el of roots) {
          const it = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          let node: Node | null;
          while ((node = it.nextNode())) {
            const i = (node.textContent ?? "").indexOf(text as string);
            if (i >= 0) {
              if (seen++ < (nth as number)) continue;
              const rg = document.createRange();
              rg.setStart(node, i);
              rg.setEnd(node, i + (text as string).length);
              const b = rg.getBoundingClientRect();
              return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
            }
          }
        }
        return null;
      },
      [root, text, nth],
    );
    if (!r) throw new Error(`text "${text}" not found in ${root}`);
    await moveTo(r.x, r.y, ms);
  }
  /** Smooth page scroll so `sel` sits `off` px from the top. */
  async function scrollTo(sel: string, off = 16, ms = 1000) {
    await page.evaluate(
      ([sel, off, ms]) =>
        new Promise<void>((res) => {
          const el = document.querySelector(sel as string)!;
          const y0 = scrollY;
          const y1 = Math.max(0, el.getBoundingClientRect().top + scrollY - (off as number));
          const t0 = performance.now();
          const e = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
          const f = (t: number) => {
            const k = Math.min(1, (t - t0) / (ms as number));
            scrollTo(0, y0 + (y1 - y0) * e(k));
            k < 1 ? requestAnimationFrame(f) : res();
          };
          requestAnimationFrame(f);
        }),
      [sel, off, ms],
    );
  }
  async function scrollBy(dy: number, ms = 1500) {
    await page.evaluate(
      ([dy, ms]) =>
        new Promise<void>((res) => {
          const y0 = scrollY;
          const t0 = performance.now();
          const e = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
          const f = (t: number) => {
            const k = Math.min(1, (t - t0) / ms);
            scrollTo(0, y0 + dy * e(k));
            k < 1 ? requestAnimationFrame(f) : res();
          };
          requestAnimationFrame(f);
        }),
      [dy, ms],
    );
  }
  /** Smooth-scroll the trace panel so step `idx` (0-based) is at its top. */
  async function traceTo(idx: number, ms = 900) {
    await page.evaluate(
      ([idx, ms]) =>
        new Promise<void>((res) => {
          const body = document.querySelector(".trace-body") as HTMLElement;
          const step = body.querySelectorAll(".step")[idx as number] as HTMLElement;
          const y0 = body.scrollTop;
          const y1 = y0 + step.getBoundingClientRect().top - body.getBoundingClientRect().top - 8;
          const t0 = performance.now();
          const e = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
          const f = (t: number) => {
            const k = Math.min(1, (t - t0) / (ms as number));
            body.scrollTop = y0 + (y1 - y0) * e(k);
            k < 1 ? requestAnimationFrame(f) : res();
          };
          requestAnimationFrame(f);
        }),
      [idx, ms],
    );
  }
  const llmRow = (city: string) => `.vs-col.llm li:has-text("${city}")`;
  const qRow = (city: string) => `.vs-col.qloo li:has-text("${city}")`;

  // ---- choreography (each step cued on a narrated word) -------------------------------------------
  // problem: the pitch line at the top of the page
  await cue(at("problem", "", 0, 0.6), "problem", () => hoverText(".hero, header, body", "multi-million-dollar bet", 1600));
  await cue(at("problem", "rooms"), "rooms", () => hover('input[aria-label="Number of dates"]', { ms: 900 }));
  await cue(at("problem", "sponsors"), "sponsors", () => hoverText("body", "which brands pay for it", 900));
  await cue(at("problem", "gut"), "gut", () => moveTo(900, 470, 900));
  // what: the three decisions, then the plain-LLM fact-check promise
  await cue(at("what", "clues", 0, -0.3), "taste graph", () => hoverText("body", "taste", 800));
  await cue(at("what", "where"), "where", () => hoverText("body", "where to play", 600));
  await cue(at("what", "who"), "who opens", () => hoverText("body", "who opens", 500));
  await cue(at("what", "pays"), "pays", () => hoverText("body", "which brands pay for it", 500));
  await cue(at("what", "shows"), "plain llm", () => hoverText(".empty-state", "fact-checks a plain LLM", 900));
  // click: Tyler Childers
  await cue(at("click", "show"), "to chip", () => hover('button.chip:has-text("Tyler Childers")', { ms: 900, left: true }));
  await cue(at("click", "tyler"), "click", async () => {
    await page.mouse.down();
    await page.mouse.up();
  });
  await page.waitForSelector("section[aria-labelledby=vs-h]", { timeout: 30000 });
  // llm: the plain LLM's column, scored by Qloo
  await cue(at("llm", "", 0, -0.7), "scroll vs", () => scrollTo("section[aria-labelledby=vs-h]", 12, 900));
  await cue(at("llm", "left", 0, 0.2), "llm who", () => hover(".vs-col.llm .who", { ms: 700, left: true }));
  await cue(at("llm", "claude"), "haiku", () => hoverText(".vs-col.llm .who", "CLAUDE", 600).catch(() => hoverText(".vs-col.llm .who", "claude", 600)));
  await cue(at("llm", "cached", 0, -0.2), "cached", () => hoverText(".vs-col.llm .who", "cached answer", 600).catch(() => hover(".vs-col.llm .who", { ms: 600 })));
  await cue(at("llm", "philadelphia"), "phl", () => hover(llmRow("Philadelphia"), { left: true, ms: 600 }));
  await cue(at("llm", "boston"), "bos", () => hover(llmRow("Boston"), { left: true, ms: 400 }));
  await cue(at("llm", "toronto"), "tor", () => hover(llmRow("Toronto"), { left: true, ms: 400 }));
  await cue(at("llm", "75"), "75", () => hover(`${llmRow("Philadelphia")} .v`, { dx: 14, ms: 600 }));
  await cue(at("llm", "86"), "86", () => hover(`${llmRow("Boston")} .v`, { dx: 14, ms: 400 }));
  await cue(at("llm", "57"), "57", () => hover(`${llmRow("Toronto")} .v`, { dx: 14, ms: 400 }));
  // qloo: the Qloo column and the verdict pair
  await cue(at("qloo", "on"), "qloo who", () => hover(".vs-col.qloo .who", { ms: 800, left: true }));
  await cue(at("qloo", "asheville"), "asheville", () => hover(qRow("Asheville"), { left: true, ms: 500 }));
  await cue(at("qloo", "98"), "98", () => hover(`${qRow("Asheville")} .v`, { dx: 10, ms: 500 }));
  await cue(at("qloo", "never"), "sweep", () => hover(qRow("Boulder"), { left: true, ms: 1200 }));
  await cue(at("qloo", "overall", 0, -0.2), "96", () => hover(".score-col .n.q", { ms: 700 }));
  await cue(at("qloo", "86"), "86", () => hover(".score-col .n.l", { ms: 500 }));
  // trace: heatmap call, then the per-city calls, then the request count
  await cue(at("trace", "over"), "trace head", () => hover(".trace-head h2", { ms: 800 }));
  await cue(at("trace", "every"), "trace top", async () => {
    await traceTo(3, 900);
    await hover(".trace-body .step >> nth=3", { ms: 600 });
  });
  await cue(at("trace", "heat", 0, -0.1), "heatmap call", () => hoverText(".trace-body", "urn:heatmap", 600));
  await cue(at("trace", "then"), "rank cities", async () => {
    await traceTo(4, 800);
    await hoverText(".trace-body", "signal.location.query", 500, 0);
  });
  await cue(at("trace", "59"), "59", () => hoverText(".trace-head", "requests", 600));
  await cue(at("trace", "replayed"), "replayed", () => hover(".trace-head .badge", { ms: 500 }));
  // route: the date stack and real rooms
  await cue(at("route", "so", 0, -0.1), "scroll route", () => scrollTo("section[aria-labelledby=route-h]", 12, 1100));
  await cue(at("route", "asheville"), "d1", () => hover(".date >> nth=0", { left: true, ms: 500, dy: -10 }));
  await cue(at("route", "knoxville"), "d3", () => hover(".date >> nth=2", { left: true, ms: 400, dy: -10 }));
  await cue(at("route", "lexington"), "d4", () => hover(".date >> nth=3", { left: true, ms: 500, dy: -10 }));
  await cue(at("route", "louisville"), "d6", () => hover(".date >> nth=5", { left: true, ms: 500, dy: -10 }));
  await cue(at("route", "orange", 0, -0.3), "orange peel", () => hoverText(".date .room", "The Orange Peel", 600));
  await cue(at("route", "rupp", 0, -0.2), "rupp", () => hoverText(".date .room", "Rupp Arena", 600));
  // map: LLM rings and the sleeper bar
  await cue(at("map", "", 0, -0.45), "scroll map", () => scrollBy(330, 700));
  await cue(at("map", "blue"), "ring", async () => {
    const r = await page.evaluate(() => {
      const p = Array.from(document.querySelectorAll(".leaflet-container path")).filter((e) => e.getAttribute("stroke-dasharray"));
      const b = p.map((e) => e.getBoundingClientRect()).sort((a, b) => b.x - a.x)[0];
      return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null;
    });
    if (r) await moveTo(r.x, r.y, 800);
  });
  await cue(at("map", "picks", 0, -0.2), "legend llm", () => hoverText(".legend", "plain-LLM pick", 600));
  await cue(at("map", "pink"), "sleeper bar", () => hover('.bar-row:has-text("Charlottesville")', { ms: 700, dx: 40 }));
  await cue(at("map", "fans"), "legend sleeper", () => hoverText(".legend", "sleeper", 700));
  await cue(at("map", "smaller", 0, -0.3), "back to bar", () => hover('.bar-row:has-text("Charlottesville")', { ms: 600, dx: 40 }));
  // support: candidates, per-market overlap, the shared-taste tags
  await cue(at("support", "who", 0, -0.1), "scroll sa", () => scrollTo("section[aria-labelledby=sa-h]", 12, 1100));
  await cue(at("support", "artists"), "candidates", () => hoverText("section[aria-labelledby=sa-h] .sub", "artists the headliner", 700));
  await cue(at("support", "kept"), "popularity", () => hoverText("section[aria-labelledby=sa-h] .sub", "popularity", 700));
  await cue(at("support", "re"), "table", () => hoverText("section[aria-labelledby=sa-h]", "BY MARKET", 800).catch(() => hoverText("section[aria-labelledby=sa-h]", "by market", 800)));
  await cue(at("support", "city", 0, 0.1), "row sweep", () => hoverText("section[aria-labelledby=sa-h] table", "98.4", 900));
  await cue(at("support", "charlie"), "crockett", () => hoverText("section[aria-labelledby=sa-h]", "Charley Crockett", 700, 1).catch(() => hoverText("section[aria-labelledby=sa-h]", "Charley Crockett", 700)));
  await cue(at("support", "clues", 0, -0.2), "compare", () => hoverText("section[aria-labelledby=sa-h]", "Shared taste", 800));
  await cue(at("support", "acoustic"), "chip ag", () => hoverText("section[aria-labelledby=sa-h]", "Acoustic Guitar", 500));
  await cue(at("support", "folk"), "chip folk", () => hoverText("section[aria-labelledby=sa-h]", "Folk", 400));
  await cue(at("support", "blues"), "chip blues", () => hoverText("section[aria-labelledby=sa-h]", "Blues", 400));
  await cue(at("support", "country"), "chip country", () => hoverText("section[aria-labelledby=sa-h]", "Country", 400));
  // sponsors: cross-domain brands and a local lead
  await cue(at("sponsors", "and", 0, -0.1), "scroll sp", () => scrollTo("section[aria-labelledby=sp-h]", 12, 1000));
  await cue(at("sponsors", "clue"), "graph", () => hoverText("section[aria-labelledby=sp-h]", "cross-domain graph", 700));
  await cue(at("sponsors", "twisted", 0, -0.2), "twisted tea", () => hoverText("section[aria-labelledby=sp-h]", "Twisted Tea", 700));
  await cue(at("sponsors", "local"), "local leads", () => hoverText("section[aria-labelledby=sp-h]", "Ole Smoky Distillery", 700));
  // brief: the brief card, then the printable page
  await cue(at("brief", "", 0, -0.15), "scroll brief", () => scrollTo("section[aria-labelledby=brief-h]", 12, 1000));
  await cue(at("brief", "one", 0, -0.3), "open brief btn", () => hover('a:has-text("Open printable brief")', { ms: 600 }));
  await cue(at("brief", "spreadsheet", 0, -0.2), "csv btn", () => hover('a:has-text("Download CSV")', { ms: 450 }));
  const href = await page.locator('a[href^="/brief/"]').first().getAttribute("href");
  await cue(at("brief", "ready", 0, 0.1), "goto brief", async () => {
    await page.goto(SITE + href, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    await startCast().catch(() => {});
    await page.mouse.move(mouse.x, mouse.y);
    await page.waitForTimeout(700);
    await scrollBy(300, 2600);
  });
  await page.waitForTimeout(Math.max(0, (SPAN + 0.6 - now()) * 1000));
  await cdp.send("Page.stopScreencast").catch(() => {});
  await page.waitForTimeout(300);
  fs.writeFileSync(path.join(framesDir, "frames.json"), JSON.stringify(log));
  console.log(`${log.length} frames over ${now().toFixed(1)}s (span ${SPAN.toFixed(1)}s)`);
  if (late.length) console.log("LATE CUES:\n  " + late.join("\n  "));
  await browser.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
