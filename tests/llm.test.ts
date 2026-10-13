import { describe, expect, it, vi } from "vitest";
import { OpenAICompatibleClient, extractJson, llmFromEnv } from "@/lib/llm";
import { baselinePrompt, parseBaseline, slugify } from "@/lib/agent/baseline";

describe("LLM client", () => {
  it("is off unless base URL and model are both set", () => {
    expect(llmFromEnv({} as NodeJS.ProcessEnv)).toBeUndefined();
    expect(llmFromEnv({ LLM_BASE_URL: "http://x/v1", LLM_MODEL: "m" } as unknown as NodeJS.ProcessEnv)?.model).toBe("m");
  });
  it("posts an OpenAI-style request with tools and parses tool calls", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "Resolving first.", tool_calls: [{ id: "1", type: "function", function: { name: "resolve_artist", arguments: '{"name":"X"}' } }] } }] })),
    );
    const c = new OpenAICompatibleClient("http://llm/v1/", "m", "key", fetchImpl as unknown as typeof fetch);
    const r = await c.chat([{ role: "user", content: "hi" }], { tools: [{ type: "function", function: { name: "resolve_artist", description: "d", parameters: {} } }] });
    expect(r.toolCalls[0].function.name).toBe("resolve_artist");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://llm/v1/chat/completions");
    const body = JSON.parse(String(init.body));
    expect(body.tool_choice).toBe("auto");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer key");
  });
  it("extracts JSON from fenced or chatty replies", () => {
    expect(extractJson('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('text {"b":[1,2]} trailing')).toEqual({ b: [1, 2] });
    expect(extractJson("no json")).toBeUndefined();
  });
});

describe("baseline (without Qloo)", () => {
  it("asks the same three decisions", () => {
    const p = baselinePrompt("Noah Kahan", "north-america", 8, []);
    expect(p).toMatch(/8-date US & Canada/);
    expect(p).toMatch(/opening act/);
    expect(p).toMatch(/sponsors/);
  });
  it("parses the plain LLM's plan", () => {
    const b = parseBaseline('{"cities":["New York, NY"],"support_acts":["A"],"sponsors":["B"],"reasoning":"r"}', "m");
    expect(b?.cities).toEqual(["New York, NY"]);
    expect(parseBaseline('{"cities":[]}', "m")).toBeUndefined();
  });
  it("slugifies artist names for fixture files", () => {
    expect(slugify("Fontaines D.C.")).toBe("fontaines-dc");
    expect(slugify("Noah Kahan")).toBe("noah-kahan");
  });
});
