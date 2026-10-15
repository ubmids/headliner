"use client";
import { useState } from "react";
import type { RunResult } from "@/lib/agent/run";

type View = "side" | "without" | "with";

/** The verdict: the plain LLM's tour next to Headliner's, both scored on the same Qloo fan-score scale. */
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
  const weak = new Set(contrast.weakLlmPicks.map((w) => w.input));
  const missed = new Set(contrast.missedByLlm.map((m) => m.market));

  const llmCol = (
    <div className="vs-col llm">
      <p className="who">
        Without Qloo · plain LLM{baseline.model ? ` (${baseline.model})` : ""}
        {baseline.source === "recorded-llm" ? " · recorded answer" : ""}
      </p>
      <h4>The guess tour</h4>
      <p className="how">Same question, no data. Its cities, scored afterwards by Qloo (fan score 0–100, relative to every city scored).</p>
      <ol className="route-list" aria-label="Plain LLM cities with Qloo fan score">
        {contrast.llmCities.map((c) => (
          <li key={c.input} className={c.score === undefined ? "nf" : weak.has(c.input) ? "weak" : ""} title={c.rank ? `Qloo rank ${c.rank} of ${plan.markets.length}${c.tier ? ` · ${c.tier}` : ""}` : undefined}>
            <span className="c">{c.input.split(",")[0]}</span>
            <span className="v">
              {c.rank && weak.has(c.input) ? <small>rank {c.rank} of {plan.markets.length}</small> : null}
              {c.score ?? <small>not a Qloo market</small>}
            </span>
          </li>
        ))}
      </ol>
      <div className="vs-extra">
        <b>Opener:</b> {baseline.supportActs.slice(0, 3).join(", ") || "–"}
        <br />
        <b>Sponsors:</b> {baseline.sponsors.slice(0, 5).join(", ") || "–"}
        {baseline.reasoning && <q>{baseline.reasoning}</q>}
      </div>
    </div>
  );

  const qlooCol = (
    <div className="vs-col qloo">
      <p className="who">With Qloo · Headliner agent, {result.calls.length} Qloo requests</p>
      <h4>The taste tour</h4>
      <p className="how">The routed tour, in order (fan score 0–100). Pink: stops the plain LLM never named.</p>
      <ol className="route-list" aria-label="Headliner route with Qloo fan score">
        {route.map((m) => (
          <li key={m.key} className={missed.has(m.key) ? "new" : ""} title={`${m.tier} · over-index ${m.overIndex >= 0 ? "+" : ""}${Math.round(m.overIndex * 100)}`}>
            <span className="c">
              {m.key.split(",")[0]}
              {m.tier === "sleeper" ? <small>sleeper</small> : null}
            </span>
            <span className="v">{m.score}</span>
          </li>
        ))}
      </ol>
      <div className="vs-extra">
        <b>Opener:</b> {plan.supportActs.slice(0, 3).map((a) => `${a.name} (${a.fitScore})`).join(", ") || "–"}
        <br />
        <b>Sponsors:</b> {plan.sponsors.flatMap((c) => c.national.slice(0, 2).map((b) => b.name)).join(", ") || "–"}
      </div>
    </div>
  );

  const scores = (
    <div className="score-col" aria-label="Average fan score">
      <span className="n q">{contrast.qlooAvgScore ?? "–"}</span>
      <small>avg fan score: Qloo route vs plain LLM</small>
      <span className="n l">{contrast.llmAvgScore ?? "–"}</span>
    </div>
  );

  return (
    <section className="card" aria-labelledby="vs-h">
      <div className="section-head">
        <h2 id="vs-h">
          <span className="k">Same question. One answer guesses, one asks the taste graph.</span>
          Without Qloo vs with Qloo
        </h2>
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
      <p className="callout">{contrast.headline}</p>
      {view === "side" && (
        <div className="vs">
          {llmCol}
          {scores}
          {qlooCol}
        </div>
      )}
      {view === "without" && (
        <div className="vs single">
          {llmCol}
          {scores}
        </div>
      )}
      {view === "with" && (
        <div className="vs single">
          {qlooCol}
          {scores}
        </div>
      )}
      <div className="stat-row">
        <div className="stat">
          <div className="num">{contrast.missedByLlm.length}</div>
          <div className="lbl">of {route.length} Qloo tour stops the LLM never mentioned{contrast.missedByLlm.some((m) => m.tier === "sleeper") ? " (incl. sleeper markets)" : ""}</div>
        </div>
        <div className="stat">
          <div className="num">{contrast.weakLlmPicks.length}</div>
          <div className="lbl">LLM cities in the bottom half of Qloo&apos;s ranking</div>
        </div>
        <div className="stat">
          <div className="num">{notFound.length}</div>
          <div className="lbl">
            {notFound.length ? `LLM-suggested opener${notFound.length > 1 ? "s" : ""} Qloo can't find (${notFound.map((n) => n.name).join(", ")})` : "LLM-suggested openers Qloo can't find"}
          </div>
        </div>
      </div>
      {scoredLlmActs.length > 0 && contrast.qlooTopSupport && (
        <p className="src-line">
          Opener check: the LLM&apos;s {scoredLlmActs.map((s) => `${s.name} (${Math.round(s.affinity! * 100)})`).join(", ")} vs Qloo&apos;s {contrast.qlooTopSupport.name} ({contrast.qlooTopSupport.fitScore}), audience
          overlap with the headliner&apos;s fans on the same Qloo scale.
        </p>
      )}
    </section>
  );
}
