import { describe, expect, it } from "vitest";
import { buildUrl, normaliseParams, requestKey, serialiseParam } from "@/lib/qloo/request";

describe("request helpers", () => {
  it("joins arrays with commas, as the Qloo GET API expects", () => {
    expect(serialiseParam(["a", "b"])).toBe("a,b");
    expect(serialiseParam(5)).toBe("5");
    expect(serialiseParam(true)).toBe("true");
  });
  it("drops undefined, empty strings and empty arrays, and sorts keys", () => {
    expect(normaliseParams({ b: 1, a: "x", c: undefined, d: [], e: "" })).toEqual([
      ["a", "x"],
      ["b", "1"],
    ]);
  });
  it("gives the same key regardless of parameter order", () => {
    expect(requestKey("/v2/insights", { take: 3, "filter.type": "urn:entity:artist" })).toBe(requestKey("/v2/insights", { "filter.type": "urn:entity:artist", take: 3 }));
  });
  it("builds hackathon URLs with encoded params", () => {
    const u = new URL(buildUrl("https://hackathon.api.qloo.com", "/v2/insights", { "filter.type": "urn:heatmap", "filter.location": "POLYGON((1 2, 3 4))" }));
    expect(u.host).toBe("hackathon.api.qloo.com");
    expect(u.pathname).toBe("/v2/insights");
    expect(u.searchParams.get("filter.location")).toBe("POLYGON((1 2, 3 4))");
  });
});
