/**
 * "Without Qloo": the same question answered by the plain LLM, no tools, no taste data.
 * In fixture mode (no LLM configured) a recorded baseline is served from fixtures/baseline/.
 */
import { promises as fs, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { REGIONS, type RegionId } from "../geo";
import { extractJson, type LlmClient } from "../llm";

export interface Baseline {
  source: "llm" | "recorded-llm" | "unavailable";
  model?: string;
  cities: string[];
  supportActs: string[];
  sponsors: string[];
  reasoning: string;
  note?: string;
  /** When a recorded answer was made (recorded-llm only). */
  recordedAt?: string;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-");
}

export function baselinePrompt(artist: string, regionId: RegionId, dates: number, cities: string[]): string {
  const region = REGIONS[regionId];
  return [
    `You are an experienced live-music promoter. Plan a ${dates}-date ${region.label} headline tour for ${artist}.`,
    cities.length ? `The promoter is considering these cities: ${cities.join(", ")}.` : "",
    "Decide: which cities to play (in order of priority), which opening act to bring, and which brands to pitch as tour sponsors or merch partners.",
    'Answer ONLY with JSON: {"cities": ["City, ST", ...], "support_acts": ["..."], "sponsors": ["..."], "reasoning": "two sentences"}',
  ]
    .filter(Boolean)
    .join("\n");
}

const asList = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : []);

export function parseBaseline(text: string | null, model: string): Baseline | undefined {
  const j = extractJson<Record<string, unknown>>(text);
  if (!j) return undefined;
  const cities = asList(j.cities);
  if (!cities.length) return undefined;
  return {
    source: "llm",
    model,
    cities,
    supportActs: asList(j.support_acts ?? j.supportActs),
    sponsors: asList(j.sponsors),
    reasoning: String(j.reasoning ?? ""),
  };
}

export async function liveBaseline(llm: LlmClient, artist: string, regionId: RegionId, dates: number, cities: string[]): Promise<Baseline> {
  const res = await llm.chat([{ role: "user", content: baselinePrompt(artist, regionId, dates, cities) }], { temperature: 0.3, maxTokens: 600 });
  const parsed = parseBaseline(res.content, llm.model);
  if (!parsed) throw new Error("The plain LLM did not return a usable plan.");
  return parsed;
}

/** Names of the artists with a recorded baseline, for the UI ("pre-recorded for: …"). */
export function recordedArtists(root = process.cwd()): string[] {
  try {
    const dir = path.join(root, "fixtures", "baseline");
    return readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => (JSON.parse(readFileSync(path.join(dir, f), "utf8")) as { artist?: string }).artist)
      .filter((a): a is string => !!a)
      .sort();
  } catch {
    return [];
  }
}

export async function recordedBaseline(artist: string, root = process.cwd()): Promise<Baseline | undefined> {
  try {
    const raw = JSON.parse(await fs.readFile(path.join(root, "fixtures", "baseline", `${slugify(artist)}.json`), "utf8"));
    return { ...raw, source: "recorded-llm" } as Baseline;
  } catch {
    return undefined;
  }
}
