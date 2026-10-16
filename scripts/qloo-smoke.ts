/**
 * Qloo smoke test. Run it the moment QLOO_API_KEY exists:
 *
 *   QLOO_API_KEY=... scripts/qloo-smoke.sh [--artist "Noah Kahan"] [--no-record]
 *
 * 1. Probes every endpoint + parameter pattern Headliner uses against hackathon.api.qloo.com,
 *    validating each response against the schemas in src/lib/qloo/types.ts.
 * 2. Flags EMPTY results loudly: Qloo silently ignores invalid parameters, so an empty answer
 *    usually means a bad parameter, not missing data.
 * 3. Checks that location parameters actually change the answer (if not, Qloo ignored them).
 * 4. Compares real response shapes with the illustrative fixtures and lists any differences.
 * 5. Re-records fixtures from real responses by running the agent for each sample artist,
 *    into fixtures/live/ (gitignored: Qloo's terms forbid publishing their data in a public repo).
 * Writes a report to .data/smoke-report.md. Exit code 1 if anything FAILs.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { QlooClient } from "../src/lib/qloo/client";
import { FixtureStore, type FixtureFile } from "../src/lib/qloo/fixtures";
import { entityId, tagId } from "../src/lib/qloo/types";
import { REGIONS } from "../src/lib/geo";
import { normaliseInput, runAgent } from "../src/lib/agent/run";
import { SEEDS } from "./fixtures/seeds";

const ROOT = path.resolve(__dirname, "..");
type Level = "PASS" | "WARN" | "FAIL";
const rows: Array<{ level: Level; check: string; detail: string }> = [];
const log = (level: Level, check: string, detail = "") => {
  rows.push({ level, check, detail });
  console.log(`${level.padEnd(4)}  ${check}${detail ? `  ·  ${detail}` : ""}`);
};

const args = process.argv.slice(2);
const argVal = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const ARTIST = argVal("--artist") ?? "Noah Kahan";
const RECORD = !args.includes("--no-record");

/** Structural signature of a JSON value (keys + types, 4 levels deep, first array element). */
export function shape(v: unknown, depth = 0): unknown {
  if (depth > 4) return "…";
  if (Array.isArray(v)) return v.length ? [shape(v[0], depth + 1)] : [];
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, shape((v as Record<string, unknown>)[k], depth + 1)]));
  return typeof v;
}

function diffShape(a: unknown, b: unknown, at = ""): string[] {
  if (typeof a === "string" || typeof b === "string") return a === b || a === "…" || b === "…" ? [] : [`${at || "."}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`];
  if (Array.isArray(a) && Array.isArray(b)) return a.length && b.length ? diffShape(a[0], b[0], `${at}[]`) : [];
  if (a && b && typeof a === "object" && typeof b === "object") {
    const out: string[] = [];
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    for (const k of ka) if (!kb.includes(k)) out.push(`${at}.${k}: in fixture, missing in live`);
    for (const k of ka) if (kb.includes(k)) out.push(...diffShape((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${at}.${k}`));
    return out;
  }
  return [];
}

async function probe<T>(name: string, fn: () => Promise<T>, count: (t: T) => number, extra?: (t: T) => string | undefined): Promise<T | undefined> {
  try {
    const t = await fn();
    const n = count(t);
    if (n === 0) log("FAIL", name, "EMPTY result: check every parameter against the Entity Type Parameter Guide (Qloo ignores invalid params silently)");
    else log("PASS", name, `${n} results${extra?.(t) ? ` · ${extra(t)}` : ""}`);
    return t;
  } catch (e) {
    log("FAIL", name, e instanceof Error ? e.message : String(e));
    return undefined;
  }
}

async function main() {
  const key = process.env.QLOO_API_KEY?.trim();
  if (!key) {
    console.error("QLOO_API_KEY is not set. Nothing to smoke-test yet (the app runs in fixture mode).");
    process.exit(2);
  }
  const captured: Array<{ path: string; params: Record<string, string>; body: unknown }> = [];
  const fetchCapture: typeof fetch = async (input, init) => {
    const res = await fetch(input, init);
    const text = await res.text();
    if (res.ok) {
      const url = new URL(String(input));
      try {
        captured.push({ path: url.pathname, params: Object.fromEntries(url.searchParams.entries()), body: JSON.parse(text) });
      } catch {}
    }
    return new Response(text, { status: res.status, headers: res.headers });
  };
  const c = new QlooClient({ apiKey: key, baseUrl: process.env.QLOO_BASE_URL, fetchImpl: fetchCapture, maxConcurrency: 2 });
  console.log(`Qloo smoke test against ${c.baseUrl} (artist: ${ARTIST})\n`);

  // --- Lookup ------------------------------------------------------------
  const s = await probe("GET /search types=urn:entity:artist", () => c.search(ARTIST, "urn:entity:artist", 5), (r) => r.results.length, (r) => `top: ${r.results[0]?.name} (${entityId(r.results[0] ?? {})}), popularity ${r.results[0]?.popularity ?? "MISSING"}`);
  const artist = s?.results.find((e) => e.name.toLowerCase() === ARTIST.toLowerCase()) ?? s?.results[0];
  if (!artist) {
    log("FAIL", "cannot continue without the artist ID");
    return finish();
  }
  const id = entityId(artist);
  if (artist.popularity === undefined) log("WARN", "/search popularity", "missing: support-act popularity cap falls back to 0.88");

  const venueTags = await probe("GET /v2/tags filter.query='music venue' (semantic)", () => c.tags("music venue", 20, { "feature.semantic_search": true }), (r) => r.results.tags.length, (r) => r.results.tags.slice(0, 4).map((t) => `${t.name}=${tagId(t)}`).join(", "));
  const venueTag = venueTags?.results.tags.find((t) => tagId(t).includes(":place"))?.[`id`] ?? (venueTags ? tagId(venueTags.results.tags[0] ?? {}) : undefined);
  if (venueTags && !venueTags.results.tags.some((t) => tagId(t).includes(":place") || (t.parents ?? []).some((p) => p.type === "urn:entity:place"))) log("WARN", "venue tag", "no tag looks place-scoped; check which tag the app picks");
  for (const q of ["food and beverage", "apparel and fashion", "alcoholic beverages", "bar"]) {
    await probe(`GET /v2/tags filter.query='${q}'`, () => c.tags(q, 20, { "feature.semantic_search": true }), (r) => r.results.tags.length, (r) => r.results.tags.slice(0, 3).map((t) => tagId(t)).join(", "));
  }

  // --- Insights ----------------------------------------------------------
  await probe("GET /v2/insights filter.type=urn:tag (taste)", () => c.tasteTags({ "signal.interests.entities": id, "filter.parents.types": "urn:entity:artist", take: 12 }), (r) => r.results.tags.length, (r) => r.results.tags.slice(0, 5).map((t) => t.name).join(", "));
  await probe("GET /v2/insights filter.type=urn:demographics", () => c.demographics({ "signal.interests.entities": id }), (r) => r.results.demographics.length, (r) => JSON.stringify(r.results.demographics[0]?.query.age ?? {}));

  const region = REGIONS["north-america"];
  // The app uses geohash cells: urn:entity:locality over a whole region took ~50 s on the live API (16 Oct 2026).
  const hm = await probe("GET /v2/insights urn:heatmap boundary=urn:geohash (region polygon)", () => c.heatmap({ "signal.interests.entities": id, "filter.location": region.wkt, "output.heatmap.boundary": "urn:geohash", take: 50 }), (r) => r.results.heatmap.length, (r) => `first: ${JSON.stringify(r.results.heatmap[0]).slice(0, 160)}`);
  if (!hm || hm.results.heatmap.length === 0) {
    await probe("FALLBACK heatmap default boundary (geohash)", () => c.heatmap({ "signal.interests.entities": id, "filter.location": region.wkt, take: 50 }), (r) => r.results.heatmap.length);
    await probe("FALLBACK heatmap filter.location.query=Boston", () => c.heatmap({ "signal.interests.entities": id, "filter.location.query": "Boston", take: 50 }), (r) => r.results.heatmap.length);
  } else if (hm.results.heatmap.some((p) => p.query.popularity === undefined)) log("WARN", "heatmap popularity", "some points lack query.popularity: over-index uses concentration only");

  const cities = ["Boston, MA", "Burlington, VT", "Los Angeles, CA", "Miami, FL"];
  const aff: number[] = [];
  for (const city of cities) {
    const r = await probe(`GET /v2/insights artist rank filter.results.entities + signal.location.query='${city}'`, () => c.insightsEntities({ "filter.type": "urn:entity:artist", "filter.results.entities": id, "signal.location.query": city, take: 1 }), (r) => r.results.entities.length, (r) => `affinity ${r.results.entities[0]?.query?.affinity ?? "MISSING"}`);
    const a = r?.results.entities[0]?.query?.affinity;
    if (a !== undefined) aff.push(a);
  }
  if (aff.length >= 2 && new Set(aff.map((a) => a.toFixed(4))).size === 1) log("FAIL", "location sensitivity (artist)", "same affinity in every city: signal.location.query is being ignored for urn:entity:artist. Switch rank_cities to heatmap-only scoring.");
  else if (aff.length >= 2) log("PASS", "location sensitivity (artist)", aff.map((a) => a.toFixed(3)).join(" / "));
  if (aff.length && aff.every((a) => a === undefined)) log("FAIL", "query.affinity", "insights entities carry no query.affinity");

  await probe("GET /v2/insights urn:entity:place venues (filter.location.query + filter.tags)", () => c.insightsEntities({ "filter.type": "urn:entity:place", "filter.location.query": "Boston, MA", "filter.tags": venueTag, "signal.interests.entities": id, take: 5 }), (r) => r.results.entities.length, (r) => r.results.entities.slice(0, 3).map((e) => `${e.name}${e.location ? "" : " (no location!)"}`).join(", "));

  const support = await probe("GET /v2/insights urn:entity:artist support candidates (popularity cap, explainability)", () => c.insightsEntities({ "filter.type": "urn:entity:artist", "signal.interests.entities": id, "filter.exclude.entities": id, "filter.popularity.max": Math.max(0.5, Math.round(((artist.popularity ?? 0.9) - 0.02) * 100) / 100), "feature.explainability": true, take: 10 }), (r) => r.results.entities.length, (r) => r.results.entities.slice(0, 4).map((e) => e.name).join(", "));
  const cands = support?.results.entities.map((e) => entityId(e)) ?? [];
  if (cands.length) {
    await probe("GET /v2/insights overlap by market (filter.results.entities + signal.location.query)", () => c.insightsEntities({ "filter.type": "urn:entity:artist", "filter.results.entities": cands, "signal.interests.entities": id, "signal.location.query": "Boston, MA", take: cands.length }), (r) => r.results.entities.length);
    await probe("GET /v2/analysis/compare", () => c.compare([id], [cands[0]], { take: 8 }), (r) => (Array.isArray(r.results) ? r.results.length : ((r.results as { tags?: unknown[] }).tags ?? (r.results as { entities?: unknown[] }).entities ?? []).length), (r) => JSON.stringify(r.results).slice(0, 160));
  }

  const brandTag = (await c.tags("food and beverage", 20, { "feature.semantic_search": true }).catch(() => undefined))?.results.tags.find((t) => tagId(t).includes("brand"));
  const national = await probe("GET /v2/insights urn:entity:brand (filter.tags category)", () => c.insightsEntities({ "filter.type": "urn:entity:brand", "signal.interests.entities": id, "filter.tags": brandTag ? tagId(brandTag) : undefined, take: 6 }), (r) => r.results.entities.length, (r) => r.results.entities.map((e) => e.name).join(", "));
  const local = await probe("GET /v2/insights urn:entity:brand + signal.location.query='Burlington, VT'", () => c.insightsEntities({ "filter.type": "urn:entity:brand", "signal.interests.entities": id, "filter.tags": brandTag ? tagId(brandTag) : undefined, "signal.location.query": "Burlington, VT", take: 6 }), (r) => r.results.entities.length, (r) => r.results.entities.map((e) => e.name).join(", "));
  if (national && local) {
    const same = JSON.stringify(national.results.entities.map((e) => [entityId(e), e.query?.affinity])) === JSON.stringify(local.results.entities.map((e) => [entityId(e), e.query?.affinity]));
    log(same ? "WARN" : "PASS", "location sensitivity (brand)", same ? "identical with and without location: per-market sponsor lists will equal the national list" : "per-market brand lists differ from national");
  }
  const end = new Date();
  const start = new Date(end.getTime() - 182 * 86400000);
  await probe("GET /v2/trending", () => c.trending({ "filter.type": "urn:entity:artist", "signal.interests.entities": id, "filter.start_date": start.toISOString().slice(0, 10), "filter.end_date": end.toISOString().slice(0, 10) }), (r) => r.results.trending.length);

  // --- Shape comparison with the illustrative fixtures ----------------------
  const store = new FixtureStore([path.join(ROOT, "fixtures", "qloo")]);
  let compared = 0;
  for (const cap of captured) {
    const fx = await findFixtureLike(store, cap.path, cap.params);
    if (!fx) continue;
    compared++;
    const d = diffShape(shape(fx), shape(cap.body));
    if (d.length) log("WARN", `shape differs from fixture: ${cap.path} ${cap.params["filter.type"] ?? ""}`, d.slice(0, 4).join("; "));
  }
  log("PASS", "shape comparison", `${compared} live responses compared with fixture counterparts`);

  // --- Re-record fixtures from real responses -------------------------------
  if (RECORD) {
    await fs.mkdir(path.join(ROOT, "fixtures", "live"), { recursive: true });
    for (const seed of SEEDS) {
      const recorded: FixtureFile["entries"] = [];
      const fetchRec: typeof fetch = async (input, init) => {
        const res = await fetch(input, init);
        const text = await res.text();
        if (res.ok) {
          const url = new URL(String(input));
          try {
            recorded.push({ request: { path: url.pathname, params: Object.fromEntries(url.searchParams.entries()) }, response: JSON.parse(text) });
          } catch {}
        }
        return new Response(text, { status: res.status, headers: res.headers });
      };
      const client = new QlooClient({ apiKey: key, baseUrl: process.env.QLOO_BASE_URL, fetchImpl: fetchRec, maxConcurrency: 3 });
      const result = await runAgent(normaliseInput({ artist: seed.name, region: seed.region, dates: 8 }), { client, bindCalls: () => {}, emit: () => {}, runId: "smoke", fixtureRoot: ROOT });
      const empties = result.calls.filter((r) => r.status === "empty");
      const errors = result.calls.filter((r) => r.status === "error");
      const file: FixtureFile = { fixture: true, source: "recorded", note: `Recorded from ${client.baseUrl} on ${new Date().toISOString()} by scripts/qloo-smoke.ts. Real Qloo data: do not commit.`, entries: recorded };
      await fs.writeFile(path.join(ROOT, "fixtures", "live", `${seed.slug}.json`), JSON.stringify(file) + "\n");
      log(errors.length ? "FAIL" : empties.length ? "WARN" : "PASS", `agent run + re-record: ${seed.name}`, `${recorded.length} responses → fixtures/live/${seed.slug}.json · route ${result.plan.route.order.join(" > ")}${empties.length ? ` · EMPTY: ${empties.map((e) => e.url.replace(/^https:\/\/[^/]+/, "")).slice(0, 3).join(" | ")}` : ""}${errors.length ? ` · ERRORS: ${errors.map((e) => e.error).slice(0, 2).join(" | ")}` : ""}`);
    }
  }
  return finish();
}

async function findFixtureLike(store: FixtureStore, p: string, params: Record<string, string>) {
  // Exact match first (same request the agent makes for a sample artist)...
  const exact = await store.lookup(p, params);
  if (exact) return exact.response;
  // ...otherwise any illustrative fixture for the same endpoint and filter.type.
  const raw = await fs.readdir(path.join(ROOT, "fixtures", "qloo")).catch(() => [] as string[]);
  for (const f of raw) {
    const file = JSON.parse(await fs.readFile(path.join(ROOT, "fixtures", "qloo", f), "utf8")) as FixtureFile;
    const e = file.entries.find((x) => x.request.path === p && String(x.request.params["filter.type"] ?? "") === String(params["filter.type"] ?? "") && (x.response as { results?: unknown }).results);
    if (e) return e.response;
  }
  return undefined;
}

async function finish() {
  const fails = rows.filter((r) => r.level === "FAIL").length;
  const warns = rows.filter((r) => r.level === "WARN").length;
  const md = [
    `# Qloo smoke report (${new Date().toISOString()})`,
    "",
    `${rows.length} checks · ${fails} FAIL · ${warns} WARN`,
    "",
    "| Result | Check | Detail |",
    "|---|---|---|",
    ...rows.map((r) => `| ${r.level} | ${r.check} | ${r.detail.replace(/\|/g, "\\|")} |`),
    "",
  ].join("\n");
  await fs.mkdir(path.join(ROOT, ".data"), { recursive: true });
  await fs.writeFile(path.join(ROOT, ".data", "smoke-report.md"), md);
  console.log(`\n${fails} FAIL · ${warns} WARN · report: .data/smoke-report.md`);
  process.exit(fails ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
