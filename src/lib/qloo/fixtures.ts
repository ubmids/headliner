import { promises as fs } from "node:fs";
import path from "node:path";
import { requestKey } from "./request";
import type { QlooParams } from "./types";

/**
 * FIXTURE MODE.
 *
 * Until QLOO_API_KEY exists, Headliner answers Qloo requests from recorded fixtures.
 * Two sources, in priority order:
 *   1. fixtures/live/   real responses re-recorded by scripts/qloo-smoke.sh (gitignored:
 *                       Qloo's terms forbid publishing response data in a public repo)
 *   2. fixtures/qloo/   ILLUSTRATIVE fixtures committed to the repo. They follow the
 *                       documented response schemas exactly, but the names and scores in
 *                       them are placeholders written for the demo, NOT Qloo data.
 * The UI shows a "fixture data" banner whenever any response came from here.
 */
export interface FixtureEntry {
  request: { path: string; params: QlooParams };
  response: unknown;
}

/** One file per scenario (e.g. one sample artist), holding every request/response pair it needs. */
export interface FixtureFile {
  fixture: true;
  source: "illustrative" | "recorded";
  note?: string;
  entries: FixtureEntry[];
}

/** Trending windows move with the calendar; fixtures match on everything else. */
const VOLATILE: Record<string, string[]> = { "/v2/trending": ["filter.start_date", "filter.end_date"] };

export function fixtureKey(pathname: string, params: QlooParams): string {
  const drop = VOLATILE[pathname] ?? [];
  const kept = Object.fromEntries(Object.entries(params).filter(([k]) => !drop.includes(k)));
  return requestKey(pathname, kept);
}

export interface FixtureHit {
  response: unknown;
  source: FixtureFile["source"];
  file: string;
}

export class FixtureStore {
  private map: Map<string, FixtureHit> | null = null;

  constructor(private dirs: string[]) {}

  static default(root = process.cwd()): FixtureStore {
    return new FixtureStore([path.join(root, "fixtures", "live"), path.join(root, "fixtures", "qloo")]);
  }

  private async load(): Promise<Map<string, FixtureHit>> {
    if (this.map) return this.map;
    const map = new Map<string, FixtureHit>();
    // Lowest priority first so higher-priority dirs overwrite.
    for (const dir of [...this.dirs].reverse()) {
      let names: string[] = [];
      try {
        names = (await fs.readdir(dir)).filter((n) => n.endsWith(".json"));
      } catch {
        continue;
      }
      for (const name of names) {
        const file = path.join(dir, name);
        try {
          const f = JSON.parse(await fs.readFile(file, "utf8")) as FixtureFile;
          for (const e of f.entries ?? []) {
            if (!e.request?.path) continue;
            map.set(fixtureKey(e.request.path, e.request.params ?? {}), {
              response: e.response,
              source: f.source ?? "illustrative",
              file: path.relative(process.cwd(), file),
            });
          }
        } catch {
          // A malformed fixture is skipped; the smoke test reports it.
        }
      }
    }
    this.map = map;
    return map;
  }

  async lookup(pathname: string, params: QlooParams): Promise<FixtureHit | undefined> {
    return (await this.load()).get(fixtureKey(pathname, params));
  }

  async size(): Promise<number> {
    return (await this.load()).size;
  }
}
