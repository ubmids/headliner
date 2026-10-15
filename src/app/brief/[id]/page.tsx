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
        .brief-page { --paper:#FFFFFF; --ink:#0D0D0D; --ink-2:#3D3D3D; --ink-3:#616161; --hair:#DADAD4; --qloo:#E6007E; --qloo-text:#B00060; --llm-text:#005A91;
          background:var(--paper); color:var(--ink); min-height:100vh; padding:36px 32px; font-family:var(--font); font-size:13px; line-height:1.45; color-scheme: light; }
        .brief-page .wrap { max-width: 860px; margin: 0 auto; }
        .brief-page .wm { font-family: var(--display); font-weight: 900; font-size: 20px; text-transform: uppercase; text-shadow: 1.5px 1.5px 0 var(--qloo); }
        .brief-page h1 { font-family: var(--display); font-weight: 900; font-size: 46px; line-height: .9; margin: 10px 0 6px; text-transform: uppercase; }
        .brief-page h2 { font-family: var(--display); font-weight: 900; font-size: 22px; text-transform: uppercase; margin: 24px 0 6px; border-bottom: 3px solid var(--ink); padding-bottom: 3px; line-height: 1; }
        .brief-page .hl { font-family: var(--display); font-weight: 800; font-size: 24px; text-transform: uppercase; margin: 14px 0 8px; line-height: 1.02; }
        .brief-page table { width:100%; border-collapse: collapse; }
        .brief-page th, .brief-page td { text-align:left; padding:5px 6px; border-bottom:1px solid var(--hair); vertical-align: top; }
        .brief-page th { font-family: var(--mono); font-weight: 400; font-size: 10px; color: var(--ink-3); text-transform: uppercase; border-bottom: 1px solid var(--ink); }
        .brief-page td.n { font-family: var(--mono); text-align: right; font-variant-numeric: tabular-nums; }
        .brief-page td.city { font-weight: 600; }
        .brief-page tr.sleeper td.city, .brief-page tr.sleeper td.t { color: var(--qloo-text); }
        .brief-page .meta { font-family: var(--mono); color: var(--ink-3); font-size: 11px; }
        .brief-page .pb { background: var(--ink); color: var(--paper); border:0; border-radius:0; padding:8px 14px; float:right; font-family: var(--display); font-weight: 900; font-size: 16px; text-transform: uppercase; }
        .brief-page .src { margin-top: 24px; font-family: var(--mono); font-size: 10px; color: var(--ink-3); border-top: 3px solid var(--ink); padding-top: 6px; }
        .brief-page .fx { font-family: var(--mono); font-size: 11px; font-weight: 700; text-transform: uppercase; border: 2px solid var(--ink); display: inline-block; padding: 2px 8px; margin: 8px 0 0; }
        .brief-page .llm { color: var(--llm-text); }
      `}</style>
      <div className="wrap">
        <PrintButton />
        <div className="wm">Headliner</div>
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
            <tr><th style={{ textAlign: "right" }}>#</th><th>Market</th><th>Tier</th><th style={{ textAlign: "right" }}>Fan score</th><th>Venues (Qloo)</th><th>Hospitality partners</th></tr>
          </thead>
          <tbody>
            {route.map((m, i) => (
              <tr key={m.key} className={m.tier}>
                <td className="n">{i + 1}</td><td className="city">{m.key}</td><td className="t">{tierLabel(m.tier)}</td><td className="n">{m.score}</td>
                <td>{m.venues.slice(0, 2).map((v) => v.name).join(", ") || "–"}</td>
                <td>{m.localSpots.slice(0, 2).map((v) => v.name).join(", ") || "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>2 · Support act</h2>
        <p>{brief.support}</p>
        <table>
          <thead><tr><th>Act</th><th style={{ textAlign: "right" }}>Fit</th><th>Shared taste</th><th>Best market</th></tr></thead>
          <tbody>
            {plan.supportActs.slice(0, 4).map((a) => {
              const best = Object.entries(a.perMarket).sort((x, y) => y[1] - x[1])[0];
              return (
                <tr key={a.id}><td className="city">{a.name}</td><td className="n">{a.fitScore}</td><td>{a.sharedTags.slice(0, 4).join(", ") || "–"}</td><td>{best ? best[0] : "–"}</td></tr>
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
            <p className="meta llm">Plain LLM cities: {contrast.llmCities.map((c) => `${c.input}${c.score !== undefined ? ` (${c.score})` : ""}`).join(", ")}</p>
          </>
        )}
        <div className="src">
          Grounded in {r.calls.length} Qloo API requests ({[...new Set(r.calls.map((c) => c.endpoint))].join(", ")}). Qloo scores describe aggregate audience affinity, not individuals. Run {r.runId}.
        </div>
      </div>
    </div>
  );
}
