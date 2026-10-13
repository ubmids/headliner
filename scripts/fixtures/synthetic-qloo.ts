/**
 * A stand-in for hackathon.api.qloo.com used ONLY to generate illustrative fixtures.
 * It answers the request patterns Headliner makes, in the documented response shapes,
 * from the placeholder seeds in ./seeds.ts. Never used at runtime.
 */
import { createHash } from "node:crypto";
import { CITIES, REGIONS, citiesInRegion } from "../../src/lib/geo";
import type { ArtistSeed } from "./seeds";

const BIG_METROS = new Set(["New York", "Los Angeles", "Chicago", "Houston", "Dallas", "Philadelphia", "Atlanta", "Miami", "Washington", "Boston", "San Francisco", "Phoenix", "Seattle", "Toronto", "London", "Paris", "Berlin", "Madrid", "Manchester", "Birmingham", "Milan", "Barcelona", "Rome", "Montreal", "Denver", "Minneapolis"]);
const MID_METROS = new Set(["Nashville", "Austin", "Portland", "Columbus", "Pittsburgh", "Cincinnati", "Indianapolis", "St. Louis", "Kansas City", "Charlotte", "Raleigh", "Glasgow", "Leeds", "Liverpool", "Dublin", "Amsterdam", "Hamburg", "Munich", "Vancouver", "Louisville", "Bristol", "Newcastle", "Copenhagen", "Lisbon"]);

export function fid(...parts: string[]): string {
  const h = createHash("sha1").update(parts.join("|")).digest("hex").toUpperCase();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/** Deterministic pseudo-random in [0,1). */
function rnd(...parts: string[]): number {
  return parseInt(createHash("md5").update(parts.join("|")).digest("hex").slice(0, 8), 16) / 0xffffffff;
}

const r3 = (v: number) => Math.round(Math.min(0.999, Math.max(0.01, v)) * 1000) / 1000;
const cityName = (q: string) => q.split(",")[0].trim();

/** Seed lookup by "City, Admin" when the admin is known, else by unique city name. */
function hotFor(seed: ArtistSeed, city: string, admin?: string): number {
  const keys = Object.keys(seed.hot);
  const exact = admin ? keys.find((x) => x.toLowerCase() === `${city}, ${admin}`.toLowerCase()) : undefined;
  const byName = keys.filter((x) => cityName(x).toLowerCase() === city.toLowerCase());
  const k = exact ?? (!admin && byName.length === 1 ? byName[0] : undefined) ?? (admin && byName.length === 1 && !/^[A-Z]{2}$/.test(admin) ? byName[0] : undefined);
  return k ? seed.hot[k] : 0.25 + 0.3 * rnd(seed.slug, city, admin ?? "");
}

function popFor(city: string): number {
  if (BIG_METROS.has(city)) return 0.85 + 0.14 * rnd("pop", city);
  if (MID_METROS.has(city)) return 0.55 + 0.25 * rnd("pop", city);
  return 0.15 + 0.35 * rnd("pop", city);
}

function entity(name: string, subtype: string, extra: Record<string, unknown> = {}) {
  return { name, entity_id: fid(subtype, name), type: "urn:entity", subtype, ...extra };
}

export class SyntheticQloo {
  private byId = new Map<string, { seed: ArtistSeed; kind: "headliner" | "support" | "llm"; name: string; popularity: number; affinity: number }>();

  constructor(private seeds: ArtistSeed[]) {
    for (const s of seeds) {
      this.byId.set(fid("urn:entity:artist", s.name), { seed: s, kind: "headliner", name: s.name, popularity: s.popularity, affinity: 1 });
      for (const a of s.support) this.byId.set(fid("urn:entity:artist", a.name), { seed: s, kind: "support", name: a.name, popularity: a.popularity, affinity: a.affinity });
      for (const [n, aff] of Object.entries(s.llmActs)) this.byId.set(fid("urn:entity:artist", n), { seed: s, kind: "llm", name: n, popularity: 0.95, affinity: aff });
    }
  }

  private headliner(id?: string): ArtistSeed | undefined {
    const e = id ? this.byId.get(id.split(",")[0]) : undefined;
    return e?.kind === "headliner" ? e.seed : undefined;
  }

  respond(url: URL): unknown {
    const p = Object.fromEntries(url.searchParams.entries());
    const ok = (results: unknown) => ({ success: true, duration: 41, results });
    switch (url.pathname) {
      case "/search": {
        const q = (p.query ?? "").toLowerCase();
        const hit = [...this.byId.values()].find((e) => e.name.toLowerCase() === q);
        if (!hit) return ok([]);
        return ok([
          entity(hit.name, "urn:entity:artist", {
            types: ["urn:entity:artist"],
            popularity: hit.popularity,
            disambiguation: hit.kind === "headliner" ? hit.seed.description : undefined,
            properties: hit.kind === "headliner" ? { short_description: hit.seed.description } : {},
            tags: hit.kind === "headliner" ? hit.seed.tasteTags.slice(0, 3).map((t) => ({ id: `urn:tag:genre:music:${t.toLowerCase().replace(/\W+/g, "_")}`, name: t, type: "urn:tag:genre:music" })) : [],
          }),
        ]);
      }
      case "/v2/tags": {
        const q = (p["filter.query"] ?? "").toLowerCase();
        const mk = (id: string, name: string, parent: string) => ({ id, name, type: id.split(":").slice(0, 4).join(":"), parents: [{ type: parent }] });
        const table: Record<string, unknown[]> = {
          "music venue": [mk("urn:tag:category:place:music_venue", "Music Venue", "urn:entity:place"), mk("urn:tag:category:place:concert_hall", "Concert Hall", "urn:entity:place")],
          bar: [mk("urn:tag:category:place:bar", "Bar", "urn:entity:place"), mk("urn:tag:category:place:cocktail_bar", "Cocktail Bar", "urn:entity:place")],
          "food and beverage": [mk("urn:tag:genre:brand:food_beverage", "Food & Beverage", "urn:entity:brand")],
          "apparel and fashion": [mk("urn:tag:genre:brand:fashion", "Fashion", "urn:entity:brand"), mk("urn:tag:genre:brand:apparel", "Apparel", "urn:entity:brand")],
          "alcoholic beverages": [mk("urn:tag:genre:brand:alcoholic_beverages", "Alcoholic Beverages", "urn:entity:brand")],
        };
        return ok({ tags: table[q] ?? [] });
      }
      case "/v2/analysis/compare": {
        const a = this.headliner(p["a.signal.interests.entities"]);
        const b = this.byId.get(p["b.signal.interests.entities"] ?? "");
        const names = a && b ? (a.sharedTags[b.name] ?? a.tasteTags.slice(0, 3)) : [];
        return ok({
          tags: names.map((n, i) => ({ tag_id: `urn:tag:keyword:music:${n.toLowerCase().replace(/\W+/g, "_")}`, name: n, subtype: "urn:tag:keyword:music", query: { affinity: r3(0.9 - i * 0.07), a: { affinity: r3(0.88 - i * 0.05) }, b: { affinity: r3(0.85 - i * 0.06) } } })),
        });
      }
      case "/v2/trending": {
        const s = this.headliner(p["signal.interests.entities"]);
        if (!s) return ok({ trending: [] });
        const end = new Date(p["filter.end_date"] ?? "2026-10-13");
        return ok({
          trending: s.trend.map((v, i) => ({
            date: new Date(end.getTime() - (s.trend.length - 1 - i) * 15 * 86400000).toISOString().slice(0, 10),
            population_percentile: v,
            population_rank: Math.round((100 - v) * 120),
            population_rank_velocity: i ? Math.round((s.trend[i] - s.trend[i - 1]) * 40) : 0,
            velocity_fold_change: i ? Math.round((v / s.trend[i - 1]) * 1000) / 1000 : 1,
            population_percent_delta: i ? Math.round((v - s.trend[i - 1]) * 100) / 100 : 0,
          })),
        });
      }
      case "/v2/insights":
        return ok(this.insights(p));
      default:
        return ok([]);
    }
  }

  private insights(p: Record<string, string>): unknown {
    const type = p["filter.type"];
    const signal = p["signal.interests.entities"];
    const loc = p["signal.location.query"] ?? p["filter.location.query"];
    const take = Number(p.take ?? 20);
    if (type === "urn:tag") {
      const s = this.headliner(signal);
      return { tags: (s?.tasteTags ?? []).slice(0, take).map((t, i) => ({ tag_id: `urn:tag:genre:music:${t.toLowerCase().replace(/\W+/g, "_")}`, name: t, types: ["urn:entity:artist"], subtype: "urn:tag:genre:music", query: { affinity: r3(0.95 - i * 0.04) } })) };
    }
    if (type === "urn:demographics") {
      const s = this.headliner(signal);
      return { demographics: s ? [{ entity_id: signal, query: s.demographics }] : [] };
    }
    if (type === "urn:heatmap") {
      const s = this.headliner(signal);
      if (!s) return { heatmap: [] };
      const region = Object.values(REGIONS).find((r) => r.wkt === p["filter.location"]) ?? REGIONS[s.region];
      const pts = citiesInRegion(region)
        .map((c) => {
          const aff = hotFor(s, c.name, c.country === "US" || c.country === "CA" ? c.admin : undefined);
          return { location: { latitude: c.lat + 0.01, longitude: c.lon - 0.01, geohash: fid(c.name).slice(0, 6).toLowerCase() }, query: { affinity: r3(aff), affinity_rank: r3(aff - 0.01), popularity: r3(popFor(c.name)) } };
        })
        .sort((a, b) => b.query.affinity - a.query.affinity)
        .slice(0, take);
      return { heatmap: pts };
    }
    if (type === "urn:entity:artist") {
      const results = p["filter.results.entities"]?.split(",") ?? [];
      const s = this.headliner(signal) ?? this.headliner(results[0]);
      if (!s) return { entities: [] };
      const city = loc ? cityName(loc) : undefined;
      const admin = loc?.includes(",") ? loc.split(",")[1].trim() : undefined;
      if (results.length === 1 && results[0] === fid("urn:entity:artist", s.name) && !signal) {
        // rank_cities: the headliner's affinity in one city
        const aff = city ? hotFor(s, city, admin) * 0.92 + 0.06 * rnd("rank", s.slug, city) : 0.5;
        return { entities: [this.artistEntity(s.name, s.popularity, aff)] };
      }
      if (results.length) {
        // filter.results.entities: re-rank given candidates for this audience (optionally in a city)
        return {
          entities: results
            .map((id) => this.byId.get(id))
            .filter((e): e is NonNullable<typeof e> => !!e)
            .map((e) => {
              const sup = s.support.find((x) => x.name === e.name);
              const bonus = city && sup?.strongIn?.some((c) => cityName(c) === city) ? 0.1 : 0;
              const aff = city ? e.affinity * (0.82 + 0.12 * rnd("ovl", e.name, city)) + bonus : e.affinity;
              return this.artistEntity(e.name, e.popularity, aff);
            })
            .sort((a, b) => b.query.affinity - a.query.affinity),
        };
      }
      const cap = Number(p["filter.popularity.max"] ?? 1);
      return {
        entities: s.support
          .filter((a) => a.popularity <= cap)
          .sort((a, b) => b.affinity - a.affinity)
          .slice(0, take)
          .map((a) => ({
            ...this.artistEntity(a.name, a.popularity, a.affinity),
            query: { affinity: r3(a.affinity), explainability: { "signal.interests.entities": [{ entity_id: signal, score: r3(a.affinity) }] } },
          })),
      };
    }
    if (type === "urn:entity:place") {
      const s = this.headliner(signal);
      const city = loc ? cityName(loc) : "";
      if (!s || !city) return { entities: [] };
      const isBar = (p["filter.tags"] ?? "").includes("bar");
      const table = isBar ? s.bars : s.venues;
      const key = Object.keys(table).find((k) => cityName(k) === city);
      const gaz = CITIES.find((c) => c.name === city);
      const names = key ? table[key] : isBar ? [] : [`Placeholder venue A (${city})`, `Placeholder venue B (${city})`];
      return {
        entities: names.slice(0, take).map((n, i) =>
          entity(n, "urn:entity:place", {
            popularity: r3(0.7 + 0.2 * rnd(n)),
            location: gaz ? { lat: gaz.lat + 0.01 * (i + 1), lon: gaz.lon - 0.008 * (i + 1) } : undefined,
            properties: { address: `${100 + Math.round(800 * rnd("addr", n))} Main St, ${city}`, geocode: { name: city } },
            query: { affinity: r3(0.95 - i * 0.06) },
          }),
        ),
      };
    }
    if (type === "urn:entity:brand") {
      const s = this.headliner(signal);
      if (!s) return { entities: [] };
      const tag = p["filter.tags"] ?? "";
      const cat = tag.includes("food") ? "Food & drink" : tag.includes("alcohol") ? "Beer, wine & spirits" : "Fashion & apparel";
      const city = loc ? cityName(loc) : undefined;
      const localKey = city ? Object.keys(s.localBrands[cat] ?? {}).find((k) => cityName(k) === city) : undefined;
      const local = localKey ? s.localBrands[cat][localKey] : [];
      const national = s.brands[cat] ?? [];
      const list = [...local, ...national.filter((n) => !local.includes(n))];
      return { entities: list.slice(0, take).map((n, i) => entity(n, "urn:entity:brand", { popularity: r3(0.6 + 0.35 * rnd(n)), query: { affinity: r3(0.93 - i * 0.05 - (city ? 0.02 * rnd(n, city) : 0)) } })) };
    }
    return { entities: [] };
  }

  private artistEntity(name: string, popularity: number, affinity: number) {
    return { ...entity(name, "urn:entity:artist", { popularity, properties: {} }), query: { affinity: r3(affinity) } };
  }
}
