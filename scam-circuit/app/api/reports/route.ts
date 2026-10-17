import { db } from "@/lib/db";
import { MAX_REQUEST_BYTES, validateEvidence, validateReport } from "@/lib/report-validation";
import { saveReport } from "@/lib/save-report";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.startsWith("multipart/form-data")) {
    return Response.json({ error: "Send the report as multipart form data." }, { status: 415 });
  }
  if (Number(request.headers.get("content-length")) > MAX_REQUEST_BYTES) {
    return Response.json({ error: "The upload is too large. Attachments must total 20 MB or less." }, { status: 413 });
  }

  let form: FormData;
  try {
    // Count actual bytes as well: Content-Length may be absent or incorrect.
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: "The request body is missing." }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_REQUEST_BYTES) {
          await reader.cancel();
          return Response.json({ error: "The upload is too large. Attachments must total 20 MB or less." }, { status: 413 });
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    form = await new Response(Buffer.concat(chunks), { headers: { "content-type": contentType } }).formData();
  } catch {
    return Response.json({ error: "The uploaded form could not be read." }, { status: 400 });
  }

  let input: unknown;
  try {
    const values = form.getAll("report");
    if (values.length !== 1 || typeof values[0] !== "string") throw new Error("Invalid report");
    input = JSON.parse(values[0]);
  } catch {
    return Response.json({ error: "Provide one valid report JSON field." }, { status: 400 });
  }
  const result = validateReport(input);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  const attachments = form.getAll("files");
  if (attachments.some((file) => !(file instanceof File))) {
    return Response.json({ error: "Attachments must be files." }, { status: 400 });
  }
  const files = attachments as File[];
  const fileError = validateEvidence(files);
  if (fileError) return Response.json({ error: fileError }, { status: 400 });

  try {
    const reportId = await saveReport(db, result.report, files);
    return Response.json({ reportId }, { status: 201 });
  } catch (error) {
    const databaseError = error as {
      code?: string;
      message?: string;
      schema?: string;
      table?: string;
      column?: string;
    };
    // Schema errors identify missing tables/columns without logging report values.
    // Other database messages can contain user input, so keep those out of logs.
    const schemaError = ["42P01", "42703", "428C9"].includes(databaseError.code || "");
    console.error("Report submission failed", {
      code: databaseError.code || "UNKNOWN",
      ...(schemaError ? {
        message: databaseError.message,
        schema: databaseError.schema,
        table: databaseError.table,
        column: databaseError.column,
      } : {}),
    });
    return Response.json({ error: "Your report could not be saved. Please try again." }, { status: 500 });
  }
}
