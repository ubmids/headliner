/**
 * Minimal OpenAI-compatible chat-completions client with tool calling.
 * Configured by env: LLM_BASE_URL, LLM_API_KEY, LLM_MODEL. Works with OpenAI, Anthropic's
 * OpenAI-compatible endpoint, Groq, Together, OpenRouter, Ollama and llama.cpp's llama-server.
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ToolSpec {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface ChatResult {
  content: string | null;
  toolCalls: ToolCall[];
}

export interface LlmClient {
  model: string;
  chat(messages: ChatMessage[], opts?: { tools?: ToolSpec[]; temperature?: number; json?: boolean; maxTokens?: number }): Promise<ChatResult>;
}

export function llmFromEnv(env: NodeJS.ProcessEnv = process.env, fetchImpl: typeof fetch = fetch): LlmClient | undefined {
  const base = env.LLM_BASE_URL?.trim();
  const model = env.LLM_MODEL?.trim();
  if (!base || !model) return undefined;
  return new OpenAICompatibleClient(base, model, env.LLM_API_KEY?.trim(), fetchImpl);
}

export class OpenAICompatibleClient implements LlmClient {
  constructor(
    private baseUrl: string,
    public model: string,
    private apiKey?: string,
    private fetchImpl: typeof fetch = fetch,
    private timeoutMs = 90000,
  ) {}

  async chat(messages: ChatMessage[], opts: { tools?: ToolSpec[]; temperature?: number; json?: boolean; maxTokens?: number } = {}): Promise<ChatResult> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 1200,
    };
    if (opts.tools?.length) {
      body.tools = opts.tools;
      body.tool_choice = "auto";
    }
    if (opts.json) body.response_format = { type: "json_object" };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(`${this.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}) },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`LLM ${res.status}: ${text.slice(0, 300)}`);
      const json = JSON.parse(text) as { choices?: Array<{ message?: { content?: string | null; tool_calls?: ToolCall[] } }> };
      const msg = json.choices?.[0]?.message ?? {};
      return { content: msg.content ?? null, toolCalls: (msg.tool_calls ?? []).filter((t) => t?.function?.name) };
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Pull the first JSON object out of a model reply (handles ```json fences and chatter). */
export function extractJson<T = unknown>(text: string | null | undefined): T | undefined {
  if (!text) return undefined;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return undefined;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return undefined;
  }
}
