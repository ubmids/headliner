import { z } from "zod";
import { JsonCache } from "./cache";
import { FixtureStore } from "./fixtures";
import { buildUrl, normaliseParams, requestKey } from "./request";
import {
  QLOO_HACKATHON_BASE_URL,
  type QlooEndpoint,
  type QlooParams,
  audiencesResponse,
  compareResponse,
  entitiesResponse,
  insightsDemographicsResponse,
  insightsEntitiesResponse,
  insightsHeatmapResponse,
  insightsTagsResponse,
  searchResponse,
  tagsResponse,
  trendingResponse,
} from "./types";

export type CallSource = "live" | "cache" | "fixture" | "fixture-recorded";

/** One Qloo HTTP request, as shown in the reasoning-trace panel. The API key is never included. */
export interface QlooCallRecord {
  id: number;
  endpoint: QlooEndpoint;
  params: Array<[string, string]>;
  url: string;
  source: CallSource;
  status: "ok" | "empty" | "error";
  httpStatus?: number;
  durationMs: number;
  resultCount: number;
  error?: string;
}

export class QlooError extends Error {
  constructor(
    message: string,
    public readonly httpStatus?: number,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "QlooError";
  }
}

export interface QlooClientOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  cache?: JsonCache;
  fixtures?: FixtureStore;
  onCall?: (record: QlooCallRecord) => void;
  maxConcurrency?: number;
  timeoutMs?: number;
  maxAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
}

/** Count the result rows in any Qloo envelope so empty results can be flagged (invalid params are silently ignored by Qloo). */
export function countResults(body: unknown): number {
  const results = (body as { results?: unknown } | null)?.results;
  if (Array.isArray(results)) return results.length;
  if (results && typeof results === "object") {
    for (const key of ["entities", "heatmap", "tags", "demographics", "trending", "audiences"]) {
      const v = (results as Record<string, unknown>)[key];
      if (Array.isArray(v)) return v.length;
    }
  }
  return 0;
}

class Semaphore {
  private queue: Array<() => void> = [];
  private active = 0;
  constructor(private limit: number) {}
  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) await new Promise<void>((r) => this.queue.push(r));
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      this.queue.shift()?.();
    }
  }
}

export class QlooClient {
  readonly mode: "live" | "fixture";
  readonly baseUrl: string;
  private apiKey?: string;
  private fetchImpl: typeof fetch;
  private cache?: JsonCache;
  private fixtures: FixtureStore;
  private onCall?: (r: QlooCallRecord) => void;
  private sem: Semaphore;
  private timeoutMs: number;
  private maxAttempts: number;
  private sleep: (ms: number) => Promise<void>;
  private seq = 0;
  readonly calls: QlooCallRecord[] = [];

  constructor(opts: QlooClientOptions = {}) {
    this.apiKey = opts.apiKey?.trim() || undefined;
    this.mode = this.apiKey ? "live" : "fixture";
    this.baseUrl = (opts.baseUrl?.trim() || QLOO_HACKATHON_BASE_URL).replace(/\/+$/, "");
    const host = new URL(this.baseUrl).host;
    if (host !== "hackathon.api.qloo.com") {
      // Hackathon keys only work against hackathon.api.qloo.com (dev guide: "Wrong Base URL").
      throw new QlooError(`Refusing Qloo base URL ${this.baseUrl}: hackathon keys only work on ${QLOO_HACKATHON_BASE_URL}`);
    }
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.cache = opts.cache;
    this.fixtures = opts.fixtures ?? FixtureStore.default();
    this.onCall = opts.onCall;
    this.sem = new Semaphore(opts.maxConcurrency ?? 4);
    this.timeoutMs = opts.timeoutMs ?? 15000;
    this.maxAttempts = opts.maxAttempts ?? 3;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  /** Low-level GET. Parameters go in the query string; /v2/insights is GET-only (dev guide: "Wrong HTTP Method"). */
  async get(endpoint: QlooEndpoint, params: QlooParams): Promise<unknown> {
    const key = requestKey(endpoint, params);
    const started = Date.now();
    const record: QlooCallRecord = {
      id: ++this.seq,
      endpoint,
      params: normaliseParams(params),
      url: buildUrl(this.baseUrl, endpoint, params),
      source: "live",
      status: "ok",
      durationMs: 0,
      resultCount: 0,
    };
    const finish = (body: unknown, source: CallSource) => {
      record.source = source;
      record.durationMs = Date.now() - started;
      record.resultCount = countResults(body);
      record.status = record.resultCount > 0 ? "ok" : "empty";
      this.emit(record);
      return body;
    };

    try {
      if (this.mode === "fixture") {
        const hit = await this.fixtures.lookup(endpoint, params);
        if (!hit) throw new QlooError(`No fixture recorded for ${key}. Set QLOO_API_KEY for live data.`, 404);
        return finish(hit.response, hit.source === "recorded" ? "fixture-recorded" : "fixture");
      }
      const cached = this.cache ? await this.cache.get<unknown>(key) : undefined;
      if (cached !== undefined) return finish(cached, "cache");
      const body = await this.sem.run(() => this.fetchWithRetry(record.url));
      // Only cache non-empty answers: an empty result is usually a bad parameter worth retrying after a fix.
      if (this.cache && countResults(body) > 0) await this.cache.set(key, body);
      return finish(body, "live");
    } catch (err) {
      record.status = "error";
      record.durationMs = Date.now() - started;
      record.error = err instanceof Error ? err.message : String(err);
      record.httpStatus = err instanceof QlooError ? err.httpStatus : undefined;
      if (this.mode === "fixture") record.source = "fixture";
      this.emit(record);
      throw err;
    }
  }

  private emit(record: QlooCallRecord) {
    this.calls.push({ ...record });
    this.onCall?.({ ...record });
  }

  private async fetchWithRetry(url: string): Promise<unknown> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
      try {
        const res = await this.fetchImpl(url, {
          method: "GET",
          headers: { "X-Api-Key": this.apiKey!, Accept: "application/json" },
          signal: ctrl.signal,
        });
        const text = await res.text();
        if (!res.ok) {
          const retryable = res.status === 429 || res.status >= 500;
          const hint =
            res.status === 401
              ? " (check QLOO_API_KEY and that the base URL is hackathon.api.qloo.com)"
              : res.status === 403
                ? " (entity type not enabled for this key)"
                : "";
          throw new QlooError(`Qloo ${res.status}: ${text.slice(0, 200)}${hint}`, res.status, retryable);
        }
        return JSON.parse(text);
      } catch (err) {
        lastErr = err;
        const retryable = err instanceof QlooError ? err.retryable : true; // network errors / timeouts
        if (!retryable || attempt === this.maxAttempts) break;
        await this.sleep(300 * 2 ** (attempt - 1));
      } finally {
        clearTimeout(timer);
      }
    }
    if (lastErr instanceof QlooError) throw lastErr;
    throw new QlooError(`Unable to reach Qloo: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`, undefined, true);
  }

  private async typed<T extends z.ZodTypeAny>(endpoint: QlooEndpoint, params: QlooParams, schema: T): Promise<z.infer<T>> {
    const body = await this.get(endpoint, params);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new QlooError(`Unexpected ${endpoint} response shape: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`);
    }
    return parsed.data;
  }

  // ---- Lookup APIs -------------------------------------------------------

  /** GET /search: resolve a name to Qloo entity IDs. */
  search(query: string, types?: string, take = 5) {
    return this.typed("/search", { query, types, take }, searchResponse);
  }

  /** GET /entities: hydrate entities by ID. */
  entities(ids: string[]) {
    return this.typed("/entities", { entity_ids: ids }, entitiesResponse);
  }

  /** GET /v2/tags: find valid tag IDs for a concept (e.g. "music venue"). */
  tags(query: string, take = 10, extra: QlooParams = {}) {
    return this.typed("/v2/tags", { "filter.query": query, take, ...extra }, tagsResponse);
  }

  /** GET /v2/audiences: find audience IDs usable in signal.demographics.audiences. */
  audiences(query: string, take = 10) {
    return this.typed("/v2/audiences", { "filter.query": query, take }, audiencesResponse);
  }

  // ---- Insights ----------------------------------------------------------

  /** GET /v2/insights for an entity type (artist, brand, place, destination...). */
  insightsEntities(params: QlooParams) {
    return this.typed("/v2/insights", params, insightsEntitiesResponse);
  }

  /** GET /v2/insights?filter.type=urn:heatmap */
  heatmap(params: QlooParams) {
    return this.typed("/v2/insights", { "filter.type": "urn:heatmap", ...params }, insightsHeatmapResponse);
  }

  /** GET /v2/insights?filter.type=urn:tag (taste analysis) */
  tasteTags(params: QlooParams) {
    return this.typed("/v2/insights", { "filter.type": "urn:tag", ...params }, insightsTagsResponse);
  }

  /** GET /v2/insights?filter.type=urn:demographics */
  demographics(params: QlooParams) {
    return this.typed("/v2/insights", { "filter.type": "urn:demographics", ...params }, insightsDemographicsResponse);
  }

  // ---- Analysis & trends -------------------------------------------------

  /** GET /v2/analysis/compare: what two audiences share and where they differ. */
  compare(a: string[], b: string[], extra: QlooParams = {}) {
    return this.typed(
      "/v2/analysis/compare",
      { "a.signal.interests.entities": a, "b.signal.interests.entities": b, ...extra },
      compareResponse,
    );
  }

  /** GET /v2/trending: popularity time series for an entity. */
  trending(params: QlooParams) {
    return this.typed("/v2/trending", params, trendingResponse);
  }
}
