/**
 * Response shapes for the Qloo hackathon API (https://hackathon.api.qloo.com).
 *
 * Written against the published reference (docs.qloo.com: insights-api-deep-dive,
 * heatmaps-use-case, demographics-use-case, taste-analysis, get-search, search-tags,
 * analysis-compare, get-trending) and cross-checked with Qloo's own client in
 * @qloo/qloo-harness 0.1.26. Schemas are deliberately tolerant (passthrough, optional
 * fields): Qloo returns many verbose fields we do not use, and the smoke test
 * (scripts/qloo-smoke.ts) reports any field we rely on that comes back missing.
 */
import { z } from "zod";

export const QLOO_HACKATHON_BASE_URL = "https://hackathon.api.qloo.com";

/** Every endpoint the app calls. Legacy /recommendations and /recs are deliberately absent. */
export const QLOO_ENDPOINTS = [
  "/search",
  "/entities",
  "/v2/tags",
  "/v2/audiences",
  "/v2/insights",
  "/v2/analysis/compare",
  "/v2/trending",
] as const;
export type QlooEndpoint = (typeof QLOO_ENDPOINTS)[number];

export type ParamValue = string | number | boolean | Array<string | number>;
export type QlooParams = Record<string, ParamValue | undefined>;

const geo = z
  .object({ lat: z.number().optional(), lon: z.number().optional(), lng: z.number().optional() })
  .passthrough();

export const tagRef = z
  .object({
    id: z.string().optional(),
    tag_id: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    subtype: z.string().optional(),
    value: z.string().optional(),
  })
  .passthrough();

export const entitySchema = z
  .object({
    name: z.string(),
    entity_id: z.string().optional(),
    id: z.string().optional(),
    type: z.string().optional(),
    subtype: z.string().optional(),
    types: z.array(z.string()).optional(),
    popularity: z.number().optional(),
    disambiguation: z.string().optional(),
    location: geo.optional(),
    properties: z
      .object({
        description: z.string().optional(),
        short_description: z.string().optional(),
        address: z.string().optional(),
        image: z.object({ url: z.string() }).passthrough().optional(),
        geocode: z
          .object({
            name: z.string().optional(),
            admin1_region: z.string().optional(),
            country_code: z.string().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
    tags: z.array(tagRef).optional(),
    query: z
      .object({
        affinity: z.number().optional(),
        explainability: z.unknown().optional(),
        measurements: z.record(z.unknown()).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
export type QlooEntity = z.infer<typeof entitySchema>;

export const tagSchema = z
  .object({
    id: z.string().optional(),
    tag_id: z.string().optional(),
    name: z.string(),
    type: z.string().optional(),
    subtype: z.string().optional(),
    types: z.array(z.string()).optional(),
    parents: z.array(z.object({ type: z.string().optional() }).passthrough()).optional(),
    popularity: z.number().optional(),
    query: z.object({ affinity: z.number().optional() }).passthrough().optional(),
  })
  .passthrough();
export type QlooTag = z.infer<typeof tagSchema>;

export const heatmapPointSchema = z
  .object({
    location: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
        geohash: z.string().optional(),
      })
      .passthrough(),
    query: z
      .object({ affinity: z.number(), affinity_rank: z.number().optional(), popularity: z.number().optional() })
      .passthrough(),
  })
  .passthrough();
export type HeatmapPoint = z.infer<typeof heatmapPointSchema>;

export const demographicsSchema = z
  .object({
    entity_id: z.string(),
    query: z
      .object({
        age: z.record(z.number()).optional(),
        gender: z.record(z.number()).optional(),
      })
      .passthrough(),
  })
  .passthrough();
export type Demographics = z.infer<typeof demographicsSchema>;

export const audienceSchema = z
  .object({
    id: z.string().optional(),
    entity_id: z.string().optional(),
    name: z.string(),
    type: z.string().optional(),
    parents: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const trendingPointSchema = z
  .object({
    date: z.string(),
    population_percentile: z.number().optional(),
    population_rank: z.number().optional(),
    population_rank_velocity: z.number().optional(),
    velocity_fold_change: z.number().optional(),
    population_percent_delta: z.number().optional(),
  })
  .passthrough();
export type TrendingPoint = z.infer<typeof trendingPointSchema>;

const envelope = <T extends z.ZodTypeAny>(results: T) =>
  z.object({ success: z.boolean().optional(), duration: z.number().optional(), results }).passthrough();

/** GET /search: `results` is a flat array (see get-search reference). */
export const searchResponse = envelope(z.array(entitySchema));
/** GET /entities */
export const entitiesResponse = envelope(z.union([z.array(entitySchema), z.object({ entities: z.array(entitySchema) }).passthrough()]));
/** GET /v2/tags */
export const tagsResponse = envelope(z.object({ tags: z.array(tagSchema) }).passthrough());
/** GET /v2/audiences */
export const audiencesResponse = envelope(
  z.union([z.object({ audiences: z.array(audienceSchema) }).passthrough(), z.object({ entities: z.array(audienceSchema) }).passthrough()]),
);
/** GET /v2/insights with filter.type=urn:entity:* */
export const insightsEntitiesResponse = envelope(z.object({ entities: z.array(entitySchema) }).passthrough());
/** GET /v2/insights with filter.type=urn:heatmap */
export const insightsHeatmapResponse = envelope(z.object({ heatmap: z.array(heatmapPointSchema) }).passthrough());
/** GET /v2/insights with filter.type=urn:tag (taste analysis) */
export const insightsTagsResponse = envelope(z.object({ tags: z.array(tagSchema) }).passthrough());
/** GET /v2/insights with filter.type=urn:demographics */
export const insightsDemographicsResponse = envelope(z.object({ demographics: z.array(demographicsSchema) }).passthrough());
/** GET /v2/analysis/compare: shape is loosely documented; we read tags from `results.tags` or `results`. */
export const compareResponse = envelope(
  z.union([z.object({ tags: z.array(tagSchema) }).passthrough(), z.array(tagSchema), z.object({ entities: z.array(tagSchema) }).passthrough()]),
);
/** GET /v2/trending */
export const trendingResponse = envelope(z.object({ trending: z.array(trendingPointSchema) }).passthrough());

export function entityId(e: { entity_id?: string; id?: string }): string {
  return e.entity_id ?? e.id ?? "";
}
export function tagId(t: { id?: string; tag_id?: string }): string {
  return t.id ?? t.tag_id ?? "";
}
