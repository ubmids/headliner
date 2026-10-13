/**
 * DEV ONLY: patch global fetch so hackathon.api.qloo.com is answered by the synthetic stand-in.
 * Used to dry-run scripts/qloo-smoke.ts before a real key exists:
 *   QLOO_API_KEY=dry-run npx tsx --import ./scripts/fixtures/mock-fetch.ts scripts/qloo-smoke.ts --no-record
 */
import { SEEDS } from "./seeds";
import { SyntheticQloo } from "./synthetic-qloo";

const synthetic = new SyntheticQloo(SEEDS);
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? String(input) : input.url);
  if (url.host !== "hackathon.api.qloo.com") return realFetch(input, init);
  return new Response(JSON.stringify(synthetic.respond(url)), { status: 200, headers: { "Content-Type": "application/json" } });
}) as typeof fetch;
console.log("[dry-run] fetch to hackathon.api.qloo.com is served by the synthetic stand-in; results are NOT real.");
