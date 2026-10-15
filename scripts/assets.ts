/**
 * Submission assets in the Tour poster design (design/DESIGN.md, section 6), rendered from a running Headliner:
 *   docs/gallery/thumbnail.png (1500x1000) + thumbnail-300.png (the 300x200 check)
 *   docs/gallery/01-verdict.png … 06-brief.png (1500x1000, caption band + real screen)
 *   docs/video/title.png, lower-third.png (transparent), end.png (1920x1080)
 * Every number comes from a real run's JSON (/api/run/:id). In fixture mode every asset carries the fixture stamp.
 *   CHROME=/path/to/chrome npx tsx scripts/assets.ts [baseUrl] [artist] [region]
 */
import { chromium, type Browser } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import type { RunResult } from "../src/lib/agent/run";

const base = process.argv[2] ?? "http://127.0.0.1:3077";
const artist = process.argv[3] ?? "Noah Kahan";
const region = process.argv[4] ?? "north-america";
const root = path.resolve(__dirname, "..");
const galleryDir = path.join(root, "docs", "gallery");
const videoDir = path.join(root, "docs", "video");

const FONTS =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders:opsz,wght@10..72,700..900&family=Instrument+Sans:wght@400;600&family=Space+Mono:wght@400;700&display=block">';

/** Light tokens from design/DESIGN.md. Assets are always light: they sit on Devpost's white page. */
const CSS = `
:root { --paper:#FAFAF7; --sheet:#FFFFFF; --ink:#0D0D0D; --ink-2:#3D3D3D; --ink-3:#616161; --hair:#DADAD4;
  --qloo:#E6007E; --qloo-text:#B00060; --llm:#0078BF; --llm-text:#005A91; --panel:#0D0D0D; --panel-text:#F5F5F2; --panel-text-2:#B8B8B4;
  --panel-qloo:#FF5CAD; --panel-llm:#5CB3FF; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: var(--paper); color: var(--ink); font-family: "Instrument Sans", sans-serif; -webkit-font-smoothing: antialiased; }
.d { font-family: "Big Shoulders", sans-serif; font-weight: 900; text-transform: uppercase; }
.m { font-family: "Space Mono", monospace; }
.wm { font-family: "Big Shoulders", sans-serif; font-weight: 900; text-transform: uppercase; line-height: .82; text-shadow: var(--o, 4px) var(--o, 4px) 0 var(--qloo); }
.stamp { font-family: "Space Mono", monospace; font-weight: 700; text-transform: uppercase; border: 3px solid var(--ink); padding: 3px 10px; white-space: nowrap; }
`;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const city = (k: string) => k.split(",")[0];

async function getRun(browser: Browser): Promise<RunResult> {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/?artist=${encodeURIComponent(artist)}&region=${region}`, { waitUntil: "networkidle" });
  await page.waitForSelector('a[href^="/brief/"]', { timeout: 120000 });
  const href = (await page.locator('a[href^="/brief/"]').first().getAttribute("href"))!;
  await page.close();
  const res = await fetch(`${base}/api/run/${href.split("/").pop()}`);
  return (await res.json()) as RunResult;
}

/** The verdict as a poster: both routes, the score pair between them. Used by the thumbnail and the video title card. */
function verdictPoster(r: RunResult, w: number, h: number) {
  const { plan, contrast } = r;
  const c = contrast!;
  const route = plan.route.order.map((k) => plan.markets.find((m) => m.key === k)!).filter(Boolean);
  const weak = new Set(c.weakLlmPicks.map((x) => x.input));
  const missed = new Set(c.missedByLlm.map((x) => x.market));
  const fixture = r.mode.qloo === "fixture";
  const u = w / 1500; // scale unit
  const row = (n: number) => Math.min(82 * u, (h - 368 * u) / n);
  const rows = Math.max(route.length, c.llmCities.length);
  return `
  <div style="width:${w}px;height:${h}px;padding:${54 * u}px ${60 * u}px;display:grid;grid-template-rows:auto 1fr;gap:${26 * u}px;background:var(--paper)">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:${5 * u}px solid var(--ink);padding-bottom:${16 * u}px">
      <div>
        <div class="wm" style="font-size:${46 * u}px;--o:${3 * u}px">Headliner</div>
        <div class="d" style="font-size:${92 * u}px;line-height:.9;margin-top:${14 * u}px">${esc(plan.artist?.name ?? artist)} · ${route.length} dates</div>
      </div>
      <div style="text-align:right">
        ${fixture ? `<div class="stamp" style="font-size:${17 * u}px;border-width:${3 * u}px;display:inline-block">Fixture data · illustrative</div>` : ""}
        <div class="m" style="font-size:${20 * u}px;margin-top:${10 * u}px;color:var(--ink-2)">Built on Qloo taste data</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr ${380 * u}px 1.12fr;min-height:0">
      <div style="padding-right:${34 * u}px;min-width:0">
        <div class="m" style="font-size:${22 * u}px;font-weight:700;color:var(--llm-text);text-transform:uppercase">Ask an LLM</div>
        ${c.llmCities
          .map(
            (x) => `<div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:${1.5 * u}px solid var(--hair);height:${row(rows)}px">
          <span class="d" style="font-size:${row(rows) * 0.86}px;line-height:1.05;font-weight:800;${weak.has(x.input) ? `text-decoration:line-through;text-decoration-color:var(--llm);text-decoration-thickness:${6 * u}px;color:var(--ink-3)` : ""}">${esc(city(x.input))}</span>
          <span class="m" style="font-size:${26 * u}px;font-weight:700">${x.score ?? "–"}</span></div>`,
          )
          .join("")}
      </div>
      <div style="background:var(--panel);color:var(--panel-text);display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:${10 * u}px">
        <div class="d" style="font-size:${235 * u}px;line-height:.8;color:var(--panel-qloo)">${c.qlooAvgScore ?? "–"}</div>
        <div class="m" style="font-size:${21 * u}px;text-transform:uppercase;color:var(--panel-text-2);line-height:1.3">avg fan score<br>Qloo vs LLM</div>
        <div class="d" style="font-size:${150 * u}px;line-height:.8;color:var(--panel-llm)">${c.llmAvgScore ?? "–"}</div>
      </div>
      <div style="padding-left:${34 * u}px;min-width:0">
        <div class="m" style="font-size:${22 * u}px;font-weight:700;color:var(--qloo-text);text-transform:uppercase">Ask Qloo</div>
        ${route
          .map(
            (m) => `<div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:${1.5 * u}px solid var(--hair);height:${row(rows)}px">
          <span class="d" style="font-size:${row(rows) * 0.86}px;line-height:1.05;font-weight:900;${missed.has(m.key) ? "color:var(--qloo-text)" : ""}">${esc(city(m.key))}</span>
          <span class="m" style="font-size:${26 * u}px;font-weight:700">${m.score}</span></div>`,
          )
          .join("")}
      </div>
    </div>
  </div>`;
}

async function renderHtml(browser: Browser, html: string, out: string, size: { width: number; height: number }, opts: { transparent?: boolean; scale?: number } = {}) {
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: opts.scale ?? 1 });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${CSS}</style></head><body${opts.transparent ? ' style="background:transparent"' : ""}>${html}</body></html>`, {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, omitBackground: !!opts.transparent });
  await page.close();
  console.log(`wrote ${path.relative(root, out)}`);
}

async function shoot(browser: Browser, url: string, selector: string | null, viewport: { width: number; height: number }) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector("text=/Tour brief/i", { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(2500); // map basemap
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" }); // hide the dev-mode indicator if run against `next dev`
  const buf = selector ? await page.locator(selector).first().screenshot() : await page.screenshot();
  await page.close();
  return buf.toString("base64");
}

function galleryFrame(caption: string, source: string, img: string, fixture: boolean) {
  return `
  <div style="width:1500px;height:1000px;display:grid;grid-template-rows:auto 1fr;background:var(--paper)">
    <div style="padding:34px 48px 18px;border-bottom:5px solid var(--ink);display:flex;justify-content:space-between;align-items:flex-end;gap:24px">
      <div style="min-width:0">
        <div class="d" style="font-size:58px;line-height:.95">${esc(caption)}</div>
        <div class="m" style="font-size:17px;color:var(--ink-3);margin-top:10px">${esc(source)}</div>
      </div>
      <div style="text-align:right;flex:none">
        <div class="wm" style="font-size:34px;--o:2px">Headliner</div>
        ${fixture ? '<div class="stamp" style="font-size:13px;margin-top:10px;display:inline-block">Fixture data · illustrative</div>' : ""}
      </div>
    </div>
    <div style="padding:26px 48px 30px;min-height:0;display:flex;justify-content:center;align-items:flex-start">
      <img src="data:image/png;base64,${img}" style="max-width:100%;max-height:100%;object-fit:contain;border:1px solid var(--hair)">
    </div>
  </div>`;
}

async function main() {
  fs.mkdirSync(galleryDir, { recursive: true });
  fs.mkdirSync(videoDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] });
  const r = await getRun(browser);
  const { plan, contrast } = r;
  if (!contrast) throw new Error("This run has no plain-LLM comparison; configure an LLM or use a sample artist.");
  const fixture = r.mode.qloo === "fixture";
  const name = plan.artist?.name ?? artist;

  // Thumbnail, plus the 300x200 legibility check.
  const poster = verdictPoster(r, 1500, 1000);
  await renderHtml(browser, poster, path.join(galleryDir, "thumbnail.png"), { width: 1500, height: 1000 });
  await renderHtml(browser, poster, path.join(galleryDir, "thumbnail-300.png"), { width: 1500, height: 1000 }, { scale: 0.2 });

  // Gallery: six real screens with a takeaway caption.
  const url = `${base}/?artist=${encodeURIComponent(artist)}&region=${region}`;
  const sleeper = contrast.missedByLlm.filter((m) => m.tier === "sleeper").sort((a, b) => b.score - a.score)[0] ?? contrast.missedByLlm[0];
  const top = plan.supportActs[0];
  const topBest = top ? Object.entries(top.perMarket).sort((a, b) => b[1] - a[1])[0] : undefined;
  const lead = plan.sponsors.flatMap((c) => c.localOnly)[0];
  const tourWide = plan.sponsors[0]?.national[0];
  const endpoints = new Set(r.calls.map((c) => c.endpoint)).size;
  const items: Array<[string, string, string, string | null, { width: number; height: number }]> = [
    ["01-verdict", `Qloo's route averages ${contrast.qlooAvgScore} vs ${contrast.llmAvgScore} for a plain LLM`, "Same question, scored by the same Qloo affinity call · /v2/insights", "section[aria-labelledby=vs-h]", { width: 1440, height: 900 }],
    ["02-routing", sleeper ? `${sleeper.market}: the ${sleeper.tier} market the LLM never named` : `${name}: the routed tour`, "Qloo heatmap + location-aware artist affinity per city · /v2/insights", "section[aria-labelledby=route-h]", { width: 1440, height: 900 }],
    ["03-trace", `${r.calls.length} Qloo calls across ${endpoints} endpoints, every one shown`, "The agent plans its own calls; each carries a one-line reason", null, { width: 1440, height: 900 }],
    ["04-opener", top ? `${top.name} opens${topBest ? `, strongest in ${city(topBest[0])}` : ""}` : "The support act", "Fan overlap re-ranked market by market · /v2/insights + /v2/analysis/compare", "section[aria-labelledby=sa-h]", { width: 1440, height: 900 }],
    ["05-sponsors", lead && tourWide ? `${tourWide.name} tour-wide, ${lead.brand} only in ${city(lead.market)}` : "What this audience buys", "Qloo cross-domain brand affinity, region-wide and per market", "section[aria-labelledby=sp-h]", { width: 1440, height: 900 }],
  ];
  for (const [file, caption, source, selector, vp] of items) {
    const img = await shoot(browser, url, selector, vp);
    await renderHtml(browser, galleryFrame(caption, source, img, fixture), path.join(galleryDir, `${file}.png`), { width: 1500, height: 1000 });
  }
  const brief = await shoot(browser, `${base}/brief/${r.runId}`, null, { width: 1100, height: 900 });
  await renderHtml(browser, galleryFrame("One page to take into the meeting", "Printable brief and CSV, generated in seconds", brief, fixture), path.join(galleryDir, "06-brief.png"), { width: 1500, height: 1000 });

  // Video cards (1920x1080).
  await renderHtml(browser, verdictPoster(r, 1920, 1080), path.join(videoDir, "title.png"), { width: 1920, height: 1080 });
  await renderHtml(
    browser,
    `<div style="width:1920px;height:1080px;position:relative">
      <div style="position:absolute;left:64px;bottom:64px;background:var(--panel);color:var(--panel-text);padding:20px 30px 22px;display:flex;gap:30px;align-items:center">
        <div class="d" style="font-size:96px;line-height:.85"><span style="color:var(--panel-qloo)">${contrast.qlooAvgScore}</span> <span style="font-size:40px;color:var(--panel-text-2)">vs</span> <span style="color:var(--panel-llm)">${contrast.llmAvgScore}</span></div>
        <div>
          <div class="d" style="font-size:54px;line-height:1">Without Qloo vs with Qloo</div>
          <div class="m" style="font-size:22px;margin-top:8px;color:var(--panel-text-2)">Same question, same scoring · average fan score</div>
        </div>
      </div></div>`,
    path.join(videoDir, "lower-third.png"),
    { width: 1920, height: 1080 },
    { transparent: true },
  );
  await renderHtml(
    browser,
    `<div style="width:1920px;height:1080px;padding:120px 140px;display:flex;flex-direction:column;justify-content:space-between;background:var(--paper)">
      <div class="wm" style="font-size:230px;--o:9px">Headliner</div>
      <div>
        <div class="d" style="font-size:84px;line-height:1;border-top:6px solid var(--ink);padding-top:26px">Tour decisions on taste data,<br>not guesswork.</div>
        <div class="m" style="font-size:30px;margin-top:34px;display:flex;justify-content:space-between"><span>headliner-qloo.fly.dev</span><span>Built on Qloo</span></div>
      </div></div>`,
    path.join(videoDir, "end.png"),
    { width: 1920, height: 1080 },
  );
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
