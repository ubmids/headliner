"use client";
import type { Market } from "@/lib/plan";

export const TIER_COLOR: Record<Market["tier"], string> = {
  anchor: "var(--tier-anchor)",
  sleeper: "var(--tier-sleeper)",
  volume: "var(--tier-volume)",
  skip: "var(--tier-skip)",
};

export const TIER_TEXT: Record<Market["tier"], string> = {
  anchor: "Anchor: strong concentration and volume",
  sleeper: "Sleeper: fans over-index for the city's size",
  volume: "Volume: big but diluted",
  skip: "Skip",
};

export function TierLegend() {
  return (
    <div className="legend" aria-label="Market tiers">
      {(Object.keys(TIER_COLOR) as Array<Market["tier"]>).map((t) => (
        <span key={t} title={TIER_TEXT[t]}>
          <span className="swatch" style={{ background: TIER_COLOR[t] }} /> {t}
        </span>
      ))}
      <span>
        <span className="swatch" style={{ background: "var(--accent)" }} /> on the tour
      </span>
    </div>
  );
}

const pct = (v?: number) => (v === undefined ? "–" : Math.round(v * 100));

export function MarketBars({ markets, routeKeys }: { markets: Market[]; routeKeys: string[] }) {
  return (
    <div className="bars" role="list" aria-label="Markets ranked by fan score">
      {markets.map((m) => (
        <div
          key={m.key}
          className="bar-row"
          role="listitem"
          data-tip={`${m.tier} · heatmap ${pct(m.heatAffinity)} · local ${pct(m.localAffinity)} · volume ${pct(m.heatPopularity)}`}
        >
          <span className="name" title={m.key}>
            {routeKeys.includes(m.key) ? "● " : ""}
            {m.key}
          </span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${Math.max(m.score, 1)}%`, background: TIER_COLOR[m.tier], outline: routeKeys.includes(m.key) ? "2px solid var(--accent)" : undefined, outlineOffset: 1 }} />
          </div>
          <span className="val">{m.score}</span>
        </div>
      ))}
    </div>
  );
}
