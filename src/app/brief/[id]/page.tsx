import { notFound } from "next/navigation";
import { getRun } from "@/lib/server";
import { tierLabel } from "@/lib/agent/brief";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

/** A one-page, printable tour brief a promoter can take into a meeting. */
export default async function BriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getRun(id);
  if (!r) notFound();
  const { plan, brief, contrast } = r;
  const route = plan.route.order.map((k) => plan.markets.find((m) => m.key === k)!).filter(Boolean);
  return (
    <div className="brief-page">
      <style>{`
        .brief-page { background:#fff; color:#141414; min-height:100vh; padding:32px; font-size:13px; }
        .brief-page .wrap { max-width: 860px; margin: 0 auto; }
        .brief-page h1 { font-family: var(--display); font-size: 26px; margin: 0; text-transform: uppercase; }
        .brief-page h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .1em; color:#555; margin: 22px 0 6px; border-bottom: 2px solid #141414; padding-bottom: 4px; }
        .brief-page .hl { font-size: 18px; font-weight: 700; margin: 10px 0; line-height: 1.3; }
        .brief-page table { width:100%; border-collapse: collapse; }
        .brief-page th, .brief-page td { text-align:left; padding:5px 6px; border-bottom:1px solid #ddd; vertical-align: top; }
        .brief-page th { font-size: 11px; color:#555; text-transform: uppercase; }
        .brief-page .meta { color:#555; font-size: 12px; }
        .brief-page .pb { background:#141414; color:#fff; border:0; border-radius:8px; padding:8px 14px; float:right; }
        .brief-page .src { margin-top: 24px; font-size: 11px; color: #666; }
        .brief-page .fx { border:1px solid #c98500; background:#fff7e0; padding:6px 10px; border-radius:6px; margin:10px 0; }
      `}</style>
      <div className="wrap">
        <PrintButton />
        <h1>Tour brief · {plan.artist?.name}</h1>
        <div className="meta">
          Headliner · {plan.dates} dates · {route.length ? `${plan.route.km.toLocaleString("en-US")} km` : ""} · generated {new Date(r.createdAt).toUTCString()}
        </div>
        {r.mode.qloo === "fixture" && <div className="fx">Fixture mode: illustrative placeholder data in Qloo&apos;s response format, not Qloo data.</div>}
        <p className="hl">{brief.headline}</p>

        <h2>1 · Routing</h2>
        <p>{brief.routing}</p>
        <table>
          <thead>
            <tr><th>#</th><th>Market</th><th>Tier</th><th>Fan score</th><th>Venues (Qloo)</th><th>Hospitality partners</th></tr>
          </thead>
          <tbody>
            {route.map((m, i) => (
              <tr key={m.key}>
                <td>{i + 1}</td><td>{m.key}</td><td>{tierLabel(m.tier)}</td><td>{m.score}</td>
                <td>{m.venues.slice(0, 2).map((v) => v.name).join(", ") || "–"}</td>
                <td>{m.localSpots.slice(0, 2).map((v) => v.name).join(", ") || "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>2 · Support act</h2>
        <p>{brief.support}</p>
        <table>
          <thead><tr><th>Act</th><th>Fit</th><th>Shared taste</th><th>Best market</th></tr></thead>
          <tbody>
            {plan.supportActs.slice(0, 4).map((a) => {
              const best = Object.entries(a.perMarket).sort((x, y) => y[1] - x[1])[0];
              return (
                <tr key={a.id}><td>{a.name}</td><td>{a.fitScore}</td><td>{a.sharedTags.slice(0, 4).join(", ") || "–"}</td><td>{best ? best[0] : "–"}</td></tr>
              );
            })}
          </tbody>
        </table>

        <h2>3 · Sponsors &amp; merch</h2>
        <p>{brief.sponsors}</p>
        <table>
          <thead><tr><th>Category</th><th>Tour-wide leads</th><th>Local-only leads</th></tr></thead>
          <tbody>
            {plan.sponsors.map((c) => (
              <tr key={c.category}><td>{c.category}</td><td>{c.national.slice(0, 4).map((b) => b.name).join(", ")}</td><td>{c.localOnly.slice(0, 3).map((l) => `${l.brand} (${l.market.split(",")[0]})`).join(", ") || "–"}</td></tr>
            ))}
          </tbody>
        </table>

        {contrast && (
          <>
            <h2>Why not just ask an LLM?</h2>
            <p>{contrast.headline}</p>
            <p className="meta">Plain LLM cities: {contrast.llmCities.map((c) => `${c.input}${c.score !== undefined ? ` (${c.score})` : ""}`).join(", ")}</p>
          </>
        )}
        <div className="src">
          Grounded in {r.calls.length} Qloo API requests ({[...new Set(r.calls.map((c) => c.endpoint))].join(", ")}). Qloo scores describe aggregate audience affinity, not individuals. Run {r.runId}.
        </div>
      </div>
    </div>
  );
}
