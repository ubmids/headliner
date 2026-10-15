"use client";
import type { TourPlan } from "@/lib/plan";

export default function Sponsors({ plan }: { plan: TourPlan }) {
  if (!plan.sponsors.length) return null;
  const partners = plan.markets.filter((m) => m.localSpots.length);
  return (
    <section className="card" aria-labelledby="sp-h">
      <div className="section-head">
        <h2 id="sp-h">
          <span className="k">Decision 3 · Sponsors &amp; merch</span>
          What this audience buys, not just what it streams
        </h2>
      </div>
      <p className="sub">Brands the headliner&apos;s fans over-index on, from Qloo&apos;s cross-domain graph: region-wide, then per market. Local leads rank in a market but not nationally.</p>
      <div className="sponsor-grid">
        {plan.sponsors.map((c) => (
          <div key={c.category} className="sponsor">
            <h4>{c.category}</h4>
            <ol>
              {c.national.slice(0, 5).map((b) => (
                <li key={b.id}>
                  {b.name}
                  {b.affinity !== undefined && <span className="muted"> · {Math.round(b.affinity * 100)}</span>}
                </li>
              ))}
            </ol>
            {c.localOnly.length > 0 && (
              <div className="local">
                <b>Local leads</b>
                {c.localOnly.slice(0, 4).map((l) => `${l.brand} (${l.market.split(",")[0]})`).join(", ")}
              </div>
            )}
          </div>
        ))}
      </div>
      {partners.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="small muted mono" style={{ marginBottom: 6, textTransform: "uppercase", fontSize: 11 }}>
            Pre/after-show hospitality partners (Qloo places, same audience)
          </div>
          <table className="grid">
            <tbody>
              {partners.map((m) => (
                <tr key={m.key}>
                  <td style={{ width: 180 }}>{m.key}</td>
                  <td>{m.localSpots.map((s) => s.name).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="src-line">Qloo: /v2/insights brands (urn:entity:brand, filter.tags, signal.location.query) · places (urn:entity:place) for hospitality</div>
    </section>
  );
}
