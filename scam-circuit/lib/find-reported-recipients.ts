import type { Pool } from "pg";

export interface RecipientIdentifiers {
  paymentHandle: string | null;
  email: string | null;
  phone: string | null;
}

export interface ReportedRecipientMatch {
  id: string;
  match_count: number;
  is_fraud: string | number;
  payment_handle: string | null;
  email: string | null;
  phone: string | null;
  [column: string]: unknown;
}

export class RecipientLookupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecipientLookupValidationError";
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Accept an object or JSON text, including NaN values from Python exports. */
export function parseRecipientLookupPayload(payload: unknown): Record<string, unknown> {
  let parsed = payload;
  // Also support a JSON-encoded string containing the object.
  for (let depth = 0; typeof parsed === "string" && depth < 2; depth++) {
    try {
      // Match complete quoted strings first so literal "NaN" text stays intact.
      const normalized = parsed.replace(/"(?:\\.|[^"\\])*"|\bNaN\b/g, (token) => token === "NaN" ? "null" : token);
      parsed = JSON.parse(normalized);
    } catch {
      throw new RecipientLookupValidationError("Provide valid JSON containing a transaction object.");
    }
  }
  if (!isObject(parsed)) {
    throw new RecipientLookupValidationError("Provide a transaction object with top-level payment_handle, email, and/or phone fields.");
  }
  return parsed;
}

function identifier(value: unknown, field: string, allowNumber = false): string | null {
  if (value == null || (typeof value === "number" && Number.isNaN(value))) return null;
  if (allowNumber && typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RecipientLookupValidationError(`${field} must be text or a nonnegative safe integer. Send long identifiers as strings.`);
    }
    value = String(value);
  }
  if (typeof value !== "string") {
    throw new RecipientLookupValidationError(`${field} must be a string${allowNumber ? " or number" : ""}.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > 2000) {
    throw new RecipientLookupValidationError(`${field} must be at most 2,000 characters.`);
  }
  return trimmed || null;
}

export function getRecipientIdentifiers(payload: unknown): RecipientIdentifiers {
  const transaction = parseRecipientLookupPayload(payload);
  const paymentHandle = identifier(transaction.payment_handle, "payment_handle");
  const email = identifier(transaction.email, "email")?.toLowerCase() || null;
  const rawPhone = identifier(transaction.phone, "phone", true);
  const phone = rawPhone?.replace(/[^0-9]/g, "") || null;
  if (rawPhone && (!phone || !/^\+?[0-9\s().-]+$/.test(rawPhone) || phone.length > 15)) {
    throw new RecipientLookupValidationError("phone must be a phone number with at most 15 digits, optionally including a country code and formatting.");
  }
  return { paymentHandle, email, phone };
}

/**
 * Find existing fraud reports sharing ANY recipient identifier.
 * Read payment_handle, email, and phone directly from the transaction object.
 * Sort by the number of matching identifiers, then by newest report ID.
 */
export async function findReportedRecipients(
  pool: Pick<Pool, "query">,
  payload: unknown,
): Promise<ReportedRecipientMatch[]> {
  const { paymentHandle, email, phone } = getRecipientIdentifiers(payload);
  if (!paymentHandle && !email && !phone) return [];

  const result = await pool.query<ReportedRecipientMatch>(
    `SELECT d.*,
       (
         CASE WHEN $1::text IS NOT NULL AND btrim(d.payment_handle) = $1 THEN 1 ELSE 0 END
         + CASE WHEN $2::text IS NOT NULL AND lower(btrim(d.email)) = $2 THEN 1 ELSE 0 END
         + CASE WHEN $3::text IS NOT NULL AND regexp_replace(d.phone, '[^0-9]', '', 'g') = $3 THEN 1 ELSE 0 END
       ) AS match_count
     FROM data AS d
     WHERE d.is_fraud = 1
       AND (
         ($1::text IS NOT NULL AND btrim(d.payment_handle) = $1)
         OR ($2::text IS NOT NULL AND lower(btrim(d.email)) = $2)
         OR ($3::text IS NOT NULL AND regexp_replace(d.phone, '[^0-9]', '', 'g') = $3)
       )
     ORDER BY match_count DESC, d.id DESC`,
    [paymentHandle, email, phone],
  );
  return result.rows;
}
