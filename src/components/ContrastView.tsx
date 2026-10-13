"use client";
import { useState } from "react";
import type { RunResult } from "@/lib/agent/run";

type View = "side" | "without" | "with";

function ScoreBar({ label, score, color, note, tip }: { label: string; score?: number; color: string; note?: string; tip?: string }) {
  return (
    <div className="bar-row" data-tip={tip}>
      <span className="name" title={label}>
        {label}
      </span>
      <div className="bar-track">{score !== undefined ? <div className="bar-fill" style={{ width: `${Math.max(score, 1)}%`, background: color }} /> : <span className="muted small">{note ?? "not scored"}</span>}</div>
      <span className="val">{score ?? "–"}</span>
    </div>
  );
}

export default function ContrastView({ result }: { result: RunResult }) {
  const [view, setView] = useState<View>("side");
  const { baseline, contrast, plan } = result;
  if (!baseline || baseline.source === "unavailable" || !contrast) {
    return (
      <section className="card">
        <h2>Without Qloo vs with Qloo</h2>
        <p className="muted">No plain-LLM answer is available for this run{baseline?.note ? `: ${baseline.note}` : ""}. Configure LLM_BASE_URL / LLM_MODEL to enable the comparison.</p>
      </section>
    );
  }
  const route = plan.route.order.map((k) => plan.markets.find((m) => m.key === k)!).filter(Boolean);
  const notFound = contrast.supportChecks.filter((s) => s.affinity === undefined);
  const scoredLlmActs = contrast.supportChecks.filter((s) => s.affinity !== undefined);

  const llmCol = (
    <div className="vs-col llm">
      <h4>
        <span className="swatch" style={{ background: "var(--llm)" }} /> Without Qloo
      </h4>
      <div className="who">
        Plain LLM{baseline.model ? ` (${baseline.model})` : ""}, same question, no data{baseline.source === "recorded-llm" ? " · recorded answer" : ""}
      </div>
      <div className="small muted" style={{ marginBottom: 6 }}>
        Its cities, scored afterwards by Qloo (fan score 0–100, relative to every city scored):
      </div>
      <div className="bars">
        {contrast.llmCities.map((c) => (
          <ScoreBar key={c.input} label={c.input} score={c.score} color="var(--llm)" note="not a Qloo market" tip={c.rank ? `Qloo rank ${c.rank} of ${plan.markets.length}${c.tier ? ` · ${c.tier}` : ""}` : undefined} />
        ))}
      </div>
      <div className="small" style={{ marginTop: 10 }}>
        <b>Opener:</b> {baseline.supportActs.slice(0, 3).join(", ") || "–"}
        <br />
        <b>Sponsors:</b> {baseline.sponsors.slice(0, 5).join(", ") || "–"}
      </div>
      {baseline.reasoning && <p className="small muted">“{baseline.reasoning}”</p>}
    </div>
  );

  const qlooCol = (
    <div className="vs-col qloo">
      <h4>
        <span className="swatch" style={{ background: "var(--qloo)" }} /> With Qloo
      </h4>
      <div className="who">Headliner agent, grounded in {result.calls.length} Qloo requests</div>
      <div className="small muted" style={{ marginBottom: 6 }}>
        The routed tour (fan score 0–100):
      </div>
      <div className="bars">
        {route.map((m) => (
          <ScoreBar key={m.key} label={m.key} score={m.score} color="var(--qloo)" tip={`${m.tier} · over-index ${m.overIndex >= 0 ? "+" : ""}${Math.round(m.overIndex * 100)}`} />
        ))}
      </div>
      <div className="small" style={{ marginTop: 10 }}>
        <b>Opener:</b> {plan.supportActs.slice(0, 3).map((a) => `${a.name} (${a.fitScore})`).join(", ") || "–"}
        <br />
        <b>Sponsors:</b> {plan.sponsors.flatMap((c) => c.national.slice(0, 2).map((b) => b.name)).join(", ") || "–"}
      </div>
    </div>
  );

  return (
    <section className="card" aria-labelledby="vs-h">
      <div className="section-head">
        <div>
          <h2 id="vs-h">Without Qloo vs with Qloo</h2>
          <h3>Same question. One answer guesses, one asks the taste graph.</h3>
        </div>
        <div className="tabs" role="group" aria-label="Comparison view">
          <button aria-pressed={view === "without"} onClick={() => setView("without")}>
            Without Qloo
          </button>
          <button aria-pressed={view === "side"} onClick={() => setView("side")}>
            Side by side
          </button>
          <button aria-pressed={view === "with"} onClick={() => setView("with")}>
            With Qloo
          </button>
        </div>
      </div>
      <div className="callout">
        <b>{contrast.headline}</b>
      </div>
      <div className="stat-row">
        <div className="stat">
          <div className="num">
            <span style={{ color: "var(--seq-300)" }}>{contrast.qlooAvgScore ?? "–"}</span> <span className="muted" style={{ fontSize: 18 }}>vs</span> <span style={{ color: "#f0936b" }}>{contrast.llmAvgScore ?? "–"}</span>
          </div>
          <div className="lbl">average fan score: Qloo route vs plain-LLM cities</div>
        </div>
        <div className="stat">
          <div className="num">{contrast.missedByLlm.length}</div>
          <div className="lbl">of {route.length} Qloo tour stops the LLM never mentioned{contrast.missedByLlm.some((m) => m.tier === "sleeper") ? " (incl. sleeper markets)" : ""}</div>
        </div>
        <div className="stat">
          <div className="num">{notFound.length ? notFound.length : contrast.weakLlmPicks.length}</div>
          <div className="lbl">
            {notFound.length
              ? `LLM-suggested opener${notFound.length > 1 ? "s" : ""} Qloo can't find (${notFound.map((n) => n.name).join(", ")})`
              : `LLM cities in the bottom half of Qloo's ranking`}
          </div>
        </div>
      </div>
      {view === "side" && (
        <div className="vs">
          {llmCol}
          {qlooCol}
        </div>
      )}
      {view === "without" && llmCol}
      {view === "with" && qlooCol}
      {scoredLlmActs.length > 0 && contrast.qlooTopSupport && (
        <p className="small muted" style={{ marginTop: 10 }}>
          Opener check: the LLM&apos;s {scoredLlmActs.map((s) => `${s.name} (${Math.round(s.affinity! * 100)})`).join(", ")} vs Qloo&apos;s {contrast.qlooTopSupport.name} ({contrast.qlooTopSupport.fitScore}), audience
          overlap with the headliner&apos;s fans on the same Qloo scale.
        </p>
      )}
    </section>
  );
}
