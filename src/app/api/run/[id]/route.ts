import { getRun } from "@/lib/server";
import { briefCsv } from "@/lib/agent/brief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/run/:id → stored result as JSON, or ?format=csv for the tour brief CSV. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getRun(id);
  if (!result) return Response.json({ error: "Run not found (it may have expired from the cache)." }, { status: 404 });
  if (new URL(req.url).searchParams.get("format") === "csv") {
    const name = (result.plan.artist?.name ?? "tour").replace(/[^\w]+/g, "-").toLowerCase();
    return new Response(briefCsv(result.plan), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="headliner-${name}-brief.csv"` },
    });
  }
  return Response.json(result);
}
