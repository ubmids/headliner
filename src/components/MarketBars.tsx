"use client";
import type { Market } from "@/lib/plan";

/** Tier encoding (design/DESIGN.md): anchor ink, sleeper pink (Qloo's signal), volume neutral, skip hollow. Always with the word. */
export const TIER_COLOR: Record<Market["tier"], string> = {
  anchor: "var(--ink)",
  sleeper: "var(--qloo)",
  volume: "var(--neutral)",
  skip: "var(--skip)",
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
          <span className={`swatch ${t}`} /> {t}
        </span>
      ))}
      <span>
        <span className="swatch route" /> on the tour
      </span>
      <span>
        <span className="swatch llm" /> plain-LLM pick
      </span>
    </div>
  );
}

const pct = (v?: number) => (v === undefined ? "–" : Math.round(v * 100));

export function MarketBars({ markets, routeKeys }: { markets: Market[]; routeKeys: string[] }) {
  return (
    <div className="bars" role="list" aria-label="Markets ranked by fan score">
      {markets.map((m) => {
        const on = routeKeys.includes(m.key);
        return (
          <div
            key={m.key}
            className="bar-row"
            role="listitem"
            data-tip={`${m.tier} · heatmap ${pct(m.heatAffinity)} · local ${pct(m.localAffinity)} · volume ${pct(m.heatPopularity)}`}
          >
            <span className={`name ${on ? "on" : ""}`} title={m.key}>
              {on ? "● " : ""}
              {m.key}
            </span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${Math.max(m.score, 1)}%`,
                  background: m.tier === "skip" ? "transparent" : TIER_COLOR[m.tier],
                  boxShadow: m.tier === "skip" ? `inset 0 0 0 2px ${TIER_COLOR.skip}` : undefined,
                }}
              />
            </div>
            <span className="val">{m.score}</span>
          </div>
        );
      })}
    </div>
  );
}
