import { db } from "@/lib/db";
import { getScamRadar, parseRadarRange } from "@/lib/scam-radar";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  let range;
  try { range = parseRadarRange(new URL(request.url).searchParams.get("days")); }
  catch (error) { return Response.json({ error: (error as Error).message }, { status: 400, headers }); }
  try {
    // Calendar dates use the site's US Eastern day, independent of host timezone.
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    return Response.json(await getScamRadar(db, range, today), { headers });
  } catch (error) {
    console.error("Scam Radar failed", { code: (error as { code?: string }).code || "UNKNOWN" });
    return Response.json({ error: "Scam Radar could not load your reports. Please try again." }, { status: 503, headers });
  }
}
