import { db } from "@/lib/db";
import { findReportedRecipients, RecipientLookupValidationError } from "@/lib/find-reported-recipients";

import { predictFraud, ModelInputError } from "@/lib/predict-fraud";

const MAX_BODY_BYTES = 64 * 1024;
const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    return Response.json({ error: "Send the transaction payload as application/json." }, { status: 415, headers });
  }
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return Response.json({ error: "The transaction payload must be 64 KB or less." }, { status: 413, headers });
  }

  let payload: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: "Provide a JSON transaction payload." }, { status: 400, headers });
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY_BYTES) {
          await reader.cancel();
          return Response.json({ error: "The transaction payload must be 64 KB or less." }, { status: 413, headers });
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    payload = Buffer.concat(chunks).toString("utf8");
  } catch {
    return Response.json({ error: "Provide valid JSON." }, { status: 400, headers });
  }

  try {
    const matches = await findReportedRecipients(db, payload);
    if (matches.length) {
      return Response.json({ decision: "blocked", source: "reports", reports: matches, prediction: null }, { headers });
    }
    const prediction = await predictFraud(payload);
    return Response.json({
      decision: prediction.is_fraud ? "blocked" : "allowed",
      source: "model", reports: [], prediction,
    }, { headers });
  } catch (error) {
    if (error instanceof RecipientLookupValidationError || error instanceof ModelInputError) {
      return Response.json({ error: error.message }, { status: 400, headers });
    }
    const databaseError = error as { code?: string; message?: string };
    console.error("Transaction check failed", {
      code: databaseError.code || "UNKNOWN",
      ...(["42P01", "42703"].includes(databaseError.code || "") ? { message: databaseError.message } : {}),
    });
    return Response.json({ error: "The transaction checks could not be completed. The payment was not completed. Please try again." }, { status: 500, headers });
  }
}
