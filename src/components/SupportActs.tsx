"use client";
import type { TourPlan } from "@/lib/plan";

/** Overlap heat: one neutral hue, light to dark (design/DESIGN.md --seq-1..5). Pink stays reserved for Qloo's signal. */
function heatStyle(v: number) {
  const i = Math.min(5, Math.max(1, Math.round((v - 0.6) / 0.07) + 1));
  return { background: `var(--seq-${i})`, color: `var(--seq-${i}-text)` };
}

export default function SupportActs({ plan }: { plan: TourPlan }) {
  const acts = plan.supportActs.slice(0, 6);
  const markets = [...new Set(acts.flatMap((a) => Object.keys(a.perMarket)))];
  if (!acts.length) return null;
  return (
    <section className="card" aria-labelledby="sa-h">
      <div className="section-head">
        <h2 id="sa-h">
          <span className="k">Decision 2 · Support act</span>
          {acts[0].name} opens{acts[1] ? `, ${acts[1].name} as backup` : ""}
        </h2>
      </div>
      <p className="sub">Candidates are artists the headliner&apos;s fans love, capped below the headliner&apos;s popularity. Fit is re-scored against the fans in each market.</p>
      <div className="acts">
        {acts.slice(0, 3).map((a, i) => (
          <div key={a.id} className="act">
            <div className="rank">{i === 0 ? "First choice" : i === 1 ? "Backup" : "Also fits"}</div>
            <div className="nm">{a.name}</div>
            <div className="fit">
              {a.fitScore}
              <span>fit</span>
            </div>
            <div className="meta">
              overlap {a.affinity !== undefined ? Math.round(a.affinity * 100) : "–"} · popularity {a.popularity !== undefined ? Math.round(a.popularity * 100) : "–"}
            </div>
            {a.sharedTags.length > 0 && (
              <>
                <div className="small muted" style={{ marginTop: 8 }}>
                  Shared taste (Qloo compare):
                </div>
                <div className="tags">
                  {a.sharedTags.map((t) => (
                    <span key={t} className="tagpill">
                      {t}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {markets.length > 0 && (
        <div className="scroll-x">
          <table className="grid" aria-label="Audience overlap by market">
            <thead>
              <tr>
                <th>Overlap with headliner fans, by market</th>
                {markets.map((m) => (
                  <th key={m} className="num">
                    {m.split(",")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {acts.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  {markets.map((m) => (
                    <td key={m}>
                      {a.perMarket[m] !== undefined ? (
                        <div className="cell-heat" style={heatStyle(a.perMarket[m])} title={`${a.name} in ${m}: ${Math.round(a.perMarket[m] * 100)}`}>
                          {Math.round(a.perMarket[m] * 100)}
                        </div>
                      ) : (
                        <span className="muted">–</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="src-line">Qloo: /v2/insights artists (signal.interests.entities, filter.popularity.max, feature.explainability) · per-market overlap (signal.location.query) · /v2/analysis/compare</div>
    </section>
  );
}
