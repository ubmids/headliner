import { describe, expect, it, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { QlooClient, QlooError, countResults, type QlooCallRecord } from "@/lib/qloo/client";
import { JsonCache } from "@/lib/qloo/cache";
import { FixtureStore } from "@/lib/qloo/fixtures";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const noSleep = async () => {};

describe("QlooClient (live mode)", () => {
  it("sends GET with the X-Api-Key header to hackathon.api.qloo.com", async () => {
    const fetchImpl = vi.fn(async () => json({ success: true, results: [{ name: "Noah Kahan", entity_id: "ID1", popularity: 0.9 }] }));
    const c = new QlooClient({ apiKey: "k", fetchImpl: fetchImpl as unknown as typeof fetch });
    const res = await c.search("Noah Kahan", "urn:entity:artist", 3);
    expect(res.results[0].name).toBe("Noah Kahan");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://hackathon.api.qloo.com/search?query=Noah+Kahan&take=3&types=urn%3Aentity%3Aartist");
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>)["X-Api-Key"]).toBe("k");
    expect(init.body).toBeUndefined();
  });

  it("refuses any base URL other than the hackathon host", () => {
    expect(() => new QlooClient({ apiKey: "k", baseUrl: "https://api.qloo.com" })).toThrow(QlooError);
    expect(() => new QlooClient({ apiKey: "k", baseUrl: "https://staging.api.qloo.com" })).toThrow(/hackathon/);
  });

  it("retries 429 and 5xx, then succeeds", async () => {
    const responses = [json({ error: "slow down" }, 429), json({ error: "oops" }, 502), json({ results: { entities: [{ name: "A" }] } })];
    const fetchImpl = vi.fn(async () => responses.shift()!);
    const c = new QlooClient({ apiKey: "k", fetchImpl: fetchImpl as unknown as typeof fetch, sleep: noSleep });
    const res = await c.insightsEntities({ "filter.type": "urn:entity:artist", "signal.interests.entities": "X" });
    expect(res.results.entities).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("does not retry 401 and explains the likely cause", async () => {
    const fetchImpl = vi.fn(async () => json({ error: "No API key found in request" }, 401));
    const c = new QlooClient({ apiKey: "k", fetchImpl: fetchImpl as unknown as typeof fetch, sleep: noSleep });
    await expect(c.tags("music venue")).rejects.toThrow(/hackathon\.api\.qloo\.com/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("flags empty results (Qloo silently ignores invalid params) and records calls without the key", async () => {
    const records: QlooCallRecord[] = [];
    const fetchImpl = vi.fn(async () => json({ success: true, results: { entities: [] } }));
    const c = new QlooClient({ apiKey: "secret-key", fetchImpl: fetchImpl as unknown as typeof fetch, onCall: (r) => records.push(r) });
    await c.insightsEntities({ "filter.type": "urn:entity:brand", "filter.bogus": "x" });
    expect(records[0].status).toBe("empty");
    expect(records[0].resultCount).toBe(0);
    expect(JSON.stringify(records)).not.toContain("secret-key");
  });

  it("serves repeat requests from the cache and does not cache empty answers", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hl-cache-"));
    const fetchImpl = vi.fn(async () => json({ results: { tags: [{ name: "Music Venue", id: "urn:tag:x" }] } }));
    const c = new QlooClient({ apiKey: "k", fetchImpl: fetchImpl as unknown as typeof fetch, cache: new JsonCache(dir) });
    await c.tags("music venue");
    await c.tags("music venue");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(c.calls.map((r) => r.source)).toEqual(["live", "cache"]);
    // a fresh cache object reads the same answer back from disk
    const c2 = new QlooClient({ apiKey: "k", fetchImpl: fetchImpl as unknown as typeof fetch, cache: new JsonCache(dir) });
    await c2.tags("music venue");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects responses that do not match the documented shape", async () => {
    const fetchImpl = vi.fn(async () => json({ results: { nope: true } }));
    const c = new QlooClient({ apiKey: "k", fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(c.heatmap({ "signal.interests.entities": "X", "filter.location.query": "NYC" })).rejects.toThrow(/heatmap|shape/);
  });

  it("countResults understands every envelope the app uses", () => {
    expect(countResults({ results: [1, 2] })).toBe(2);
    expect(countResults({ results: { heatmap: [1] } })).toBe(1);
    expect(countResults({ results: { demographics: [1, 2, 3] } })).toBe(3);
    expect(countResults({ results: { trending: [] } })).toBe(0);
    expect(countResults(null)).toBe(0);
  });
});

describe("QlooClient (fixture mode)", () => {
  it("is in fixture mode without a key and answers from fixtures", async () => {
    const c = new QlooClient({});
    expect(c.mode).toBe("fixture");
    const res = await c.search("Noah Kahan", "urn:entity:artist", 5);
    expect(res.results[0].name).toBe("Noah Kahan");
    expect(c.calls[0].source).toBe("fixture");
  });
  it("fails clearly when no fixture exists", async () => {
    const c = new QlooClient({});
    await expect(c.search("Some Unknown Band", "urn:entity:artist", 5)).rejects.toThrow(/QLOO_API_KEY/);
    expect(c.calls[0].status).toBe("error");
  });
  it("prefers re-recorded live fixtures over illustrative ones", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "hl-fx-"));
    const mk = async (dir: string, name: string, source: string) => {
      await fs.mkdir(path.join(root, dir), { recursive: true });
      await fs.writeFile(
        path.join(root, dir, "a.json"),
        JSON.stringify({ fixture: true, source, entries: [{ request: { path: "/search", params: { query: "X", take: 1 } }, response: { results: [{ name }] } }] }),
      );
    };
    await mk("qloo", "illustrative", "illustrative");
    await mk("live", "real", "recorded");
    const store = new FixtureStore([path.join(root, "live"), path.join(root, "qloo")]);
    const hit = await store.lookup("/search", { take: 1, query: "X" });
    expect(hit?.source).toBe("recorded");
    expect((hit?.response as { results: Array<{ name: string }> }).results[0].name).toBe("real");
  });
  it("matches trending fixtures regardless of the date window", async () => {
    const store = FixtureStore.default();
    const c = new QlooClient({ fixtures: store });
    const s = await c.search("Noah Kahan", "urn:entity:artist", 5);
    const id = s.results[0].entity_id!;
    const t = await c.trending({ "filter.type": "urn:entity:artist", "signal.interests.entities": id, "filter.start_date": "2001-01-01", "filter.end_date": "2001-06-01" });
    expect(t.results.trending.length).toBeGreaterThan(3);
  });
});
