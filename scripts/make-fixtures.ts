/**
 * Regenerate the ILLUSTRATIVE fixtures in fixtures/qloo/ by running the real agent
 * (deterministic planner) against the synthetic Qloo stand-in. Because the agent itself
 * makes the requests, the fixtures always cover exactly what the app asks for.
 *
 *   npx tsx scripts/make-fixtures.ts
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { QlooClient } from "../src/lib/qloo/client";
import { normaliseInput, runAgent } from "../src/lib/agent/run";
import type { FixtureFile } from "../src/lib/qloo/fixtures";
import { SEEDS } from "./fixtures/seeds";
import { SyntheticQloo } from "./fixtures/synthetic-qloo";

const ROOT = path.resolve(__dirname, "..");
const TODAY = new Date("2026-10-13T12:00:00Z");

async function main() {
  const synthetic = new SyntheticQloo(SEEDS);
  await fs.mkdir(path.join(ROOT, "fixtures", "qloo"), { recursive: true });
  for (const seed of SEEDS) {
    const entries: FixtureFile["entries"] = [];
    const fetchImpl = (async (input: string | URL) => {
      const url = new URL(String(input));
      const response = synthetic.respond(url);
      entries.push({ request: { path: url.pathname, params: Object.fromEntries(url.searchParams.entries()) }, response });
      return new Response(JSON.stringify(response), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;
    let listener: ((r: unknown) => void) | undefined;
    const client = new QlooClient({ apiKey: "synthetic-fixture-generator", fetchImpl, onCall: (r) => listener?.(r) });
    const input = normaliseInput({ artist: seed.name, region: seed.region, dates: 8, cities: [] });
    const result = await runAgent(input, { client, bindCalls: (fn) => (listener = fn as never), emit: () => {}, runId: "fixturegen", today: TODAY, fixtureRoot: ROOT });
    // De-duplicate identical requests (the agent may repeat a lookup).
    const seen = new Set<string>();
    const unique = entries.filter((e) => {
      const k = JSON.stringify(e.request);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const file: FixtureFile = {
      fixture: true,
      source: "illustrative",
      note: "ILLUSTRATIVE FIXTURE, NOT QLOO DATA. Shapes follow the Qloo hackathon API reference; names and scores are placeholders from scripts/fixtures/seeds.ts. Replace by running scripts/qloo-smoke.sh once QLOO_API_KEY exists.",
      entries: unique,
    };
    await fs.writeFile(path.join(ROOT, "fixtures", "qloo", `${seed.slug}.json`), JSON.stringify(file, null, 1) + "\n");
    console.log(`${seed.name}: ${unique.length} requests, ${result.plan.markets.length} markets, route ${result.plan.route.order.join(" > ")}`);
    if (result.contrast) console.log(`  contrast: ${result.contrast.headline}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
