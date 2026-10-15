/**
 * Capture README / Devpost screenshots from a running Headliner (default http://127.0.0.1:3077).
 *   CHROME=/path/to/chrome npx tsx scripts/screenshots.ts [baseUrl]
 */
import { chromium } from "playwright-core";
import path from "node:path";

const base = process.argv[2] ?? "http://127.0.0.1:3077";
const out = path.resolve(__dirname, "..", "docs", "img");

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] });
  const shoot = async (name: string, url: string, viewport: { width: number; height: number }, clip?: string) => {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Tour brief", { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500); // map tiles
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" }); // hide the dev-mode indicator
    if (clip) {
      const el = page.locator(clip).first();
      await el.screenshot({ path: path.join(out, `${name}.png`) });
    } else {
      await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
    }
    await page.close();
    console.log(`wrote docs/img/${name}.png`);
  };
  const noah = `${base}/?artist=${encodeURIComponent("Noah Kahan")}&region=north-america`;
  await shoot("full-desktop", noah, { width: 1440, height: 900 });
  await shoot("contrast", noah, { width: 1280, height: 900 }, "section[aria-labelledby=vs-h]");
  await shoot("routing", noah, { width: 1280, height: 900 }, "section[aria-labelledby=route-h]");
  await shoot("trace", noah, { width: 1440, height: 1100 }, ".trace-card");
  await shoot("mobile", noah, { width: 390, height: 844 });
  {
    // The printable brief for the same run.
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(noah, { waitUntil: "networkidle" });
    const href = await page.locator('a[href^="/brief/"]').first().getAttribute("href", { timeout: 60000 });
    await page.goto(`${base}${href}`, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.screenshot({ path: path.join(out, "brief.png"), fullPage: true });
    await page.close();
    console.log("wrote docs/img/brief.png");
  }
  await shoot("childers-contrast", `${base}/?artist=${encodeURIComponent("Tyler Childers")}&region=north-america`, { width: 1280, height: 900 }, "section[aria-labelledby=vs-h]");
  await browser.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
