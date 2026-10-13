import { describe, expect, it } from "vitest";
import { QlooClient, type QlooCallRecord } from "@/lib/qloo/client";
import { normaliseInput, runAgent, type AgentEvent } from "@/lib/agent/run";
import type { ChatMessage, ChatResult, LlmClient } from "@/lib/llm";
import { reduce, type RunState } from "@/components/useRun";
import { QLOO_ENDPOINTS } from "@/lib/qloo/types";

const TODAY = new Date("2026-10-13T12:00:00Z");

async function run(artist: string, region: "north-america" | "uk-europe", llm?: LlmClient, cities: string[] = []) {
  const events: AgentEvent[] = [];
  let listener: ((r: QlooCallRecord) => void) | undefined;
  const client = new QlooClient({ onCall: (r) => listener?.(r) });
  const result = await runAgent(normaliseInput({ artist, region, cities, dates: 8 }), {
    client,
    bindCalls: (fn) => (listener = fn),
    emit: (e) => events.push(e),
    runId: "test",
    today: TODAY,
    llm,
  });
  return { result, events };
}

/** Parameters documented in the Qloo reference for each endpoint the app uses (docs.qloo.com, Oct 2026). */
const DOCUMENTED: Record<string, string[]> = {
  "/search": ["query", "types", "take", "page", "filter.location", "filter.radius", "filter.tags", "filter.popularity", "sort_by"],
  "/entities": ["entity_ids"],
  "/v2/tags": ["filter.query", "feature.semantic_search", "feature.typo_tolerance", "filter.tag.types", "filter.parents.types", "take", "page"],
  "/v2/audiences": ["filter.query", "filter.audience.types", "filter.parents.types", "take", "page"],
  "/v2/insights": [
    "filter.type", "signal.interests.entities", "signal.interests.tags", "signal.location", "signal.location.query", "signal.demographics.age", "signal.demographics.gender",
    "filter.location", "filter.location.query", "filter.tags", "filter.results.entities", "filter.exclude.entities", "filter.popularity.max", "filter.popularity.min",
    "filter.parents.types", "output.heatmap.boundary", "feature.explainability", "take", "page", "offset",
  ],
  "/v2/analysis/compare": ["a.signal.interests.entities", "b.signal.interests.entities", "filter.type", "take", "page"],
  "/v2/trending": ["filter.type", "signal.interests.entities", "filter.start_date", "filter.end_date", "take", "page"],
};

describe("agent, deterministic planner, fixture mode", () => {
  it("makes all four decisions from Qloo results", async () => {
    const { result } = await run("Noah Kahan", "north-america");
    const p = result.plan;
    expect(result.error).toBeUndefined();
    expect(p.artist?.name).toBe("Noah Kahan");
    expect(p.route.order).toHaveLength(8);
    expect(p.markets.some((m) => m.tier === "sleeper")).toBe(true);
    expect(p.route.order.every((k) => p.markets.find((m) => m.key === k)!.venues.length > 0)).toBe(true);
    expect(p.supportActs.length).toBeGreaterThan(3);
    expect(Object.keys(p.supportActs[0].perMarket).length).toBeGreaterThan(0);
    expect(p.supportActs.some((a) => a.sharedTags.length > 0)).toBe(true);
    expect(p.sponsors).toHaveLength(3);
    expect(p.sponsors.every((c) => c.national.length > 0)).toBe(true);
    expect(p.trend?.points.length).toBeGreaterThan(3);
    expect(result.brief.headline).toContain("Noah Kahan");
  });

  it("uses at least 4 endpoint types, including location-based insights, and only documented params", async () => {
    const { result } = await run("Tyler Childers", "north-america");
    const endpoints = new Set(result.calls.map((c) => c.endpoint));
    expect(endpoints.size).toBeGreaterThanOrEqual(4);
    for (const e of endpoints) expect(QLOO_ENDPOINTS).toContain(e);
    const filterTypes = new Set(result.calls.filter((c) => c.endpoint === "/v2/insights").map((c) => c.params.find(([k]) => k === "filter.type")?.[1]));
    for (const t of ["urn:heatmap", "urn:entity:artist", "urn:entity:place", "urn:entity:brand", "urn:tag", "urn:demographics"]) expect(filterTypes).toContain(t);
    expect(result.calls.some((c) => c.params.some(([k]) => k === "signal.location.query" || k === "filter.location.query"))).toBe(true);
    for (const c of result.calls) {
      for (const [k] of c.params) expect(DOCUMENTED[c.endpoint], `${c.endpoint} ${k}`).toContain(k);
      expect(c.url).toMatch(/^https:\/\/hackathon\.api\.qloo\.com\//);
      expect(c.url).not.toMatch(/\/recommendations|\/recs/);
    }
  });

  it("fact-checks the plain LLM and measures the difference", async () => {
    const { result } = await run("Fontaines D.C.", "uk-europe");
    expect(result.baseline?.source).toBe("recorded-llm");
    expect(result.contrast).toBeDefined();
    expect(result.contrast!.llmCities.filter((c) => c.score !== undefined).length).toBeGreaterThan(4);
    expect(result.steps.some((s) => s.tool === "score_named_artists")).toBe(true);
    expect(result.contrast!.qlooAvgScore!).toBeGreaterThan(result.contrast!.llmAvgScore!);
  });

  it("streams a trace in which every Qloo call belongs to a step", async () => {
    const { events, result } = await run("Noah Kahan", "north-america");
    expect(events[0].type).toBe("run");
    expect(events.at(-1)?.type).toBe("done");
    const qloo = events.filter((e) => e.type === "qloo");
    expect(qloo.length).toBe(result.calls.length);
    expect(qloo.every((e) => e.type === "qloo" && e.stepId > 0)).toBe(true);
    // the client-side reducer rebuilds the same picture
    let s: RunState = { status: "idle", steps: [], calls: {} };
    for (const e of events) s = reduce(s, e);
    expect(s.status).toBe("done");
    expect(s.steps.every((x) => x.status !== "running")).toBe(true);
    expect(Object.values(s.calls).flat()).toHaveLength(result.calls.length);
  });

  it("fails gracefully for an artist with no fixture", async () => {
    const { result } = await run("Totally Unknown Band", "north-america");
    expect(result.error).toMatch(/QLOO_API_KEY|No fixture/);
    expect(result.steps).toHaveLength(1);
  });

  it("uses the promoter's shortlist when given one", async () => {
    const { result } = await run("Noah Kahan", "north-america", undefined, ["Burlington, VT", "Miami, FL", "Boston, MA"]);
    expect(result.steps[3].tool).toBe("rank_cities");
  });
});

/** A scripted LLM that plays the planner: it chooses tools, then finishes. */
function scriptedLlm(script: Array<Partial<ChatResult> & { tool?: string; args?: object }>): LlmClient & { seen: ChatMessage[][] } {
  let i = 0;
  const seen: ChatMessage[][] = [];
  return {
    model: "scripted",
    seen,
    async chat(messages, opts) {
      seen.push([...messages]);
      if (!opts?.tools) return { content: '{"cities":["New York, NY","Los Angeles, CA","Boston, MA"],"support_acts":["Jesse Jo Stark"],"sponsors":["Pepsi"],"reasoning":"Big cities."}', toolCalls: [] };
      const step = script[Math.min(i++, script.length - 1)];
      return {
        content: step.content ?? null,
        toolCalls: step.tool ? [{ id: `c${i}`, type: "function", function: { name: step.tool, arguments: JSON.stringify(step.args ?? {}) } }] : [],
      };
    },
  };
}

describe("agent, LLM planner", () => {
  it("lets the model choose tools and write the brief, and the coverage guard fills gaps", async () => {
    const llm = scriptedLlm([
      { content: "I need the artist ID first.", tool: "resolve_artist", args: { name: "Noah Kahan" } },
      { content: "Where do fans concentrate?", tool: "discover_markets", args: {} },
      { content: "Done.", tool: "finish", args: { headline: "Model headline", routing: "r", support: "s", sponsors: "p" } },
    ]);
    const events: AgentEvent[] = [];
    const client = new QlooClient({});
    const result = await runAgent(normaliseInput({ artist: "Noah Kahan", region: "north-america" }), { client, bindCalls: () => {}, emit: (e) => events.push(e), runId: "t", today: TODAY, llm });
    expect(result.mode.planner).toBe("llm");
    expect(result.brief.headline).toBe("Model headline");
    expect(result.steps[0].thought).toBe("I need the artist ID first.");
    // finish was called early, so the guard ran the missing decisions itself
    const auto = result.steps.filter((s) => s.auto).map((s) => s.tool);
    expect(auto).toEqual(expect.arrayContaining(["find_venues", "find_support_acts", "support_overlap_by_market", "find_sponsors"]));
    expect(result.plan.sponsors.length).toBe(3);
    // tool results go back to the model
    expect(llm.seen.some((msgs) => msgs.some((m) => m.role === "tool" && m.name === "discover_markets"))).toBe(true);
    // the live baseline came from the same LLM, without tools
    expect(result.baseline?.source).toBe("llm");
    expect(result.contrast?.llmCities.length).toBe(3);
  });

  it("reports unknown tools as errors without crashing", async () => {
    const llm = scriptedLlm([
      { tool: "resolve_artist", args: { name: "Noah Kahan" } },
      { tool: "launch_rockets", args: {} },
      { tool: "finish", args: { headline: "h", routing: "r", support: "s", sponsors: "p" } },
    ]);
    const client = new QlooClient({});
    const result = await runAgent(normaliseInput({ artist: "Noah Kahan", region: "north-america" }), { client, bindCalls: () => {}, emit: () => {}, runId: "t", today: TODAY, llm });
    expect(result.steps.find((s) => s.tool === "launch_rockets")?.status).toBe("error");
    expect(result.plan.route.order.length).toBeGreaterThan(0);
  });
});
