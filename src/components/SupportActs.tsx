"use client";
import type { TourPlan } from "@/lib/plan";

/** Sequential blue, light→dark with affinity (dataviz reference ramp). */
function heatStyle(v: number) {
  const steps = ["#2b2b28", "#184f95", "#1c5cab", "#256abf", "#2a78d6", "#3987e5", "#5598e7"];
  const i = Math.min(steps.length - 1, Math.max(0, Math.round((v - 0.4) / 0.1)));
  return { background: steps[i], color: i >= 1 ? "#fff" : "var(--text-secondary)" };
}

export default function SupportActs({ plan }: { plan: TourPlan }) {
  const acts = plan.supportActs.slice(0, 6);
  const markets = [...new Set(acts.flatMap((a) => Object.keys(a.perMarket)))];
  if (!acts.length) return null;
  return (
    <section className="card" aria-labelledby="sa-h">
      <h2 id="sa-h">Decision 2 · Support act</h2>
      <h3>
        {acts[0].name} opens{acts[1] ? `, ${acts[1].name} as backup` : ""}
      </h3>
      <p className="sub">Candidates are artists the headliner&apos;s fans love, capped below the headliner&apos;s popularity. Fit is re-scored against the fans in each market.</p>
      <div className="acts">
        {acts.slice(0, 3).map((a, i) => (
          <div key={a.id} className={`act ${i === 0 ? "top" : ""}`}>
            <div className="nm">{a.name}</div>
            <div className="fit">
              {a.fitScore}
              <span className="muted small"> fit</span>
            </div>
            <div className="small muted">
              overlap {a.affinity !== undefined ? Math.round(a.affinity * 100) : "–"} · popularity {a.popularity !== undefined ? Math.round(a.popularity * 100) : "–"}
            </div>
            {a.sharedTags.length > 0 && (
              <>
                <div className="small" style={{ marginTop: 6 }}>
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
        <div style={{ overflowX: "auto", marginTop: 14 }}>
          <table className="grid" aria-label="Audience overlap by market">
            <thead>
              <tr>
                <th>Overlap with headliner fans, by market</th>
                {markets.map((m) => (
                  <th key={m}>{m.split(",")[0]}</th>
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
    </section>
  );
}
