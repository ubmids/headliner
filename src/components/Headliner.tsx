"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { REGIONS, type RegionId } from "@/lib/geo";
import type { RunMode, RunResult } from "@/lib/agent/run";
import { useRun } from "./useRun";
import TracePanel from "./TracePanel";
import ContrastView from "./ContrastView";
import { MarketBars, TierLegend } from "./MarketBars";
import SupportActs from "./SupportActs";
import Sponsors from "./Sponsors";
import Audience from "./Audience";

const TourMap = dynamic(() => import("./TourMap"), { ssr: false, loading: () => <div className="map" /> });

const SAMPLES: Array<{ artist: string; region: RegionId; blurb: string }> = [
  { artist: "Tyler Childers", region: "north-america", blurb: "country, US & Canada" },
  { artist: "Noah Kahan", region: "north-america", blurb: "folk-pop, US & Canada" },
  { artist: "Fontaines D.C.", region: "uk-europe", blurb: "post-punk, UK & Europe" },
];

export default function Headliner({ mode }: { mode: RunMode & { recorded?: string[] } }) {
  const { state, start } = useRun();
  const [artist, setArtist] = useState("");
  const [region, setRegion] = useState<RegionId>("north-america");
  const [dates, setDates] = useState(8);
  const [cities, setCities] = useState("");
  const result = state.result;
  const running = state.status === "running";

  const run = (a = artist, r = region, c = cities) => {
    if (!a.trim()) return;
    void start({ artist: a, region: r, dates, cities: c.split(/\n|;/).map((s) => s.trim()).filter(Boolean) });
  };
  const sample = (s: (typeof SAMPLES)[number]) => {
    setArtist(s.artist);
    setRegion(s.region);
    setCities("");
    run(s.artist, s.region, "");
  };

  // Deep link: /?artist=Noah%20Kahan&region=north-america runs immediately (handy for demos and judges).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const a = q.get("artist");
    if (a) {
      const r = (q.get("region") as RegionId) || "north-america";
      setArtist(a);
      setRegion(r in REGIONS ? r : "north-america");
      void start({ artist: a, region: r in REGIONS ? r : "north-america", dates: Number(q.get("dates")) || 8, cities: [] });
    }
  }, [start]);

  const qlooMode = state.mode?.qloo ?? mode.qloo;
  const totalCalls = useMemo(() => Object.values(state.calls).reduce((n, l) => n + l.length, 0), [state.calls]);

  return (
    <div className="shell">
      <header className="mast">
        <div>
          <h1 className="wordmark">Headliner</h1>
          <p className="tag">Tour decisions on taste data, not guesswork</p>
        </div>
        <div className="mast-right">
          <span className={`stamp ${qlooMode === "live" ? "live" : ""}`}>{qlooMode === "live" ? "Live Qloo data" : "Fixture data · illustrative"}</span>
          <span>
            powered by <b>Qloo</b> Taste AI
          </span>
        </div>
      </header>

      <section className="hero no-print">
        <p className="lede">
          A 20-city tour is a multi-million-dollar bet on <strong>where to play</strong>, <strong>who opens</strong> and <strong>which brands pay for it</strong>. Headliner is an agent
          that answers all three from <strong>Qloo&apos;s taste graph</strong>, shows every Qloo call it makes, and puts its answer next to what a plain LLM would have said.
        </p>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
        >
          <label>
            Headliner
            <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist or band" aria-label="Artist" required />
          </label>
          <label>
            Region
            <select value={region} onChange={(e) => setRegion(e.target.value as RegionId)} aria-label="Region">
              {Object.values(REGIONS).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Dates
            <input type="number" min={3} max={15} value={dates} onChange={(e) => setDates(Number(e.target.value))} aria-label="Number of dates" />
          </label>
          <label className="wide">
            Candidate cities (optional, one per line)
            <textarea rows={1} value={cities} onChange={(e) => setCities(e.target.value)} placeholder="Austin, TX; Denver, CO; ..." aria-label="Candidate cities" />
          </label>
          <button className="btn" disabled={running} type="submit">
            {running ? "Planning…" : "Plan the tour"}
          </button>
        </form>
        <div className="samples">
          <span>Try a sample:</span>
          {SAMPLES.map((s) => (
            <button key={s.artist} className="chip" type="button" onClick={() => sample(s)} disabled={running}>
              <b>{s.artist}</b> <span>{s.blurb}</span>
            </button>
          ))}
        </div>
      </section>

      {qlooMode === "fixture" && (
        <div className="banner fixture" role="status">
          <span>
            <b>Fixture mode:</b> no Qloo API key is configured, so Qloo answers come from <b>recorded fixtures</b> in the documented response format. Names and scores are
            illustrative placeholders, not Qloo data. Only the sample artists are covered. Set <code>QLOO_API_KEY</code> for live Qloo data on any artist.
          </span>
        </div>
      )}
      {qlooMode === "live" && (
        <div className="banner" role="note">
          <span>
            <b>Live Qloo data:</b> every request in the trace goes to Qloo&apos;s hackathon API (responses and finished runs are cached server-side, so repeat runs replay
            instantly). The plan comes from a {mode.planner === "llm" ? `tool-calling LLM (${mode.model})` : "deterministic planner running the same Qloo tools"}.
            {mode.recorded?.length ? " The \"without Qloo\" answers are recorded ahead of time from Claude Haiku 4.5 with the same prompt, because this host has no LLM key." : ""}
          </span>
        </div>
      )}
      {state.status === "error" && <div className="banner error">{state.error}</div>}
      {result?.error && <div className="banner error">{result.error}</div>}

      <div className="layout">
        <main>
          {!result && state.status !== "running" && <Intro />}
          {!result && running && <Working calls={totalCalls} steps={state.steps.length} baselineReady={!!state.baseline} />}
          {result && !result.error && <Result result={result} recorded={mode.recorded ?? []} />}
        </main>
        <aside className="trace">
          <TracePanel state={state} defaultMode={mode} />
        </aside>
      </div>
      <footer className="footer">
        Headliner uses the Qloo hackathon API (search, tags, insights, heatmaps, demographics, analysis/compare, trending). Basemap: Natural Earth. MIT licensed.
      </footer>
    </div>
  );
}

function Intro() {
  return (
    <div className="card empty-state">
      <h3>Pick a sample artist above to watch the agent plan a tour.</h3>
      <p>
        The agent resolves the artist in Qloo, maps where their fans concentrate, scores cities, finds venues, re-ranks opening acts market by market, and pulls the brands
        the audience over-indexes on. Then it fact-checks a plain LLM&apos;s plan with the same Qloo calls.
      </p>
    </div>
  );
}

function Working({ calls, steps, baselineReady }: { calls: number; steps: number; baselineReady: boolean }) {
  return (
    <div className="card empty-state" aria-live="polite">
      <h3>The agent is planning…</h3>
      <p className="mono">
        {steps} steps · {calls} Qloo requests so far{baselineReady ? " · plain-LLM answer ready" : ""}. Follow along in the reasoning trace.
      </p>
    </div>
  );
}

function Result({ result, recorded }: { result: RunResult; recorded: string[] }) {
  const { plan, brief } = result;
  const route = plan.route.order.map((k) => plan.markets.find((m) => m.key === k)!).filter(Boolean);
  const [showLlm, setShowLlm] = useState(true);
  return (
    <>
      <ContrastView result={result} recorded={recorded} />

      <section className="card" aria-labelledby="brief-h">
        <div className="section-head">
          <h2 id="brief-h">Tour brief · {plan.artist?.name}</h2>
          <span className="src">
            {result.mode.qloo === "live" ? "live Qloo data" : "fixture data"} · planner: {result.mode.planner === "llm" ? result.mode.model : "deterministic"}
          </span>
        </div>
        <p className="headline">{brief.headline}</p>
        <div className="decisions">
          <div className="decision">
            <h4>1 · Routing</h4>
            <p>{brief.routing}</p>
          </div>
          <div className="decision">
            <h4>2 · Support act</h4>
            <p>{brief.support}</p>
          </div>
          <div className="decision">
            <h4>3 · Sponsors &amp; merch</h4>
            <p>{brief.sponsors}</p>
          </div>
        </div>
        <div className="actions no-print">
          <a className="btn" href={`/brief/${result.runId}`} target="_blank" rel="noreferrer">
            Open printable brief
          </a>
          <a className="btn ghost" href={`/api/run/${result.runId}?format=csv`}>
            Download CSV
          </a>
        </div>
      </section>

      <section className="card" aria-labelledby="route-h">
        <div className="section-head">
          <h2 id="route-h">
            <span className="k">Decision 1 · Routing</span>
            {route.length} dates, {plan.route.km.toLocaleString("en-US")} km
          </h2>
          {result.baseline?.cities.length ? (
            <div className="tabs" role="group" aria-label="Map overlay">
              <button aria-pressed={showLlm} onClick={() => setShowLlm(true)}>
                Show plain-LLM picks
              </button>
              <button aria-pressed={!showLlm} onClick={() => setShowLlm(false)}>
                Qloo only
              </button>
            </div>
          ) : null}
        </div>
        <p className="sub">
          Fan score blends Qloo heatmap affinity (where fans concentrate) with the artist&apos;s location-aware affinity per city. <b>Sleeper</b> markets over-index for their size:
          smaller rooms that sell through.
        </p>
        <div className="dates" role="list" aria-label="Routed tour, in order">
          {route.map((m, i) => (
            <div key={m.key} className={`date ${m.tier}`} role="listitem">
              <span className="no">{String(i + 1).padStart(2, "0")}</span>
              <div style={{ minWidth: 0 }}>
                <div className="city" title={m.key}>
                  {m.key.split(",")[0]}
                  <span className="muted mono" style={{ fontSize: 12, fontWeight: 400, marginLeft: 6 }}>
                    {m.key.split(",")[1]?.trim()}
                  </span>
                </div>
                <div className="room">
                  {m.venues.length ? m.venues.slice(0, 3).map((v) => v.name).join(" · ") : <span className="muted">{m.venuesSearched ? "no Qloo venue match" : "not searched"}</span>}
                </div>
              </div>
              <div className="sc">
                {m.score}
                <span className={`tier ${m.tier}`}>
                  <span className="swatch" />
                  {m.tier}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="map-wrap">
          <TourMap plan={plan} llmCities={showLlm ? (result.contrast?.llmCities ?? []) : []} regionId={plan.regionId} />
          <div>
            <TierLegend />
            <MarketBars markets={plan.markets.slice(0, 14)} routeKeys={plan.route.order} />
          </div>
        </div>
        <div className="src-line">Qloo: /v2/insights heatmap (urn:heatmap) · artist affinity per city (signal.location.query) · places (urn:entity:place) for venues</div>
      </section>

      <SupportActs plan={plan} />
      <Sponsors plan={plan} />
      <Audience plan={plan} />
    </>
  );
}
