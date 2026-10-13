"use client";
import { useState } from "react";
import type { TourPlan } from "@/lib/plan";

const AGE_LABEL: Record<string, string> = {
  "24_and_younger": "≤24",
  "25_to_29": "25–29",
  "30_to_34": "30–34",
  "35_to_44": "35–44",
  "45_to_54": "45–54",
  "55_and_older": "55+",
};

/** Diverging bars: positive = over-indexes (blue), negative = under-indexes (red), gray zero line. */
function Diverging({ data }: { data: Record<string, number> }) {
  const max = Math.max(0.01, ...Object.values(data).map(Math.abs));
  return (
    <div className="bars">
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="bar-row" data-tip={`${AGE_LABEL[k] ?? k}: ${v > 0 ? "+" : ""}${v.toFixed(2)} vs average`} style={{ gridTemplateColumns: "60px 1fr 46px" }}>
          <span className="name">{AGE_LABEL[k] ?? k}</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2px 1fr", alignItems: "center", height: 12 }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>{v < 0 && <div className="bar-fill" style={{ width: `${(Math.abs(v) / max) * 100}%`, background: "var(--div-neg)", borderRadius: "4px 0 0 4px" }} />}</div>
            <div style={{ background: "var(--div-mid)", height: 16 }} />
            <div>{v > 0 && <div className="bar-fill" style={{ width: `${(v / max) * 100}%`, background: "var(--qloo)" }} />}</div>
          </div>
          <span className="val">
            {v > 0 ? "+" : ""}
            {v.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

function Spark({ points }: { points: Array<{ date: string; percentile: number }> }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return null;
  const w = 300;
  const h = 80;
  const ys = points.map((p) => p.percentile);
  const lo = Math.min(...ys) - 1;
  const hi = Math.max(...ys) + 1;
  const x = (i: number) => (i / (points.length - 1)) * (w - 8) + 4;
  const y = (v: number) => h - 6 - ((v - lo) / (hi - lo)) * (h - 16);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.percentile).toFixed(1)}`).join(" ");
  const hp = hover !== null ? points[hover] : points[points.length - 1];
  return (
    <div>
      <svg
        className="spark"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          setHover(Math.round(((e.clientX - r.left) / r.width) * (points.length - 1)));
        }}
        role="img"
        aria-label="Audience popularity percentile over time"
      >
        <path d={d} fill="none" stroke="var(--qloo)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={h} stroke="#555" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
        <circle cx={x(hover ?? points.length - 1)} cy={y(hp.percentile)} r={4} fill="var(--qloo)" stroke="#1a1a19" strokeWidth={2} />
      </svg>
      <div className="small muted">
        {hp.date}: {hp.percentile.toFixed(0)}th percentile
      </div>
    </div>
  );
}

export default function Audience({ plan }: { plan: TourPlan }) {
  if (!plan.tasteTags.length && !plan.demographics && !plan.trend) return null;
  return (
    <section className="card" aria-labelledby="au-h">
      <h2 id="au-h">The audience behind the decisions</h2>
      <div className="decisions">
        <div className="decision">
          <h4>Taste profile (Qloo)</h4>
          <div className="tags">
            {plan.tasteTags.slice(0, 10).map((t) => (
              <span key={t.id} className="tagpill">
                {t.name}
              </span>
            ))}
          </div>
        </div>
        <div className="decision">
          <h4>Age skew vs average</h4>
          {plan.demographics ? <Diverging data={plan.demographics.age} /> : <p className="muted">No data.</p>}
          {plan.demographics && (
            <p className="small muted" style={{ marginTop: 6 }}>
              Gender: {Object.entries(plan.demographics.gender).map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v.toFixed(2)}`).join(" · ")}
            </p>
          )}
        </div>
        <div className="decision">
          <h4>Momentum: {plan.trend?.direction ?? "n/a"}</h4>
          {plan.trend ? <Spark points={plan.trend.points} /> : <p className="muted">No trend data.</p>}
        </div>
      </div>
    </section>
  );
}
