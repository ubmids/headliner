/**
 * The tour brief: template text (used when no LLM writes it) and the CSV export.
 * Pure functions with no Node imports, so the browser can build the CSV too.
 */
import type { Contrast } from "../contrast";
import type { Market, TourPlan } from "../plan";

export interface BriefText {
  headline: string;
  routing: string;
  support: string;
  sponsors: string;
}

const TIER_LABEL: Record<Market["tier"], string> = {
  anchor: "Anchor",
  sleeper: "Sleeper",
  volume: "Volume",
  skip: "Skip",
};
export const tierLabel = (t: Market["tier"]) => TIER_LABEL[t];

export function templateBrief(plan: TourPlan, contrast?: Contrast): BriefText {
  const name = plan.artist?.name ?? "the artist";
  const route = plan.route.order.map((k) => plan.markets.find((m) => m.key === k)).filter((m): m is Market => !!m);
  const best = [...route].sort((a, b) => b.score - a.score)[0];
  const sleeper = route.filter((m) => m.tier === "sleeper").sort((a, b) => b.score - a.score || b.overIndex - a.overIndex)[0];
  const act = plan.supportActs[0];
  const sponsorLeads = plan.sponsors.flatMap((c) => c.national.slice(0, 1).map((b) => b.name));

  const headline = route.length
    ? `${name}: ${route.length}-date run anchored on ${best?.city ?? route[0].city}${sleeper ? `, with ${sleeper.city} as the sleeper market` : ""}${act ? `; ${act.name} to open` : ""}.`
    : `${name}: not enough Qloo signal to route a tour yet.`;

  const routing = route.length
    ? `Play ${route.map((m) => m.city).join(" → ")} (${plan.route.km.toLocaleString("en-US")} km). ` +
      `${best ? `${best.key} has the strongest fan score (${best.score}/100). ` : ""}` +
      (sleeper ? `${sleeper.key} over-indexes for its size (+${Math.round(sleeper.overIndex * 100)} pts concentration over volume): a cheaper room that should sell through. ` : "") +
      (contrast?.missedByLlm.length ? `A generic plan would miss ${contrast.missedByLlm.slice(0, 2).map((m) => m.market).join(" and ")}.` : "")
    : "Qloo returned no market signal for this artist in the region.";

  const support = act
    ? `${act.name} is the best opener (fit ${act.fitScore}/100)` +
      (Object.keys(act.perMarket).length ? `, strongest in ${Object.entries(act.perMarket).sort((a, b) => b[1] - a[1])[0][0]}` : "") +
      (act.sharedTags.length ? `; the fan bases share ${act.sharedTags.slice(0, 3).join(", ")}` : "") +
      "." +
      (plan.supportActs[1] ? ` Backup: ${plan.supportActs[1].name} (${plan.supportActs[1].fitScore}).` : "")
    : "No support-act candidates came back from Qloo.";

  const local = plan.sponsors.flatMap((c) => c.localOnly).slice(0, 2);
  const sponsors = plan.sponsors.length
    ? `Pitch ${sponsorLeads.join(", ") || "the brands below"} for the tour-wide deal` +
      (local.length ? `; activate ${local.map((l) => `${l.brand} in ${l.market.split(",")[0]}`).join(" and ")} locally, where they rank for this audience but not nationally` : "") +
      "."
    : "No sponsor signal came back from Qloo.";

  return { headline, routing, support, sponsors };
}

function csvCell(v: unknown): string {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** One row per tour date with the decisions a promoter takes into a meeting. */
export function briefCsv(plan: TourPlan): string {
  const header = ["stop", "market", "tier", "fan_score", "over_index", "qloo_heatmap_affinity", "qloo_local_affinity", "top_venue", "venue_address", "best_local_opener", "local_partner", "sponsor_leads"];
  const rows = plan.route.order.map((key, i) => {
    const m = plan.markets.find((x) => x.key === key);
    const opener = [...plan.supportActs].sort((a, b) => (b.perMarket[key] ?? -1) - (a.perMarket[key] ?? -1))[0];
    const leads = plan.sponsors.flatMap((c) => (c.byMarket[key] ?? []).slice(0, 1).map((b) => `${c.category}: ${b.name}`));
    return [
      i + 1,
      key,
      m ? tierLabel(m.tier) : "",
      m?.score,
      m ? m.overIndex.toFixed(2) : "",
      m?.heatAffinity?.toFixed(3),
      m?.localAffinity?.toFixed(3),
      m?.venues[0]?.name,
      m?.venues[0]?.address,
      opener && opener.perMarket[key] !== undefined ? opener.name : (plan.supportActs[0]?.name ?? ""),
      m?.localSpots[0]?.name,
      leads.join(" | "),
    ];
  });
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}
