import type { RegionId } from "./geo";

export interface ArtistRef {
  id: string;
  name: string;
  popularity?: number;
  image?: string;
  description?: string;
}

export type MarketTier = "anchor" | "sleeper" | "volume" | "skip";

export interface Venue {
  id: string;
  name: string;
  address?: string;
  affinity?: number;
  lat?: number;
  lon?: number;
}

export interface Market {
  key: string; // "Austin, TX"
  city: string;
  admin: string;
  country: string;
  lat: number;
  lon: number;
  /** Heatmap affinity for the artist at this city (0-1, from urn:heatmap). */
  heatAffinity?: number;
  /** Heatmap popularity: volume of the signal at this city (0-1). */
  heatPopularity?: number;
  /** Artist affinity when Qloo is given this city as signal.location (0-1, from urn:entity:artist rank). */
  localAffinity?: number;
  /** Qloo affinity blend on Qloo's own scale, times 100 (not rescaled). Used to pick the route, never to grade it. */
  score: number;
  /** Concentration percentile minus volume percentile within the region. >0 = over-indexes for its size. */
  overIndex: number;
  tier: MarketTier;
  venues: Venue[];
  /** True once find_venues has asked Qloo about this market (so "no venues" means "no Qloo match"). */
  venuesSearched?: boolean;
  localSpots: Venue[];
  sources: Array<"heatmap" | "rank">;
}

export interface SupportAct {
  id: string;
  name: string;
  popularity?: number;
  affinity?: number;
  image?: string;
  /** Affinity of this act with the headliner's fans, per market key (0-1). */
  perMarket: Record<string, number>;
  sharedTags: string[];
  fitScore: number;
}

export interface BrandPick {
  id: string;
  name: string;
  affinity?: number;
  /** Market keys where this brand ranks for the artist's audience; "national" for the region-wide query. */
  markets: string[];
}

export interface SponsorCategory {
  category: string;
  tagId?: string;
  national: BrandPick[];
  byMarket: Record<string, BrandPick[]>;
  /** Brands that show up in a market list but not nationally: local activation leads. */
  localOnly: Array<{ market: string; brand: string }>;
}

export interface HeatCity {
  key: string;
  lat: number;
  lon: number;
  affinity: number;
  popularity?: number;
}

export interface TourPlan {
  artist?: ArtistRef;
  /** Every heatmap point Qloo returned for the region, folded to cities (drawn on the map, and the scale for scoring). */
  heat: HeatCity[];
  regionId: RegionId;
  dates: number;
  candidateCities: string[];
  tasteTags: Array<{ id: string; name: string; affinity?: number }>;
  demographics?: { age: Record<string, number>; gender: Record<string, number> };
  markets: Market[];
  route: { order: string[]; km: number };
  supportActs: SupportAct[];
  sponsors: SponsorCategory[];
  trend?: { points: Array<{ date: string; percentile: number }>; direction: "rising" | "steady" | "falling" };
  venueTagId?: string;
  notes: string[];
}

export function emptyPlan(regionId: RegionId, dates: number, candidateCities: string[]): TourPlan {
  return {
    regionId,
    dates,
    candidateCities,
    heat: [],
    tasteTags: [],
    markets: [],
    route: { order: [], km: 0 },
    supportActs: [],
    sponsors: [],
    notes: [],
  };
}

/** Mid-rank percentile of v within a sample: 0.5/n for the lowest, (n-0.5)/n for the highest. Ties share a rank. */
export function percentileOf(sample: number[]): (v: number) => number {
  const n = sample.length;
  return (v) => {
    if (!n) return 0.5;
    let below = 0;
    let equal = 0;
    for (const x of sample) {
      if (x < v - 1e-12) below++;
      else if (Math.abs(x - v) <= 1e-12) equal++;
    }
    return (below + Math.max(equal, 1) / 2) / n;
  };
}

/**
 * Score and tier markets from whatever Qloo signals we have.
 *
 * The fan score is Qloo's own 0-1 affinity on Qloo's own scale (times 100), not rescaled: a city
 * is never shown as "0" just because it is the coldest one in the run. It blends:
 * - concentration = heatmap affinity and/or location-conditioned artist affinity
 * - volume        = heatmap popularity
 * Tiers compare each market with the rest of the region (percentiles):
 * anchor (both high), sleeper (concentration high, volume low), volume (big but diluted), skip.
 *
 * Headliner picks its route with this score, so the score is NOT used to grade the route
 * against a plain LLM. That is the outside referee's job (src/lib/referee).
 */
export function scoreMarkets(markets: Market[], heatScale: HeatCity[] = []): Market[] {
  if (markets.length === 0) return markets;
  // Percentiles are taken over the whole region's heatmap when we have it, one value per city.
  const heatByKey = new Map<string, { affinity: number; popularity?: number }>();
  for (const h of heatScale) heatByKey.set(h.key, { affinity: h.affinity, popularity: h.popularity });
  for (const m of markets) if (m.heatAffinity !== undefined && !heatByKey.has(m.key)) heatByKey.set(m.key, { affinity: m.heatAffinity, popularity: m.heatPopularity });

  const raw = markets.map((m) => {
    const parts: Array<[number, number]> = [];
    if (m.heatAffinity !== undefined) parts.push([m.heatAffinity, 0.6]);
    if (m.localAffinity !== undefined) parts.push([m.localAffinity, m.heatAffinity !== undefined ? 0.4 : 1]);
    const w = parts.reduce((s, [, wt]) => s + wt, 0);
    return { m, concentration: w ? parts.reduce((s, [v, wt]) => s + v * wt, 0) / w : undefined };
  });
  const pConc = percentileOf(raw.filter((r) => r.concentration !== undefined).map((r) => r.concentration!));
  const pops = [...heatByKey.values()].filter((h) => h.popularity !== undefined).map((h) => h.popularity!);
  const pPop = percentileOf(pops);

  const scored = raw.map(({ m, concentration }) => {
    const conc = concentration ?? 0;
    const volume = m.heatPopularity;
    // Concentration drives the decision; volume nudges it (a full room beats a passionate empty one).
    const score = Math.round((volume === undefined ? conc : 0.75 * conc + 0.25 * volume) * 100);
    const concPct = concentration === undefined ? 0 : pConc(concentration);
    const volPct = volume === undefined || !pops.length ? undefined : pPop(volume);
    const overIndex = volPct === undefined ? 0 : Math.round((concPct - volPct) * 100) / 100;
    return { ...m, score, overIndex, concPct, volPct };
  });

  const medianScore = median(scored.map((m) => m.score));
  return scored
    .map(({ concPct, volPct, ...m }) => {
      let tier: MarketTier;
      if (volPct === undefined) tier = concPct >= 0.5 && m.score >= medianScore ? "anchor" : "skip";
      else if (concPct >= 0.6 && volPct >= 0.5) tier = "anchor";
      else if (concPct >= 0.55 && m.overIndex >= 0.15) tier = "sleeper";
      else if (volPct >= 0.6) tier = "volume";
      else tier = m.score >= medianScore ? "anchor" : "skip";
      return { ...m, tier };
    })
    .sort((a, b) => b.score - a.score);
}

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Fit = mean per-market overlap (when we have it) blended with global affinity to the headliner. */
export function scoreSupportActs(acts: SupportAct[]): SupportAct[] {
  return acts
    .map((a) => {
      const per = Object.values(a.perMarket);
      const local = per.length ? per.reduce((s, v) => s + v, 0) / per.length : undefined;
      const global = a.affinity;
      const fit =
        local !== undefined && global !== undefined ? 0.7 * local + 0.3 * global : (local ?? global ?? 0);
      return { ...a, fitScore: Math.round(fit * 100) };
    })
    .sort((a, b) => b.fitScore - a.fitScore);
}

/** Brands that appear in a market's list but not in the national list. */
export function localOnlyBrands(cat: Pick<SponsorCategory, "national" | "byMarket">): Array<{ market: string; brand: string }> {
  const national = new Set(cat.national.map((b) => b.id));
  const out: Array<{ market: string; brand: string }> = [];
  for (const [market, picks] of Object.entries(cat.byMarket)) {
    for (const b of picks) if (!national.has(b.id)) out.push({ market, brand: b.name });
  }
  return out;
}

export function trendDirection(points: Array<{ percentile: number }>): "rising" | "steady" | "falling" {
  if (points.length < 2) return "steady";
  const k = Math.max(1, Math.floor(points.length / 3));
  const first = points.slice(0, k).reduce((s, p) => s + p.percentile, 0) / k;
  const last = points.slice(-k).reduce((s, p) => s + p.percentile, 0) / k;
  const delta = last - first;
  return delta > 2 ? "rising" : delta < -2 ? "falling" : "steady";
}
