import { startRun } from "@/lib/server";
import type { AgentEvent } from "@/lib/agent/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** POST /api/run → NDJSON stream of agent events (run, step, qloo, step_done, baseline, done | error). */
export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: AgentEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
        } catch {
          // client went away; keep running so the result still gets cached
        }
      };
      try {
        await startRun(
          {
            artist: String(body.artist ?? ""),
            region: body.region as never,
            cities: Array.isArray(body.cities) ? (body.cities as string[]) : String(body.cities ?? "").split(/[;\n]|,(?=\s*[A-Z][a-z])/).map((s) => s.trim()).filter(Boolean),
            dates: Number(body.dates ?? 8),
          },
          send,
          { fresh: body.fresh === true },
        );
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
