/**
 * Agent tools. Each one is a product-level step that the planner (LLM or rules) chooses to run;
 * each makes one or more documented Qloo calls and writes its findings into the shared TourPlan.
 * Nothing in here knows anything about any artist's taste: it only asks Qloo.
 */
import type { QlooClient } from "../qloo/client";
import { entityId, tagId, type QlooEntity, type QlooTag } from "../qloo/types";
import { CITIES, cityLabel, findCity, nearestCity, citiesInRegion, type City, type Region } from "../geo";
import { localOnlyBrands, trendDirection, type BrandPick, type Market, type SponsorCategory, type TourPlan, type Venue } from "../plan";

export interface ToolContext {
  client: QlooClient;
  plan: TourPlan;
  region: Region;
  /** Run-local memo for tag lookups so each concept is resolved once. */
  tagMemo: Map<string, string | undefined>;
  today?: Date;
}

export interface ToolResult {
  summary: string;
  data?: unknown;
}

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  run(ctx: ToolContext, args: Record<string, unknown>): Promise<ToolResult>;
}

const ARTIST = "urn:entity:artist";
const PLACE = "urn:entity:place";
const BRAND = "urn:entity:brand";

export const SPONSOR_CATEGORIES = [
  { label: "Food & drink", query: "food and beverage" },
  { label: "Fashion & apparel", query: "apparel and fashion" },
  { label: "Beer, wine & spirits", query: "alcoholic beverages" },
] as const;

function requireArtist(ctx: ToolContext) {
  if (!ctx.plan.artist) throw new Error("Resolve the artist first (resolve_artist).");
  return ctx.plan.artist;
}

const pct = (v?: number) => (v === undefined ? "n/a" : `${Math.round(v * 100)}`);
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter(Boolean) : typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);

function marketFor(ctx: ToolContext, city: City): Market {
  const key = cityLabel(city);
  let m = ctx.plan.markets.find((x) => x.key === key);
  if (!m) {
    m = { key, city: city.name, admin: city.admin, country: city.country, lat: city.lat, lon: city.lon, score: 0, overIndex: 0, tier: "skip", venues: [], localSpots: [], sources: [] };
    const heat = ctx.plan.heat.find((h) => h.key === key);
    if (heat) {
      m.heatAffinity = heat.affinity;
      m.heatPopularity = heat.popularity;
      m.sources.push("heatmap");
    }
    ctx.plan.markets.push(m);
  }
  return m;
}

/** The text Qloo resolves as a locality for signal/filter.location.query. */
export function locationQuery(m: Pick<Market, "city" | "admin" | "country">): string {
  return m.country === "US" || m.country === "CA" ? `${m.city}, ${m.admin}` : m.city;
}

function resolveMarkets(ctx: ToolContext, names: string[]): { markets: Market[]; unknown: string[] } {
  const markets: Market[] = [];
  const unknown: string[] = [];
  for (const n of names) {
    const existing = ctx.plan.markets.find((m) => m.key.toLowerCase() === n.toLowerCase() || m.city.toLowerCase() === n.toLowerCase());
    if (existing) {
      markets.push(existing);
      continue;
    }
    const city = findCity(n, ctx.region.countries);
    if (city) markets.push(marketFor(ctx, city));
    else unknown.push(n);
  }
  return { markets, unknown };
}

/** Markets the agent should go deep on: explicit list, else the current top N by score/affinity. */
function topMarkets(ctx: ToolContext, args: Record<string, unknown>, n: number): Market[] {
  const named = strArr(args.markets);
  if (named.length) return resolveMarkets(ctx, named).markets.slice(0, 10);
  return [...ctx.plan.markets]
    .sort((a, b) => (b.score || 0) - (a.score || 0) || (b.heatAffinity ?? b.localAffinity ?? 0) - (a.heatAffinity ?? a.localAffinity ?? 0))
    .slice(0, n);
}

/** Resolve a concept to a Qloo tag ID via /v2/tags, preferring tags that belong to the wanted entity type. */
export async function findTag(ctx: ToolContext, query: string, entityKind: "place" | "brand"): Promise<string | undefined> {
  const memoKey = `${entityKind}:${query}`;
  if (ctx.tagMemo.has(memoKey)) return ctx.tagMemo.get(memoKey);
  let id: string | undefined;
  try {
    const res = await ctx.client.tags(query, 20, { "feature.semantic_search": true });
    const tags = res.results.tags;
    const belongs = (t: QlooTag) =>
      tagId(t).includes(`:${entityKind}`) || (t.parents ?? []).some((p) => p.type === `urn:entity:${entityKind}`) || (t.types ?? []).includes(`urn:entity:${entityKind}`);
    id = tagId(tags.find(belongs) ?? tags[0] ?? {}) || undefined;
  } catch {
    id = undefined;
  }
  ctx.tagMemo.set(memoKey, id);
  return id;
}

function toVenue(e: QlooEntity): Venue {
  const loc = e.location as { lat?: number; lon?: number; lng?: number } | undefined;
  return {
    id: entityId(e),
    name: e.name,
    address: e.properties?.address,
    affinity: e.query?.affinity,
    lat: loc?.lat,
    lon: loc?.lon ?? loc?.lng,
  };
}

function toBrand(e: QlooEntity, market: string): BrandPick {
  return { id: entityId(e), name: e.name, affinity: e.query?.affinity, markets: [market] };
}

async function settle<T>(items: T[], fn: (t: T) => Promise<void>): Promise<number> {
  const results = await Promise.allSettled(items.map(fn));
  return results.filter((r) => r.status === "rejected").length;
}

// ---------------------------------------------------------------------------

export const TOOLS: ToolDef[] = [
  {
    name: "resolve_artist",
    description: "Look up the headliner in Qloo (/search, type artist) to get its Qloo entity ID and popularity. Always the first step.",
    parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
    async run(ctx, args) {
      const name = String(args.name ?? "").trim();
      const res = await ctx.client.search(name, ARTIST, 5);
      const hits = res.results;
      if (!hits.length) throw new Error(`Qloo has no artist matching "${name}".`);
      const exact = hits.find((h) => h.name.toLowerCase() === name.toLowerCase());
      const pick = exact ?? hits[0];
      ctx.plan.artist = {
        id: entityId(pick),
        name: pick.name,
        popularity: pick.popularity,
        image: pick.properties?.image?.url,
        description: pick.properties?.short_description ?? pick.properties?.description ?? pick.disambiguation,
      };
      return { summary: `Matched "${pick.name}" (popularity percentile ${pct(pick.popularity)}).`, data: ctx.plan.artist };
    },
  },
  {
    name: "taste_profile",
    description: "Qloo taste analysis (/v2/insights filter.type=urn:tag) of the headliner's audience: the genres and themes that define the fan base.",
    parameters: { type: "object", properties: {} },
    async run(ctx) {
      const artist = requireArtist(ctx);
      const res = await ctx.client.tasteTags({ "signal.interests.entities": artist.id, "filter.parents.types": ARTIST, take: 12 });
      ctx.plan.tasteTags = res.results.tags.map((t) => ({ id: tagId(t), name: t.name, affinity: t.query?.affinity }));
      return { summary: `Fan taste: ${ctx.plan.tasteTags.slice(0, 6).map((t) => t.name).join(", ") || "no tags returned"}.` };
    },
  },
  {
    name: "audience_demographics",
    description: "Age and gender skew of the headliner's audience (/v2/insights filter.type=urn:demographics). Useful for sponsor fit.",
    parameters: { type: "object", properties: {} },
    async run(ctx) {
      const artist = requireArtist(ctx);
      const res = await ctx.client.demographics({ "signal.interests.entities": artist.id });
      const d = res.results.demographics.find((x) => x.entity_id === artist.id) ?? res.results.demographics[0];
      if (!d) return { summary: "No demographic data returned." };
      ctx.plan.demographics = { age: d.query.age ?? {}, gender: d.query.gender ?? {} };
      const topAge = Object.entries(ctx.plan.demographics.age).sort((a, b) => b[1] - a[1])[0];
      const g = Object.entries(ctx.plan.demographics.gender).sort((a, b) => b[1] - a[1])[0];
      return { summary: `Audience skews ${topAge ? topAge[0].replace(/_/g, " ") : "n/a"}${g ? `, leans ${g[0]}` : ""}.` };
    },
  },
  {
    name: "discover_markets",
    description:
      "Find where the headliner's fans concentrate across the tour region with a Qloo heatmap (/v2/insights filter.type=urn:heatmap, filter.location=<region polygon>, output.heatmap.boundary=urn:geohash, folded into cities). Use when no city list is given, or to find markets the promoter did not think of.",
    parameters: { type: "object", properties: { limit: { type: "integer", description: "max cities to keep (default 14)" } } },
    async run(ctx, args) {
      const artist = requireArtist(ctx);
      const limit = Math.min(Number(args.limit ?? 14) || 14, 25);
      const res = await ctx.client.heatmap({
        "signal.interests.entities": artist.id,
        "filter.location": ctx.region.wkt,
        // Geohash cells (the default boundary) come back in ~2 s; urn:entity:locality took ~50 s on the live API. Cells are folded into cities below.
        "output.heatmap.boundary": "urn:geohash",
        take: 50,
      });
      // Points may arrive per city or per geohash: fold them into gazetteer cities.
      const pool = citiesInRegion(ctx.region);
      const byCity = new Map<string, { city: City; aff: number; pop: number[] }>();
      for (const p of res.results.heatmap) {
        const city = nearestCity(p.location.latitude, p.location.longitude, 60, pool);
        if (!city) continue;
        const k = cityLabel(city);
        const cur = byCity.get(k) ?? { city, aff: -1, pop: [] };
        cur.aff = Math.max(cur.aff, p.query.affinity);
        if (p.query.popularity !== undefined) cur.pop.push(p.query.popularity);
        byCity.set(k, cur);
      }
      const all = [...byCity.values()].sort((a, b) => b.aff - a.aff);
      const avg = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : undefined);
      ctx.plan.heat = all.map((r) => ({ key: cityLabel(r.city), lat: r.city.lat, lon: r.city.lon, affinity: r.aff, popularity: avg(r.pop) }));
      // Markets that already exist (e.g. from the promoter's shortlist) pick up their heat values too.
      for (const m of ctx.plan.markets) {
        const h = ctx.plan.heat.find((x) => x.key === m.key);
        if (h) {
          m.heatAffinity = h.affinity;
          m.heatPopularity = h.popularity;
          if (!m.sources.includes("heatmap")) m.sources.push("heatmap");
        }
      }
      const ranked = all.slice(0, limit);
      for (const r of ranked) {
        const m = marketFor(ctx, r.city);
        if (!m.sources.includes("heatmap")) m.sources.push("heatmap");
      }
      return {
        summary: `${res.results.heatmap.length} heatmap points → ${ranked.length} cities. Hottest: ${ranked.slice(0, 5).map((r) => `${r.city.name} ${pct(r.aff)}`).join(", ")}.`,
      };
    },
  },
  {
    name: "rank_cities",
    description:
      "Score specific cities for the headliner: one Qloo call per city (/v2/insights filter.type=urn:entity:artist, filter.results.entities=<headliner>, signal.location.query=<city>) returning the artist's affinity in that city. Use for the promoter's candidate list, to confirm heatmap picks, or to fact-check another plan's cities.",
    parameters: { type: "object", properties: { cities: { type: "array", items: { type: "string" } } }, required: ["cities"] },
    async run(ctx, args) {
      const artist = requireArtist(ctx);
      const { markets, unknown } = resolveMarkets(ctx, strArr(args.cities).slice(0, 16));
      const failed = await settle(markets, async (m) => {
        const res = await ctx.client.insightsEntities({
          "filter.type": ARTIST,
          "filter.results.entities": artist.id,
          "signal.location.query": locationQuery(m),
          take: 1,
        });
        const hit = res.results.entities.find((e) => entityId(e) === artist.id) ?? res.results.entities[0];
        if (hit?.query?.affinity !== undefined) {
          m.localAffinity = hit.query.affinity;
          if (!m.sources.includes("rank")) m.sources.push("rank");
        }
      });
      const scored = markets.filter((m) => m.localAffinity !== undefined).sort((a, b) => b.localAffinity! - a.localAffinity!);
      return {
        summary:
          `Scored ${scored.length}/${markets.length} cities. ` +
          scored.slice(0, 6).map((m) => `${m.city} ${pct(m.localAffinity)}`).join(", ") +
          (unknown.length ? `. Unknown city names: ${unknown.join(", ")}` : "") +
          (failed ? `. ${failed} lookups failed` : ""),
        data: scored.map((m) => ({ market: m.key, affinity: m.localAffinity })),
      };
    },
  },
  {
    name: "find_venues",
    description:
      "For chosen markets, find music venues whose patrons share the headliner's taste (/v2/tags to find the venue tag, then /v2/insights filter.type=urn:entity:place with filter.location.query=<city>, filter.tags=<venue tag>, signal.interests.entities=<headliner>).",
    parameters: { type: "object", properties: { markets: { type: "array", items: { type: "string" } } } },
    async run(ctx, args) {
      const artist = requireArtist(ctx);
      const venueTag = ctx.plan.venueTagId ?? (await findTag(ctx, "music venue", "place"));
      ctx.plan.venueTagId = venueTag;
      const markets = topMarkets(ctx, args, 5);
      await settle(markets, async (m) => {
        const res = await ctx.client.insightsEntities({
          "filter.type": PLACE,
          "filter.location.query": locationQuery(m),
          "filter.tags": venueTag,
          "signal.interests.entities": artist.id,
          take: 5,
        });
        m.venues = res.results.entities.map(toVenue);
        m.venuesSearched = true;
      });
      return {
        summary: markets.map((m) => `${m.city}: ${m.venues[0]?.name ?? "no Qloo venue match"}`).join("; ") + (venueTag ? "" : " (no venue tag found; results unfiltered)"),
      };
    },
  },
  {
    name: "find_support_acts",
    description:
      "Candidate opening acts: artists the headliner's fans also love but who are less popular than the headliner (/v2/insights filter.type=urn:entity:artist, signal.interests.entities=<headliner>, filter.popularity.max, feature.explainability=true).",
    parameters: { type: "object", properties: { max_popularity: { type: "number", description: "0-1 percentile cap; default just under the headliner" } } },
    async run(ctx, args) {
      const artist = requireArtist(ctx);
      const cap = Number(args.max_popularity) || Math.max(0.5, Math.round(((artist.popularity ?? 0.9) - 0.02) * 100) / 100);
      const res = await ctx.client.insightsEntities({
        "filter.type": ARTIST,
        "signal.interests.entities": artist.id,
        "filter.exclude.entities": artist.id,
        "filter.popularity.max": cap,
        "feature.explainability": true,
        take: 10,
      });
      ctx.plan.supportActs = res.results.entities.map((e) => ({
        id: entityId(e),
        name: e.name,
        popularity: e.popularity,
        affinity: e.query?.affinity,
        image: e.properties?.image?.url,
        perMarket: {},
        sharedTags: [],
        fitScore: 0,
      }));
      return { summary: `${ctx.plan.supportActs.length} candidates under popularity ${pct(cap)}: ${ctx.plan.supportActs.slice(0, 5).map((a) => a.name).join(", ")}.` };
    },
  },
  {
    name: "support_overlap_by_market",
    description:
      "For each chosen market, re-rank the support-act candidates by how much the headliner's fans IN THAT CITY like them (/v2/insights filter.type=urn:entity:artist, filter.results.entities=<candidates>, signal.interests.entities=<headliner>, signal.location.query=<city>).",
    parameters: { type: "object", properties: { markets: { type: "array", items: { type: "string" } } } },
    async run(ctx, args) {
      const artist = requireArtist(ctx);
      const ids = ctx.plan.supportActs.map((a) => a.id);
      if (!ids.length) throw new Error("Find support-act candidates first (find_support_acts).");
      const markets = topMarkets(ctx, args, 4);
      await settle(markets, async (m) => {
        const res = await ctx.client.insightsEntities({
          "filter.type": ARTIST,
          "filter.results.entities": ids,
          "signal.interests.entities": artist.id,
          "signal.location.query": locationQuery(m),
          take: ids.length,
        });
        for (const e of res.results.entities) {
          const act = ctx.plan.supportActs.find((a) => a.id === entityId(e));
          if (act && e.query?.affinity !== undefined) act.perMarket[m.key] = e.query.affinity;
        }
      });
      const leaders = markets.map((m) => {
        const best = [...ctx.plan.supportActs].sort((a, b) => (b.perMarket[m.key] ?? 0) - (a.perMarket[m.key] ?? 0))[0];
        return `${m.city}: ${best?.name ?? "n/a"}`;
      });
      return { summary: `Best local fit → ${leaders.join("; ")}.` };
    },
  },
  {
    name: "explain_overlap",
    description: "Explain why fans overlap: Qloo audience comparison (/v2/analysis/compare a=<headliner>, b=<support act>) returning the shared taste tags.",
    parameters: { type: "object", properties: { support_act_ids: { type: "array", items: { type: "string" } } } },
    async run(ctx, args) {
      const artist = requireArtist(ctx);
      let ids = strArr(args.support_act_ids);
      if (!ids.length) ids = ctx.plan.supportActs.slice(0, 2).map((a) => a.id);
      let acts = ctx.plan.supportActs.filter((a) => ids.includes(a.id) || ids.includes(a.name)).slice(0, 3);
      if (!acts.length) acts = ctx.plan.supportActs.slice(0, 2); // e.g. the planner passed the headliner's own ID
      if (!acts.length) throw new Error("Find support-act candidates first (find_support_acts).");
      await settle(acts, async (act) => {
        const res = await ctx.client.compare([artist.id], [act.id], { take: 8 });
        const r = res.results as unknown;
        const tags: QlooTag[] = Array.isArray(r) ? r : ((r as { tags?: QlooTag[]; entities?: QlooTag[] }).tags ?? (r as { entities?: QlooTag[] }).entities ?? []);
        act.sharedTags = tags.map((t) => t.name).filter(Boolean).slice(0, 6);
      });
      return { summary: acts.map((a) => `${a.name}: ${a.sharedTags.slice(0, 4).join(", ") || "no shared tags returned"}`).join(" | ") };
    },
  },
  {
    name: "find_sponsors",
    description:
      "Cross-domain sponsor and merch leads: brands the headliner's audience over-indexes on, region-wide and per market (/v2/tags for the category tag, then /v2/insights filter.type=urn:entity:brand with signal.interests.entities=<headliner>, filter.tags=<category>, and signal.location.query=<city> per market).",
    parameters: {
      type: "object",
      properties: {
        markets: { type: "array", items: { type: "string" } },
        categories: { type: "array", items: { type: "string" }, description: `subset of: ${SPONSOR_CATEGORIES.map((c) => c.label).join(", ")}` },
      },
    },
    async run(ctx, args) {
      const artist = requireArtist(ctx);
      const wanted = strArr(args.categories);
      const cats = SPONSOR_CATEGORIES.filter((c) => !wanted.length || wanted.some((w) => c.label.toLowerCase().includes(w.toLowerCase().split(/[ &,]/)[0])));
      const markets = topMarkets(ctx, args, 3);
      const out: SponsorCategory[] = [];
      for (const cat of cats.length ? cats : SPONSOR_CATEGORIES) {
        const tag = await findTag(ctx, cat.query, "brand");
        const sc: SponsorCategory = { category: cat.label, tagId: tag, national: [], byMarket: {}, localOnly: [] };
        const base = { "filter.type": BRAND, "signal.interests.entities": artist.id, "filter.tags": tag, take: 6 };
        await Promise.allSettled([
          ctx.client.insightsEntities(base).then((r) => {
            sc.national = r.results.entities.map((e) => toBrand(e, "national"));
          }),
          ...markets.map((m) =>
            ctx.client.insightsEntities({ ...base, "signal.location.query": locationQuery(m) }).then((r) => {
              sc.byMarket[m.key] = r.results.entities.map((e) => toBrand(e, m.key));
            }),
          ),
        ]);
        for (const b of sc.national) b.markets = ["national", ...Object.entries(sc.byMarket).filter(([, l]) => l.some((x) => x.id === b.id)).map(([k]) => k)];
        sc.localOnly = localOnlyBrands(sc);
        out.push(sc);
      }
      ctx.plan.sponsors = out;
      return {
        summary: out.map((c) => `${c.category}: ${c.national.slice(0, 3).map((b) => b.name).join(", ") || "none"}${c.localOnly.length ? ` (+${c.localOnly.length} local-only leads)` : ""}`).join(" | "),
      };
    },
  },
  {
    name: "find_local_partners",
    description: "Pre/after-show hospitality partners: bars near each market whose patrons share the headliner's taste (/v2/tags for the bar tag, then /v2/insights filter.type=urn:entity:place, filter.location.query=<city>).",
    parameters: { type: "object", properties: { markets: { type: "array", items: { type: "string" } } } },
    async run(ctx, args) {
      const artist = requireArtist(ctx);
      const tag = await findTag(ctx, "bar", "place");
      const markets = topMarkets(ctx, args, 3);
      await settle(markets, async (m) => {
        const res = await ctx.client.insightsEntities({
          "filter.type": PLACE,
          "filter.location.query": locationQuery(m),
          "filter.tags": tag,
          "signal.interests.entities": artist.id,
          take: 3,
        });
        m.localSpots = res.results.entities.map(toVenue);
      });
      return { summary: markets.map((m) => `${m.city}: ${m.localSpots.map((s) => s.name).join(", ") || "none"}`).join("; ") };
    },
  },
  {
    name: "audience_trend",
    description: "Is the headliner's audience growing? Qloo trending time series for the last 6 months (/v2/trending). Use to size the tour (rooms vs. arenas).",
    parameters: { type: "object", properties: {} },
    async run(ctx) {
      const artist = requireArtist(ctx);
      const end = ctx.today ?? new Date();
      const start = new Date(end.getTime() - 182 * 86400000);
      const iso = (d: Date) => d.toISOString().slice(0, 10);
      const res = await ctx.client.trending({
        "filter.type": ARTIST,
        "signal.interests.entities": artist.id,
        "filter.start_date": iso(start),
        "filter.end_date": iso(end),
      });
      const points = res.results.trending
        .filter((p) => p.population_percentile !== undefined)
        .map((p) => ({ date: p.date, percentile: p.population_percentile! }));
      ctx.plan.trend = { points, direction: trendDirection(points) };
      const last = points[points.length - 1];
      return { summary: `${points.length} data points; audience ${ctx.plan.trend.direction}${last ? `, now at the ${Math.round(last.percentile)}th percentile` : ""}.` };
    },
  },
];

/**
 * Fact-check named artists (e.g. the plain LLM's suggested openers): resolve each with /search,
 * then one /v2/insights call ranks them all against the headliner's audience.
 */
export async function scoreNamedArtists(ctx: ToolContext, names: string[]): Promise<Array<{ name: string; id?: string; affinity?: number }>> {
  const artist = requireArtist(ctx);
  const resolved = await Promise.all(
    names.slice(0, 5).map(async (name) => {
      try {
        const r = await ctx.client.search(name, ARTIST, 1);
        const hit = r.results[0];
        return { name, id: hit ? entityId(hit) : undefined };
      } catch {
        return { name, id: undefined };
      }
    }),
  );
  const ids = resolved.map((r) => r.id).filter((x): x is string => !!x && x !== artist.id);
  if (!ids.length) return resolved;
  try {
    const res = await ctx.client.insightsEntities({
      "filter.type": ARTIST,
      "filter.results.entities": ids,
      "signal.interests.entities": artist.id,
      take: ids.length,
    });
    const aff = new Map(res.results.entities.map((e) => [entityId(e), e.query?.affinity]));
    return resolved.map((r) => ({ ...r, affinity: r.id ? aff.get(r.id) : undefined }));
  } catch {
    return resolved;
  }
}

export const FINISH_TOOL = {
  name: "finish",
  description: "Call once every decision (routing, support act, sponsors) is grounded in Qloo results. Write the brief's headline and one-paragraph rationale for each decision, citing the Qloo numbers you saw.",
  parameters: {
    type: "object",
    properties: {
      headline: { type: "string" },
      routing: { type: "string" },
      support: { type: "string" },
      sponsors: { type: "string" },
    },
    required: ["headline", "routing", "support", "sponsors"],
  },
};

export function toolByName(name: string): ToolDef | undefined {
  return TOOLS.find((t) => t.name === name);
}

export { CITIES };
