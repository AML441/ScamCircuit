import type { Pool } from "pg";

export interface RecipientIdentifiers {
  accountId: string | null;
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

function identifier(value: unknown, field: string): string | null {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new RecipientLookupValidationError(`recipient.${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > 2000) {
    throw new RecipientLookupValidationError(`recipient.${field} must be at most 2,000 characters.`);
  }
  return trimmed || null;
}

export function getRecipientIdentifiers(payload: unknown): RecipientIdentifiers {
  if (!isObject(payload) || !isObject(payload.recipient)) {
    throw new RecipientLookupValidationError("Provide a transaction payload with a recipient object.");
  }
  const recipient = payload.recipient;
  const accountId = identifier(recipient.account_id, "account_id");
  const email = identifier(recipient.email, "email")?.toLowerCase() || null;
  const rawPhone = identifier(recipient.phone, "phone");
  const phone = rawPhone?.replace(/[^0-9]/g, "") || null;
  if (rawPhone && (!phone || !/^\+?[0-9\s().-]+$/.test(rawPhone) || phone.length > 15)) {
    throw new RecipientLookupValidationError("recipient.phone must be a phone number with at most 15 digits, optionally including a country code and formatting.");
  }
  return { accountId, email, phone };
}

/**
 * Find existing fraud reports sharing ANY recipient identifier.
 * account_id maps to payment_handle in the current report schema.
 * Sort by the number of matching identifiers, then by newest report ID.
 */
export async function findReportedRecipients(
  pool: Pick<Pool, "query">,
  payload: unknown,
): Promise<ReportedRecipientMatch[]> {
  const { accountId, email, phone } = getRecipientIdentifiers(payload);
  if (!accountId && !email && !phone) return [];

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
    [accountId, email, phone],
  );
  return result.rows;
}
