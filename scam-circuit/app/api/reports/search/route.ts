import { db } from "@/lib/db";
import { parseReportSearch, SearchValidationError } from "@/lib/report-search-params";
import { RecipientLookupValidationError } from "@/lib/find-reported-recipients";
import { searchReports } from "@/lib/search-reports";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    const search = parseReportSearch(new URL(request.url).searchParams);
    return Response.json(await searchReports(db, search), { headers });
  } catch (error) {
    if (error instanceof SearchValidationError || error instanceof RecipientLookupValidationError) {
      return Response.json({ error: error.message }, { status: 400, headers });
    }
    console.error("Report search failed", { code: (error as { code?: string }).code || "UNKNOWN" });
    return Response.json({ error: "Reports could not be searched. Please try again." }, { status: 500, headers });
  }
}
