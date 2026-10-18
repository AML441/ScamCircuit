import type { Pool } from "pg";
import { recipientMatchConditions, recipientMatchScore } from "./find-reported-recipients";
import type { ReportSearch } from "./report-search-params";

export const PAGE_SIZE = 20;
export interface ReportSummary {
  id: string;
  payment_handle: string | null;
  payment_method: string | null;
  email: string | null;
  phone: string | null;
  website_url: string | null;
  other_contact: string | null;
  date_occurred: string | null;
  transaction_amount: number | null;
  description: string | null;
  attachment_count: number;
  match_count: number;
}
export interface ReportSearchResults {
  reports: ReportSummary[];
  total: number;
  totalAmount: number | null;
  page: number;
  pages: number;
}

const keywordColumns = ["payment_method", "payment_handle", "email", "phone", "website_url", "other_contact", "description"] as const;
const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

export async function searchReports(pool: Pick<Pool, "query">, search: ReportSearch): Promise<ReportSearchResults> {
  const empty: ReportSearchResults = { reports: [], total: 0, totalAmount: null, page: 1, pages: 1 };
  if (search.mode === "keyword" && !search.q) return empty;

  const values: (string | number | null)[] = [];
  let predicate: string;
  let score = "0";
  if (search.mode === "recipient") {
    values.push(search.identifiers.paymentHandle, search.identifiers.email, search.identifiers.phone);
    predicate = recipientMatchConditions.join(" OR ");
    score = recipientMatchScore;
  } else {
    // Identifiers come exclusively from the allowlist. Values always use parameters.
    const columns = search.field === "all" ? keywordColumns : keywordColumns.filter((column) => column === search.field);
    values.push(`%${escapeLike(search.q)}%`);
    const conditions: string[] = columns.map((column) => `d.${column} ILIKE $1`);
    // Match form labels such as "bank transfer" as well as stored enum values.
    if (columns.includes("payment_method")) conditions.push("replace(d.payment_method, '-', ' ') ILIKE $1");
    if (search.field === "all" || search.field === "username") {
      conditions.push("EXISTS (SELECT 1 FROM apps app WHERE app.parent_id = d.id AND (app.app_name ILIKE $1 OR EXISTS (SELECT 1 FROM unnest(app.username) AS u(value) WHERE u.value ILIKE $1)))");
    }
    if ((search.field === "phone" || search.field === "all") && /^[+\d\s().-]+$/.test(search.q) && /\d/.test(search.q)) {
      values.push(`%${search.q.replace(/[^0-9]/g, "")}%`);
      conditions.push(`regexp_replace(d.phone, '[^0-9]', '', 'g') LIKE $${values.length}`);
    }
    predicate = conditions.join(" OR ");
  }
  const where = `d.is_fraud = 1 AND (${predicate})`;
  const summary = await pool.query<{ total: string; total_amount: number | null }>(
    `SELECT count(*)::text AS total,
       sum(CASE WHEN d.transaction_amount >= 0 AND d.transaction_amount < 'Infinity'::float8 THEN d.transaction_amount END) AS total_amount
     FROM data d WHERE ${where}`, values,
  );
  const total = Number(summary.rows[0].total);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(search.page, pages);
  if (!total) return empty;
  const results = await pool.query<ReportSummary>(
    `SELECT d.id::text AS id, d.payment_handle, d.payment_method, d.email, d.phone,
       d.website_url, d.other_contact, d.date_occurred::text, d.transaction_amount,
       left(d.description, 300) AS description,
       (SELECT count(*)::int FROM attachments a WHERE a.report_id = d.id) AS attachment_count,
       (${score}) AS match_count
     FROM data d WHERE ${where}
     ORDER BY match_count DESC, d.id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, PAGE_SIZE, (page - 1) * PAGE_SIZE],
  );
  return { reports: results.rows, total, totalAmount: summary.rows[0].total_amount, page, pages };
}
