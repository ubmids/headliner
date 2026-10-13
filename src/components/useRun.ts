"use client";
import { useCallback, useRef, useState } from "react";
import type { AgentEvent, RunInput, RunMode, RunResult, TraceStep } from "@/lib/agent/run";
import type { Baseline } from "@/lib/agent/baseline";
import type { QlooCallRecord } from "@/lib/qloo/client";

export interface RunState {
  status: "idle" | "running" | "done" | "error";
  runId?: string;
  mode?: RunMode;
  replay?: boolean;
  steps: TraceStep[];
  calls: Record<number, QlooCallRecord[]>;
  baseline?: Baseline;
  result?: RunResult;
  error?: string;
}

const initial: RunState = { status: "idle", steps: [], calls: {} };

/** Apply one streamed agent event to the UI state. Exported for tests. */
export function reduce(s: RunState, e: AgentEvent): RunState {
  switch (e.type) {
    case "run":
      return { ...initial, status: "running", runId: e.runId, mode: e.mode, replay: e.replay };
    case "step":
      return { ...s, steps: [...s.steps.filter((x) => x.id !== e.step.id), e.step].sort((a, b) => a.id - b.id) };
    case "step_done":
      return { ...s, steps: s.steps.map((x) => (x.id === e.step.id ? e.step : x)) };
    case "qloo":
      return { ...s, calls: { ...s.calls, [e.stepId]: [...(s.calls[e.stepId] ?? []), e.call] } };
    case "baseline":
      return { ...s, baseline: e.baseline };
    case "done":
      return { ...s, status: "done", result: e.result, baseline: e.result.baseline ?? s.baseline };
    case "error":
      return { ...s, status: "error", error: e.message };
  }
}

export function useRun() {
  const [state, setState] = useState<RunState>(initial);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (input: Partial<RunInput> & { fresh?: boolean }) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState({ ...initial, status: "running" });
    try {
      const res = await fetch("/api/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: ctrl.signal });
      if (!res.ok || !res.body) throw new Error(`Server error ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line) continue;
          const ev = JSON.parse(line) as AgentEvent;
          setState((s) => reduce(s, ev));
        }
      }
      setState((s) => (s.status === "running" ? { ...s, status: "error", error: "The run ended without a result. Please try again." } : s));
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setState((s) => ({ ...s, status: "error", error: err instanceof Error ? err.message : String(err) }));
    }
  }, []);

  return { state, start };
}
