import { db } from "@/lib/db";
import { validReportId } from "@/lib/report-details";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const { id, attachmentId } = await params;
  if (!validReportId(id) || !validReportId(attachmentId)) return new Response("File not found", { status: 404, headers });
  try {
    const result = await db.query<{ file_data: Buffer; file_name: string }>(
      `SELECT a.file_data, a.file_name FROM attachments a
       JOIN data d ON d.id = a.report_id
       WHERE a.id = $1 AND a.report_id = $2 AND d.is_fraud = 1`, [attachmentId, id],
    );
    const file = result.rows[0];
    if (!file) return new Response("File not found", { status: 404, headers });
    // Submitted files are untrusted. Download them instead of executing HTML/SVG
    // or other active content in the application's origin.
    const filename = (file.file_name || "evidence").replace(/[\x00-\x1f\x7f/\\]/g, "_");
    const encoded = encodeURIComponent(filename).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
    return new Response(new Uint8Array(file.file_data), { headers: {
      ...headers, "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="evidence"; filename*=UTF-8''${encoded}`,
      "Content-Security-Policy": "sandbox; default-src 'none'",
    } });
  } catch (error) {
    console.error("Evidence download failed", { code: (error as { code?: string }).code || "UNKNOWN" });
    return new Response("This file could not be downloaded. Please try again.", { status: 500, headers });
  }
}
