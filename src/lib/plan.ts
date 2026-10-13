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
  /** Blended 0-100 score used for ranking. */
  score: number;
  /** Fan concentration minus fan volume, both normalised across markets. >0 = over-indexes for its size. */
  overIndex: number;
  tier: MarketTier;
  venues: Venue[];
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

export interface TourPlan {
  artist?: ArtistRef;
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
    tasteTags: [],
    markets: [],
    route: { order: [], km: 0 },
    supportActs: [],
    sponsors: [],
    notes: [],
  };
}

function minMax(values: number[]): (v: number) => number {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return (v) => (hi - lo < 1e-9 ? 0.5 : (v - lo) / (hi - lo));
}

/**
 * Score and tier markets from whatever Qloo signals we have.
 * - concentration = heatmap affinity and/or location-conditioned artist affinity
 * - volume        = heatmap popularity
 * Tiers: anchor (both high), sleeper (concentration high, volume low: the secondary market
 * an LLM overlooks), volume (big but diluted), skip.
 */
export function scoreMarkets(markets: Market[]): Market[] {
  if (markets.length === 0) return markets;
  const heat = markets.filter((m) => m.heatAffinity !== undefined).map((m) => m.heatAffinity!);
  const local = markets.filter((m) => m.localAffinity !== undefined).map((m) => m.localAffinity!);
  const pop = markets.filter((m) => m.heatPopularity !== undefined).map((m) => m.heatPopularity!);
  const nHeat = heat.length ? minMax(heat) : () => 0.5;
  const nLocal = local.length ? minMax(local) : () => 0.5;
  const nPop = pop.length ? minMax(pop) : () => 0.5;

  const scored = markets.map((m) => {
    const parts: Array<[number, number]> = [];
    if (m.heatAffinity !== undefined) parts.push([nHeat(m.heatAffinity), 0.6]);
    if (m.localAffinity !== undefined) parts.push([nLocal(m.localAffinity), m.heatAffinity !== undefined ? 0.4 : 1]);
    const w = parts.reduce((s, [, wt]) => s + wt, 0);
    const concentration = w ? parts.reduce((s, [v, wt]) => s + v * wt, 0) / w : 0;
    const volume = m.heatPopularity !== undefined ? nPop(m.heatPopularity) : concentration;
    // Concentration drives the decision; volume nudges it (a full room beats a passionate empty one).
    const score = Math.round((0.75 * concentration + 0.25 * volume) * 100);
    const overIndex = Math.round((concentration - volume) * 100) / 100;
    return { ...m, score, overIndex, concentration, volume };
  });

  const medianScore = median(scored.map((m) => m.score));
  return scored
    .map(({ concentration, volume, ...m }) => {
      let tier: MarketTier;
      if (concentration >= 0.6 && volume >= 0.5) tier = "anchor";
      else if (concentration >= 0.55 && m.overIndex >= 0.15) tier = "sleeper";
      else if (volume >= 0.6) tier = "volume";
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
