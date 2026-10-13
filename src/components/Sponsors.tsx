"use client";
import type { TourPlan } from "@/lib/plan";

export default function Sponsors({ plan }: { plan: TourPlan }) {
  if (!plan.sponsors.length) return null;
  const partners = plan.markets.filter((m) => m.localSpots.length);
  return (
    <section className="card" aria-labelledby="sp-h">
      <h2 id="sp-h">Decision 3 · Sponsors &amp; merch</h2>
      <h3>What this audience buys, not just what it streams</h3>
      <p className="sub">Brands the headliner&apos;s fans over-index on, from Qloo&apos;s cross-domain graph: region-wide, then per market. Green = ranks locally but not nationally.</p>
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
                Local leads: {c.localOnly.slice(0, 4).map((l) => `${l.brand} (${l.market.split(",")[0]})`).join(", ")}
              </div>
            )}
          </div>
        ))}
      </div>
      {partners.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="small muted" style={{ marginBottom: 6 }}>
            Pre/after-show hospitality partners (Qloo places, same audience):
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
    </section>
  );
}
