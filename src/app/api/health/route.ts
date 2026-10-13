import { serverMode } from "@/lib/server";

export const dynamic = "force-dynamic";

/** Health check for the host (and a quick way to see which mode production is in). */
export function GET() {
  return Response.json({ ok: true, ...serverMode() });
}
