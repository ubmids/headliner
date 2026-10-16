/**
 * Record the "without Qloo" answers for the sample artists, using exactly the prompt the app
 * uses (src/lib/agent/baseline.ts), from whatever LLM_* endpoint is configured. Fixture mode
 * serves these when no LLM is configured, so the side-by-side always has a real LLM answer.
 *
 *   LLM_BASE_URL=... LLM_MODEL=... [LLM_API_KEY=...] npx tsx scripts/record-baselines.ts ["Artist|region" ...]
 *
 * With no arguments it records the three sample artists. The deployed demo runs without an LLM,
 * so these recorded answers are what the "without Qloo" panel shows, labelled as recorded.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { llmFromEnv } from "../src/lib/llm";
import { liveBaseline, slugify } from "../src/lib/agent/baseline";
import type { RegionId } from "../src/lib/geo";
import { SEEDS } from "./fixtures/seeds";

async function main() {
  const llm = llmFromEnv();
  if (!llm) throw new Error("Set LLM_BASE_URL and LLM_MODEL.");
  const dir = path.resolve(__dirname, "..", "fixtures", "baseline");
  await fs.mkdir(dir, { recursive: true });
  const args = process.argv.slice(2);
  const list = args.length
    ? args.map((a) => {
        const [name, region = "north-america"] = a.split("|");
        return { name, region: region as RegionId, slug: slugify(name) };
      })
    : SEEDS.map((s) => ({ name: s.name, region: s.region as RegionId, slug: s.slug }));
  for (const seed of list) {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const b = await liveBaseline(llm, seed.name, seed.region, 8, []);
        const out = { artist: seed.name, ...b, source: "recorded-llm", recordedAt: new Date().toISOString(), prompt: "src/lib/agent/baseline.ts baselinePrompt(artist, region, 8, [])" };
        await fs.writeFile(path.join(dir, `${seed.slug}.json`), JSON.stringify(out, null, 2) + "\n");
        console.log(`${seed.name} [${llm.model}]: ${b.cities.join(" | ")} :: ${b.supportActs.join(", ")} :: ${b.sponsors.join(", ")}`);
        lastErr = undefined;
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (lastErr) console.error(`${seed.name}: ${lastErr}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
