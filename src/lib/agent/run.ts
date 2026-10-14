import { REGIONS, orderRoute, type RegionId } from "../geo";
import type { ChatMessage, LlmClient, ToolSpec } from "../llm";
import { emptyPlan, scoreMarkets, scoreSupportActs, type TourPlan } from "../plan";
import type { QlooCallRecord, QlooClient } from "../qloo/client";
import { buildContrast, type Contrast } from "../contrast";
import { liveBaseline, recordedBaseline, type Baseline } from "./baseline";
import { FINISH_TOOL, TOOLS, scoreNamedArtists, toolByName, type ToolContext } from "./tools";
import { templateBrief, type BriefText } from "./brief";

export interface RunInput {
  artist: string;
  region: RegionId;
  cities: string[];
  dates: number;
}

export interface TraceStep {
  id: number;
  tool: string;
  args: Record<string, unknown>;
  thought: string;
  status: "running" | "done" | "error";
  summary?: string;
  error?: string;
  callIds: number[];
  ms?: number;
  auto?: boolean;
}

export interface RunMode {
  qloo: "live" | "fixture";
  planner: "llm" | "rules";
  model?: string;
}

export interface RunResult {
  runId: string;
  input: RunInput;
  mode: RunMode;
  plan: TourPlan;
  brief: BriefText;
  baseline?: Baseline;
  contrast?: Contrast;
  steps: TraceStep[];
  calls: QlooCallRecord[];
  createdAt: string;
  durationMs: number;
  error?: string;
}

export type AgentEvent =
  | { type: "run"; runId: string; mode: RunMode; input: RunInput; replay?: boolean }
  | { type: "step"; step: TraceStep }
  | { type: "qloo"; stepId: number; call: QlooCallRecord }
  | { type: "step_done"; step: TraceStep }
  | { type: "baseline"; baseline: Baseline }
  | { type: "done"; result: RunResult }
  | { type: "error"; message: string };

export interface RunDeps {
  client: QlooClient;
  /** Subscribe to the client's per-request records (the client is created per run with onCall wired here). */
  bindCalls: (fn: (r: QlooCallRecord) => void) => void;
  llm?: LlmClient;
  emit: (e: AgentEvent) => void;
  runId: string;
  today?: Date;
  fixtureRoot?: string;
}

const REQUIRED_TOOLS = ["resolve_artist", "find_venues", "find_support_acts", "support_overlap_by_market", "find_sponsors"];

export function normaliseInput(raw: Partial<RunInput>): RunInput {
  const region = (raw.region && raw.region in REGIONS ? raw.region : "north-america") as RegionId;
  const cities = (raw.cities ?? []).map((c) => String(c).trim()).filter(Boolean).slice(0, 16);
  const dates = Math.min(Math.max(Math.round(Number(raw.dates) || 8), 3), 15);
  return { artist: String(raw.artist ?? "").trim().slice(0, 80), region, cities, dates };
}

export async function runAgent(input: RunInput, deps: RunDeps): Promise<RunResult> {
  const started = Date.now();
  const region = REGIONS[input.region];
  const plan = emptyPlan(input.region, input.dates, input.cities);
  const ctx: ToolContext = { client: deps.client, plan, region, tagMemo: new Map(), today: deps.today };
  const mode: RunMode = { qloo: deps.client.mode, planner: deps.llm ? "llm" : "rules", model: deps.llm?.model };
  const steps: TraceStep[] = [];
  let current: TraceStep | undefined;
  let finishArgs: Partial<BriefText> | undefined;
  let fatal: string | undefined;

  deps.bindCalls((call) => {
    if (current) current.callIds.push(call.id);
    deps.emit({ type: "qloo", stepId: current?.id ?? 0, call });
  });
  deps.emit({ type: "run", runId: deps.runId, mode, input });

  // "Without Qloo" runs alongside the agent so the side-by-side is ready at the same time.
  const baselinePromise: Promise<Baseline | undefined> = (async () => {
    try {
      const b = deps.llm ? await liveBaseline(deps.llm, input.artist, input.region, input.dates, input.cities) : await recordedBaseline(input.artist, deps.fixtureRoot);
      if (b) deps.emit({ type: "baseline", baseline: b });
      return b;
    } catch (err) {
      const b: Baseline = { source: "unavailable", cities: [], supportActs: [], sponsors: [], reasoning: "", note: err instanceof Error ? err.message : String(err) };
      deps.emit({ type: "baseline", baseline: b });
      return b;
    }
  })();

  const exec = async (tool: string, args: Record<string, unknown>, thought: string, auto = false): Promise<string> => {
    const def = toolByName(tool);
    const step: TraceStep = { id: steps.length + 1, tool, args, thought, status: "running", callIds: [], auto };
    steps.push(step);
    current = step;
    deps.emit({ type: "step", step: { ...step } });
    const t0 = Date.now();
    try {
      if (!def) throw new Error(`Unknown tool ${tool}`);
      const res = await def.run(ctx, args);
      if (["discover_markets", "rank_cities"].includes(tool)) plan.markets = scoreMarkets(plan.markets, plan.heat);
      if (tool === "support_overlap_by_market" || tool === "find_support_acts") plan.supportActs = scoreSupportActs(plan.supportActs);
      step.status = "done";
      step.summary = res.summary;
    } catch (err) {
      step.status = "error";
      step.error = err instanceof Error ? err.message : String(err);
      if (tool === "resolve_artist") fatal = step.error;
    } finally {
      step.ms = Date.now() - t0;
      current = undefined;
      deps.emit({ type: "step_done", step: { ...step } });
    }
    return step.status === "done" ? step.summary! : `ERROR: ${step.error}`;
  };

  try {
    if (deps.llm) {
      finishArgs = await llmPlanner(input, deps.llm, exec, () => !!fatal);
    } else {
      await rulesPlanner(input, plan, exec, () => !!fatal);
    }

    if (!fatal) {
      // Coverage guard: whatever the planner did, every decision in the brief must be grounded in Qloo.
      const ran = new Set(steps.filter((s) => s.status === "done").map((s) => s.tool));
      if (!ran.has("discover_markets") && !ran.has("rank_cities")) await exec("discover_markets", {}, "No markets were scored yet, so I'm mapping fan affinity across the region first.", true);
      for (const tool of REQUIRED_TOOLS) {
        if (!ran.has(tool) && !steps.some((s) => s.tool === tool && s.status === "done")) {
          await exec(tool, {}, `The brief needs ${tool.replace(/_/g, " ")} before it can be finished, so I'm running it now.`, true);
        }
      }
    }

    // Fact-check the plain LLM's answer with the same Qloo calls.
    const baseline = await baselinePromise;
    let contrast: Contrast | undefined;
    if (!fatal && baseline && baseline.cities.length) {
      const unscored = baseline.cities.filter((c) => !plan.markets.some((m) => m.localAffinity !== undefined && (m.key.toLowerCase() === c.toLowerCase() || m.city.toLowerCase() === c.split(",")[0].trim().toLowerCase())));
      if (unscored.length) {
        await exec("rank_cities", { cities: unscored }, `Fact-checking the plain LLM: scoring its ${unscored.length} unscored cities with the same Qloo affinity call I used for mine.`);
      }
    }

    finalise(plan);
    if (!fatal) {
      // The fact-check can re-order the ranking; make sure every stop on the final route has venues.
      const bare = plan.route.order.filter((k) => !plan.markets.find((m) => m.key === k)?.venuesSearched);
      if (bare.length) {
        await exec("find_venues", { markets: bare }, `The final route includes ${bare.length} stop${bare.length > 1 ? "s" : ""} I haven't looked at venues for yet (${bare.map((k) => k.split(",")[0]).join(", ")}); filling those in.`);
      }
    }

    let supportChecks: Array<{ name: string; affinity?: number }> = [];
    if (!fatal && baseline?.supportActs.length) {
      const step: TraceStep = { id: steps.length + 1, tool: "score_named_artists", args: { names: baseline.supportActs.slice(0, 3) }, thought: "Checking the plain LLM's opening-act picks against the headliner's real audience overlap.", status: "running", callIds: [] };
      steps.push(step);
      current = step;
      deps.emit({ type: "step", step: { ...step } });
      const t0 = Date.now();
      supportChecks = await scoreNamedArtists(ctx, baseline.supportActs.slice(0, 3));
      current = undefined;
      step.status = "done";
      step.ms = Date.now() - t0;
      step.summary = supportChecks.map((s) => `${s.name}: ${s.affinity === undefined ? "not found" : Math.round(s.affinity * 100)}`).join(", ");
      deps.emit({ type: "step_done", step: { ...step } });
    }

    if (!fatal && baseline && baseline.cities.length) {
      contrast = buildContrast({ llmCities: baseline.cities, markets: plan.markets, routeKeys: plan.route.order, supportChecks, supportActs: plan.supportActs });
    }

    const template = templateBrief(plan, contrast);
    const brief: BriefText = {
      headline: finishArgs?.headline?.trim() || template.headline,
      routing: withFullRoute(finishArgs?.routing?.trim(), plan) || template.routing,
      support: finishArgs?.support?.trim() || template.support,
      sponsors: finishArgs?.sponsors?.trim() || template.sponsors,
    };

    const result: RunResult = {
      runId: deps.runId,
      input,
      mode,
      plan,
      brief,
      baseline,
      contrast,
      steps,
      calls: [...deps.client.calls],
      createdAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      error: fatal,
    };
    deps.emit({ type: "done", result });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    deps.emit({ type: "error", message });
    throw err;
  }
}

/** The LLM writes its paragraph before the route is final; make sure every stop is named. */
export function withFullRoute(text: string | undefined, plan: TourPlan): string | undefined {
  if (!text) return undefined;
  const cities = plan.route.order.map((k) => k.split(",")[0]);
  const missing = cities.filter((c) => !text.includes(c));
  return missing.length ? `${text} Full route (${cities.length} dates, ${plan.route.km.toLocaleString("en-US")} km): ${cities.join(" → ")}.` : text;
}

/** Pick the tour: top N markets by score, ordered into a drivable route. */
export function finalise(plan: TourPlan) {
  plan.markets = scoreMarkets(plan.markets, plan.heat);
  plan.supportActs = scoreSupportActs(plan.supportActs);
  const picks = plan.markets.filter((m) => m.tier !== "skip").slice(0, plan.dates);
  const chosen = picks.length >= Math.min(3, plan.markets.length) ? picks : plan.markets.slice(0, plan.dates);
  const { order, km } = orderRoute(chosen);
  plan.route = { order: order.map((m) => m.key), km };
}

type Exec = (tool: string, args: Record<string, unknown>, thought: string) => Promise<string>;

/** Deterministic planner: the same tools in a sensible order, used when no LLM is configured. */
export async function rulesPlanner(input: RunInput, plan: TourPlan, exec: Exec, stop: () => boolean) {
  await exec("resolve_artist", { name: input.artist }, `First I need ${input.artist}'s Qloo entity ID; every later call is anchored on it.`);
  if (stop()) return;
  await exec("taste_profile", {}, "Before choosing cities, I want to know what defines this audience's taste.");
  await exec("audience_demographics", {}, "Age and gender skew will matter for sponsor fit.");
  if (input.cities.length) {
    await exec("rank_cities", { cities: input.cities }, `The promoter gave me ${input.cities.length} candidate cities; I'll score each one with Qloo's location-aware artist affinity.`);
    await exec("discover_markets", {}, "I'll also scan the whole region's heatmap in case the shortlist is missing a market where fans over-index.");
    const extra = plan.markets.filter((m) => m.localAffinity === undefined).slice(0, 6).map((m) => m.key);
    if (extra.length) await exec("rank_cities", { cities: extra }, `The heatmap surfaced ${extra.length} cities that weren't on the shortlist; scoring them the same way so the comparison is fair.`);
  } else {
    await exec("discover_markets", {}, "No shortlist was given, so I'll start from Qloo's heatmap of where these fans concentrate across the region.");
    const top = plan.markets.slice(0, 12).map((m) => m.key);
    if (top.length) await exec("rank_cities", { cities: top }, "Confirming the heatmap's top cities with a second, independent Qloo signal: the artist's affinity when each city is the location signal.");
  }
  const stops = plan.markets.filter((m) => m.tier !== "skip").slice(0, Math.min(input.dates, 10)).map((m) => m.key);
  await exec("find_venues", { markets: stops }, `Now venues: in the ${stops.length} markets likely to make the tour, which music venues draw people with this taste?`);
  await exec("find_support_acts", {}, "Opening act: artists these fans also love, capped below the headliner's popularity so they open rather than compete.");
  const top4 = plan.markets.slice(0, 4).map((m) => m.key);
  await exec("support_overlap_by_market", { markets: top4 }, "Overlap can differ city to city, so I'll re-rank the candidates against the headliner's fans in each top market.");
  const best = plan.supportActs.slice(0, 2).map((a) => a.id);
  if (best.length) await exec("explain_overlap", { support_act_ids: best }, "Explaining the top two fits with Qloo's audience comparison: what the fan bases share.");
  const top3 = plan.markets.slice(0, 3).map((m) => m.key);
  await exec("find_sponsors", { markets: top3 }, "Sponsors and merch: which brands this audience over-indexes on, region-wide and in the top markets. An LLM can't know this.");
  await exec("find_local_partners", { markets: top3 }, "Local hospitality partners for pre- and after-show activations.");
  await exec("audience_trend", {}, "Last check: is the audience growing? That decides room sizes.");
}

const SYSTEM_PROMPT = `You are Headliner, a tour-planning agent for live-music promoters. You make three expensive decisions for a headline tour using Qloo's taste data, never your own assumptions:
1. ROUTING: which cities/markets to play (and venues there).
2. SUPPORT ACT: which opener's fans overlap with the headliner's, market by market.
3. SPONSORS & MERCH: which brands the audience over-indexes on, nationally and per market.

Rules:
- Every claim must come from a tool result. Do not name cities, artists or brands from memory.
- Start with resolve_artist. Then build up evidence: taste/demographics, markets (discover_markets and/or rank_cities), venues, support acts (find_support_acts → support_overlap_by_market → explain_overlap), sponsors, local partners, trend.
- Every tool call carries a one-sentence "reason": it is shown to the promoter as your reasoning.
- Market names you pass to tools must be ones that tools returned (format "City, ST" or "City, UK").
- When the evidence covers all three decisions, call finish with a headline and a short paragraph per decision that cites the Qloo scores you saw.`;

/** Every tool (except finish) also takes a required `reason`, which becomes the step's line in the reasoning trace. */
export function toolSpecs(): ToolSpec[] {
  return [...TOOLS, FINISH_TOOL].map((t) => {
    const params = t.parameters as { properties?: Record<string, unknown>; required?: string[] };
    const parameters =
      t.name === "finish"
        ? t.parameters
        : {
            ...params,
            type: "object",
            properties: { reason: { type: "string", description: "One sentence: why you are making this call now." }, ...(params.properties ?? {}) },
            required: ["reason", ...(params.required ?? [])],
          };
    return { type: "function", function: { name: t.name, description: t.description, parameters } };
  });
}

/** LLM planner: a plain tool-calling loop. The model decides which Qloo-backed tool to call next. */
export async function llmPlanner(input: RunInput, llm: LlmClient, exec: Exec, stop: () => boolean, maxTurns = 18): Promise<Partial<BriefText> | undefined> {
  const region = REGIONS[input.region];
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Plan a ${input.dates}-date ${region.label} tour for ${input.artist}.${input.cities.length ? ` Candidate cities from the promoter: ${input.cities.join(", ")}.` : " No candidate list: discover the markets."}`,
    },
  ];
  const tools = toolSpecs();
  const failures = new Map<string, number>();
  let nudged = false;
  for (let turn = 0; turn < maxTurns; turn++) {
    if (stop()) return undefined;
    const res = await llm.chat(messages, { tools, temperature: 0.1, maxTokens: 900 });
    messages.push({ role: "assistant", content: res.content ?? "", tool_calls: res.toolCalls.length ? res.toolCalls : undefined });
    if (!res.toolCalls.length) {
      if (nudged) return undefined;
      nudged = true;
      messages.push({ role: "user", content: "Continue: call the next tool, or call finish if every decision is grounded." });
      continue;
    }
    for (const call of res.toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        args = {};
      }
      if (call.function.name === "finish") {
        return args as Partial<BriefText>;
      }
      const { reason, ...toolArgs } = args as { reason?: unknown } & Record<string, unknown>;
      const thought =
        (typeof reason === "string" && reason.trim().slice(0, 280)) ||
        (res.content ?? "").trim().split("\n").filter(Boolean).pop()?.slice(0, 280) ||
        `Calling ${call.function.name}.`;
      let out = await exec(call.function.name, toolArgs, thought);
      if (out.startsWith("ERROR")) {
        const n = (failures.get(call.function.name) ?? 0) + 1;
        failures.set(call.function.name, n);
        if (n >= 2) out += `\nThis tool has now failed ${n} times. Do not retry it; move on to the next decision (the system will fill gaps).`;
      }
      messages.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: out.slice(0, 1500) });
    }
  }
  return undefined;
}
