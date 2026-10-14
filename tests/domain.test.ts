import { describe, expect, it } from "vitest";
import { CITIES, REGIONS, citiesInRegion, distanceKm, findCity, nearestCity, orderRoute } from "@/lib/geo";
import { localOnlyBrands, median, scoreMarkets, scoreSupportActs, trendDirection, type Market, type SupportAct } from "@/lib/plan";
import { buildContrast } from "@/lib/contrast";
import { briefCsv, templateBrief } from "@/lib/agent/brief";
import { emptyPlan } from "@/lib/plan";

const market = (key: string, o: Partial<Market>): Market => {
  const [city, admin] = key.split(", ");
  return { key, city, admin, country: "US", lat: 40, lon: -75, score: 0, overIndex: 0, tier: "skip", venues: [], localSpots: [], sources: [], ...o };
};

describe("geo", () => {
  it("resolves cities with and without qualifiers", () => {
    expect(findCity("Portland, ME")?.admin).toBe("ME");
    expect(findCity("Portland, OR")?.admin).toBe("OR");
    expect(findCity("glasgow, uk")?.country).toBe("GB");
    expect(findCity("Birmingham", ["GB"])?.country).toBe("GB");
    expect(findCity("Atlantis")).toBeUndefined();
  });
  it("labels heatmap points with the nearest city within range", () => {
    expect(nearestCity(42.36, -71.06)?.name).toBe("Boston");
    expect(nearestCity(0, 0)).toBeUndefined();
  });
  it("keeps region cities inside the region box", () => {
    const uk = citiesInRegion(REGIONS["uk-europe"]);
    expect(uk.some((c) => c.name === "Dublin")).toBe(true);
    expect(uk.some((c) => c.country === "US")).toBe(false);
  });
  it("orders a route shorter than the input order", () => {
    const pick = ["Seattle", "Miami", "Portland", "Atlanta", "Denver", "Boston"].map((n) => CITIES.find((c) => c.name === n)!);
    const naive = pick.slice(1).reduce((s, p, i) => s + distanceKm(pick[i], p), 0);
    const { order, km } = orderRoute(pick);
    expect(order).toHaveLength(pick.length);
    expect(order[0].name).toBe("Seattle");
    expect(km).toBeLessThan(naive);
  });
});

describe("market scoring", () => {
  const scored = scoreMarkets([
    market("Big, NY", { heatAffinity: 0.6, heatPopularity: 0.98, localAffinity: 0.6 }),
    market("Small, VT", { heatAffinity: 0.99, heatPopularity: 0.2, localAffinity: 0.95 }),
    market("Both, MA", { heatAffinity: 0.95, heatPopularity: 0.9, localAffinity: 0.9 }),
    market("Cold, NV", { heatAffinity: 0.3, heatPopularity: 0.3, localAffinity: 0.3 }),
  ]);
  const by = (k: string) => scored.find((m) => m.key === k)!;
  it("finds the sleeper: high concentration, low volume", () => {
    expect(by("Small, VT").tier).toBe("sleeper");
    expect(by("Small, VT").overIndex).toBeGreaterThan(0.5);
  });
  it("labels anchors and volume markets", () => {
    expect(by("Both, MA").tier).toBe("anchor");
    expect(by("Big, NY").tier).toBe("volume");
    expect(by("Cold, NV").tier).toBe("skip");
  });
  it("ranks by score, concentration first", () => {
    expect(scored[0].key).toBe("Both, MA");
    expect(by("Small, VT").score).toBeGreaterThan(by("Big, NY").score);
  });
  it("scores markets with only a local signal without inventing volume", () => {
    const [m] = scoreMarkets([market("Only, TX", { localAffinity: 0.8 }), market("Other, TX", { localAffinity: 0.4 })]);
    expect(m.overIndex).toBe(0);
    expect(m.score).toBe(100);
  });
  it("median", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

describe("support acts, sponsors, trend", () => {
  it("blends per-market overlap with global affinity", () => {
    const acts: SupportAct[] = [
      { id: "a", name: "A", affinity: 0.9, perMarket: { x: 0.5 }, sharedTags: [], fitScore: 0 },
      { id: "b", name: "B", affinity: 0.7, perMarket: { x: 0.9 }, sharedTags: [], fitScore: 0 },
      { id: "c", name: "C", affinity: 0.8, perMarket: {}, sharedTags: [], fitScore: 0 },
    ];
    const s = scoreSupportActs(acts);
    expect(s.map((a) => a.name)).toEqual(["B", "C", "A"]);
    expect(s[0].fitScore).toBe(84);
  });
  it("finds local-only sponsor leads", () => {
    const leads = localOnlyBrands({
      national: [{ id: "1", name: "Big", markets: [] }],
      byMarket: { "Burlington, VT": [{ id: "1", name: "Big", markets: [] }, { id: "2", name: "Local", markets: [] }] },
    });
    expect(leads).toEqual([{ market: "Burlington, VT", brand: "Local" }]);
  });
  it("reads trend direction", () => {
    expect(trendDirection([80, 82, 84, 86, 88, 90].map((percentile) => ({ percentile })))).toBe("rising");
    expect(trendDirection([90, 88, 86, 84, 82, 80].map((percentile) => ({ percentile })))).toBe("falling");
    expect(trendDirection([85, 85.5, 85].map((percentile) => ({ percentile })))).toBe("steady");
  });
});

describe("contrast with the plain LLM", () => {
  const markets = scoreMarkets([
    market("Boston, MA", { heatAffinity: 0.95, heatPopularity: 0.9, localAffinity: 0.9 }),
    market("Burlington, VT", { heatAffinity: 0.99, heatPopularity: 0.2, localAffinity: 0.95 }),
    market("Los Angeles, CA", { heatAffinity: 0.5, heatPopularity: 0.95, localAffinity: 0.5 }),
    market("Miami, FL", { heatAffinity: 0.3, heatPopularity: 0.9, localAffinity: 0.3 }),
  ]);
  const c = buildContrast({
    llmCities: ["Los Angeles, CA", "Miami", "Boston, MA", "Gotham"],
    markets,
    routeKeys: ["Boston, MA", "Burlington, VT"],
    supportChecks: [{ name: "Made Up Band" }],
    supportActs: [{ id: "x", name: "Real Opener", perMarket: {}, sharedTags: [], fitScore: 88 }],
  });
  it("measures the LLM's cities on Qloo's scale", () => {
    expect(c.llmCities.find((x) => x.input === "Miami")?.market).toBe("Miami, FL");
    expect(c.llmCities.find((x) => x.input === "Gotham")?.score).toBeUndefined();
    expect(c.weakLlmPicks.map((x) => x.input)).toContain("Miami");
  });
  it("names the market the LLM missed", () => {
    expect(c.missedByLlm.map((m) => m.market)).toEqual(["Burlington, VT"]);
    expect(c.headline).toMatch(/Burlington, VT/);
    expect(c.qlooAvgScore!).toBeGreaterThan(c.llmAvgScore!);
    expect(c.overlapCount).toBe(1);
  });
});

describe("brief", () => {
  const plan = emptyPlan("north-america", 2, []);
  plan.artist = { id: "a", name: "Test Artist" };
  plan.markets = scoreMarkets([
    market("Boston, MA", { heatAffinity: 0.95, heatPopularity: 0.9, localAffinity: 0.9, venues: [{ id: "v", name: 'The "Big" Room, Hall', address: "1 Main St" }] }),
    market("Burlington, VT", { heatAffinity: 0.99, heatPopularity: 0.2, localAffinity: 0.95 }),
  ]);
  plan.route = { order: ["Boston, MA", "Burlington, VT"], km: 300 };
  plan.supportActs = [{ id: "s", name: "Opener", perMarket: { "Boston, MA": 0.8 }, sharedTags: ["Folk"], fitScore: 80 }];
  plan.sponsors = [{ category: "Food & drink", national: [{ id: "b", name: "Brand", markets: [] }], byMarket: { "Boston, MA": [{ id: "b", name: "Brand", markets: [] }] }, localOnly: [] }];
  it("writes a template brief from Qloo results only", () => {
    const b = templateBrief(plan);
    expect(b.headline).toContain("Test Artist");
    expect(b.headline).toContain("Burlington");
    expect(b.support).toContain("Opener");
    expect(b.sponsors).toContain("Brand");
  });
  it("exports a CSV row per stop with proper escaping", () => {
    const csv = briefCsv(plan).trim().split("\n");
    expect(csv).toHaveLength(3);
    expect(csv[0]).toMatch(/^stop,market,tier,fan_score/);
    expect(csv[1]).toContain('"The ""Big"" Room, Hall"');
    expect(csv[1]).toContain("Food & drink: Brand");
  });
  it("neutralises spreadsheet formulas but keeps negative numbers", () => {
    const p2 = structuredClone(plan);
    p2.markets.find((m) => m.key === "Boston, MA")!.venues[0].name = "=HYPERLINK(\"x\")";
    const row = briefCsv(p2).split("\n")[1];
    expect(row).toContain(`"'=HYPERLINK(""x"")"`);
    expect(row).toMatch(/,-?\d\.\d\d,/); // over_index stays numeric, no leading quote
  });
});
