/**
 * The with/without-Qloo contrast, measured rather than asserted: the plain LLM's picks are
 * scored with the same Qloo calls as the agent's picks, then compared.
 */
import type { Market, SupportAct } from "./plan";

export interface CityCheck {
  input: string;
  market?: string;
  score?: number;
  rank?: number; // 1-based rank among all markets Qloo scored
  tier?: Market["tier"];
}

export interface Contrast {
  llmCities: CityCheck[];
  /** Qloo route markets the LLM never mentioned, best first. */
  missedByLlm: Array<{ market: string; score: number; tier: Market["tier"]; overIndex: number }>;
  /** LLM cities that land in the bottom half of Qloo's ranking. */
  weakLlmPicks: CityCheck[];
  overlapCount: number;
  llmAvgScore?: number;
  qlooAvgScore?: number;
  supportChecks: Array<{ name: string; affinity?: number }>;
  qlooTopSupport?: { name: string; fitScore: number };
  headline: string;
}

const norm = (s: string) => s.toLowerCase().split(",")[0].trim();

export function buildContrast(args: {
  llmCities: string[];
  markets: Market[];
  routeKeys: string[];
  supportChecks: Array<{ name: string; affinity?: number }>;
  supportActs: SupportAct[];
}): Contrast {
  const ranked = [...args.markets].sort((a, b) => b.score - a.score);
  const find = (input: string) => ranked.find((m) => m.key.toLowerCase() === input.toLowerCase()) ?? ranked.find((m) => norm(m.key) === norm(input));
  const llmCities: CityCheck[] = args.llmCities.map((input) => {
    const m = find(input);
    return m ? { input, market: m.key, score: m.score, rank: ranked.indexOf(m) + 1, tier: m.tier } : { input };
  });
  const llmKeys = new Set(llmCities.map((c) => c.market).filter(Boolean));
  const route = args.routeKeys.map((k) => ranked.find((m) => m.key === k)).filter((m): m is Market => !!m);
  const missedByLlm = route
    .filter((m) => !llmKeys.has(m.key))
    .map((m) => ({ market: m.key, score: m.score, tier: m.tier, overIndex: m.overIndex }));
  const half = Math.ceil(ranked.length / 2);
  const weakLlmPicks = llmCities.filter((c) => c.rank !== undefined && c.rank > half);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, v) => s + v, 0) / xs.length) : undefined);
  const llmAvgScore = avg(llmCities.filter((c) => c.score !== undefined).map((c) => c.score!));
  const qlooAvgScore = avg(route.map((m) => m.score));
  const top = [...args.supportActs].sort((a, b) => b.fitScore - a.fitScore)[0];

  const sleeper = missedByLlm.find((m) => m.tier === "sleeper") ?? missedByLlm[0];
  const parts: string[] = [];
  if (sleeper) parts.push(`Qloo found ${sleeper.market} (fan score ${sleeper.score}) that the plain LLM never considered`);
  if (weakLlmPicks.length) parts.push(`${weakLlmPicks.length} of the LLM's ${llmCities.length} cities rank in Qloo's bottom half`);
  if (llmAvgScore !== undefined && qlooAvgScore !== undefined) parts.push(`average fan score ${qlooAvgScore} vs ${llmAvgScore}`);
  const headline = parts.length ? `${parts.join("; ")}.` : "The plain LLM and Qloo agree on this tour.";

  return {
    llmCities,
    missedByLlm,
    weakLlmPicks,
    overlapCount: route.filter((m) => llmKeys.has(m.key)).length,
    llmAvgScore,
    qlooAvgScore,
    supportChecks: args.supportChecks,
    qlooTopSupport: top ? { name: top.name, fitScore: top.fitScore } : undefined,
    headline,
  };
}
