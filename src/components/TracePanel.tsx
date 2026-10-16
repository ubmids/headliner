"use client";
import { useEffect, useRef } from "react";
import type { RunMode } from "@/lib/agent/run";
import type { QlooCallRecord } from "@/lib/qloo/client";
import type { RunState } from "./useRun";

const HIDE = new Set(["signal.interests.entities", "filter.results.entities", "filter.exclude.entities", "a.signal.interests.entities", "b.signal.interests.entities"]);

function shortParam(k: string, v: string) {
  if (HIDE.has(k)) {
    const n = v.split(",").length;
    return n > 1 ? `${n} entity IDs` : `${v.slice(0, 8)}…`;
  }
  if (k === "filter.location" && v.startsWith("POLYGON")) return "POLYGON(region)";
  return v.length > 48 ? `${v.slice(0, 46)}…` : v;
}

function Call({ c }: { c: QlooCallRecord }) {
  const badge = c.status === "error" ? "empty" : c.source.startsWith("fixture") ? "fixture" : c.source === "cache" ? "cache" : "live";
  return (
    <div className="call" title={c.url}>
      <span className="ep">GET {c.endpoint}</span>{" "}
      <span className="p">
        {c.params.map(([k, v]) => (
          <span key={k}>
            <b>{k}</b>={shortParam(k, v)}{" "}
          </span>
        ))}
      </span>
      <div className="res">
        <span className={`badge ${badge}`}>{c.source}</span>
        {c.status === "empty" && <span className="badge empty" title="Qloo returned no results. On a location-conditioned rank this means the artist does not rank there; elsewhere it can mean an ignored parameter (scripts/qloo-smoke.ts checks those).">empty</span>}
        {c.status === "error" ? <span>{c.error?.slice(0, 90)}</span> : <span>{c.resultCount} results</span>}
        <span className="muted">{c.durationMs} ms</span>
      </div>
    </div>
  );
}

export default function TracePanel({ state, defaultMode }: { state: RunState; defaultMode: RunMode }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const mode = state.mode ?? defaultMode;
  const calls = Object.values(state.calls).flat();
  const endpoints = new Set(calls.map((c) => (c.endpoint === "/v2/insights" ? `insights:${c.params.find(([k]) => k === "filter.type")?.[1]}` : c.endpoint)));
  useEffect(() => {
    if (state.status === "running") bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [state.steps.length, calls.length, state.status]);
  return (
    <div className="trace-card" aria-label="Agent reasoning trace">
      <div className="trace-head">
        <h2>Reasoning trace</h2>
        <div className="meta">
          <span>planner: {mode.planner === "llm" ? mode.model : "deterministic"}</span>
          <span>· Qloo: {mode.qloo}</span>
          {calls.length > 0 && (
            <span>
              · {calls.length} requests · {endpoints.size} endpoint types
            </span>
          )}
          {state.replay && <span className="badge cache">replayed from cache</span>}
        </div>
      </div>
      <div className="trace-body" ref={bodyRef}>
        {state.steps.length === 0 && <p className="empty">Every Qloo request the agent makes appears here as it happens: endpoint, parameters and a summary of what came back.</p>}
        {state.steps.map((s) => (
          <div key={s.id} className={`step ${s.status}`}>
            <div className="tool">
              {s.id}. {s.tool}
              {s.auto ? " (coverage check)" : ""}
              {s.ms !== undefined ? <span className="muted"> · {s.ms} ms</span> : null}
            </div>
            <div className="thought">{s.thought}</div>
            {(state.calls[s.id] ?? []).map((c) => (
              <Call key={c.id} c={c} />
            ))}
            {s.summary && <div className="summary">→ {s.summary}</div>}
            {s.error && <div className="err">✕ {s.error}</div>}
          </div>
        ))}
        {state.baseline && (
          <div className="step done llm">
            <div className="tool">plain LLM (no tools)</div>
            <div className="thought">
              {state.baseline.source === "unavailable"
                ? `No plain-LLM answer: ${state.baseline.note}`
                : `Answered without Qloo${state.baseline.model ? ` (${state.baseline.model}${state.baseline.source === "recorded-llm" ? ", cached answer" : ""})` : ""}: ${state.baseline.cities.slice(0, 5).join(", ")}…`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
