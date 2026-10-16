import "server-only";
import { createHash } from "node:crypto";
import path from "node:path";
import { JsonCache } from "./qloo/cache";
import { FixtureStore } from "./qloo/fixtures";
import { QlooClient, type QlooCallRecord } from "./qloo/client";
import { llmFromEnv } from "./llm";
import { normaliseInput, runAgent, type AgentEvent, type RunInput, type RunResult } from "./agent/run";
import { recordedArtists } from "./agent/baseline";

const dataDir = path.resolve(process.env.DATA_DIR || ".data");
const qlooCache = new JsonCache(path.join(dataDir, "qloo"));
// seed/runs: finished live runs recorded before deploy (scripts/seed-runs.sh), shipped with the app but never committed
// (Qloo data stays out of the public repo). Serverless instances start with an empty DATA_DIR, so judges still get instant replays.
const runCache = new JsonCache(path.join(dataDir, "runs"), 300, path.resolve("seed", "runs"));
const fixtures = FixtureStore.default();
let activeRuns = 0;
const MAX_ACTIVE_RUNS = Number(process.env.MAX_ACTIVE_RUNS || 3);

export function serverMode() {
  const llm = llmFromEnv();
  return {
    qloo: process.env.QLOO_API_KEY?.trim() ? ("live" as const) : ("fixture" as const),
    planner: llm ? ("llm" as const) : ("rules" as const),
    model: llm?.model,
    /** Artists with a pre-recorded "without Qloo" answer (used when no LLM is configured, as on the demo host). */
    recorded: llm ? [] : recordedArtists(),
  };
}

function runKey(input: RunInput): string {
  const m = serverMode();
  return `run:v1:${m.qloo}:${m.planner}:${m.model ?? ""}:${JSON.stringify(input)}`;
}

export function runIdFor(input: RunInput): string {
  return createHash("sha256").update(runKey(input)).digest("hex").slice(0, 12);
}

interface StoredRun {
  result: RunResult;
  events: AgentEvent[];
}

export async function getRun(runId: string): Promise<RunResult | undefined> {
  if (!/^[a-f0-9]{12}$/.test(runId)) return undefined;
  return (await runCache.get<StoredRun>(`id:${runId}`))?.result;
}

/**
 * Run (or replay) the agent, streaming events to `emit`.
 * Finished runs are cached, and a replay re-emits the original trace with short delays so the
 * reasoning panel still animates while judges never wait on Qloo or the LLM.
 */
export async function startRun(raw: Partial<RunInput>, emit: (e: AgentEvent) => void, opts: { fresh?: boolean; replayDelayMs?: number } = {}) {
  const input = normaliseInput(raw);
  if (!input.artist) throw new Error("Enter an artist name.");
  const key = runKey(input);
  const runId = runIdFor(input);

  if (!opts.fresh) {
    const stored = await runCache.get<StoredRun>(key);
    if (stored) {
      const delay = opts.replayDelayMs ?? 35;
      for (const e of stored.events) {
        emit(e.type === "run" ? { ...e, replay: true } : e);
        if (delay && (e.type === "step" || e.type === "qloo")) await new Promise((r) => setTimeout(r, delay));
      }
      return stored.result;
    }
  }

  if (activeRuns >= MAX_ACTIVE_RUNS) throw new Error("Headliner is busy with other tours right now; try again in a few seconds.");
  activeRuns++;
  const events: AgentEvent[] = [];
  const record = (e: AgentEvent) => {
    events.push(e);
    emit(e);
  };
  let listener: ((r: QlooCallRecord) => void) | undefined;
  try {
    const client = new QlooClient({
      apiKey: process.env.QLOO_API_KEY,
      baseUrl: process.env.QLOO_BASE_URL,
      cache: qlooCache,
      fixtures,
      onCall: (r) => listener?.(r),
    });
    const result = await runAgent(input, {
      client,
      bindCalls: (fn) => (listener = fn),
      llm: llmFromEnv(),
      emit: record,
      runId,
    });
    // Cache only runs that produced a plan; failed lookups should be retried next time.
    if (!result.error && result.plan.markets.length) {
      const stored: StoredRun = { result, events };
      await runCache.set(key, stored);
      await runCache.set(`id:${runId}`, stored);
    }
    return result;
  } finally {
    activeRuns--;
  }
}
