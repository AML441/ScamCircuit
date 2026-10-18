import type { Pool } from "pg";
import type { ReportSummary } from "./search-reports";

export function validReportId(id: string): boolean {
  return /^\d{1,19}$/.test(id) && BigInt(id) > BigInt(0) && BigInt(id) <= BigInt("9223372036854775807");
}

export interface AttachmentMetadata {
  id: string;
  file_name: string;
  file_type: string;
  file_size: string;
  uploaded_at: Date | null;
}
export interface ReportDetails extends Omit<ReportSummary, "attachment_count" | "match_count"> {
  app_contact: boolean | null;
  hour_of_day: number | null;
  num_items: number | null;
  customer_age: number | null;
  prev_transactions: number | null;
  distance_from_home: number | null;
  device_type: string | null;
  network_quality: number | null;
  is_first_transaction: number | null;
  store_type: number | null;
  velocity_score: number | null;
  is_weekend: number | null;
}

export async function getReportDetails(pool: Pick<Pool, "query">, id: string) {
  if (!validReportId(id)) return null;
  const result = await pool.query<ReportDetails>(
    "SELECT d.*, d.id::text AS id, d.date_occurred::text FROM data d WHERE d.id = $1 AND d.is_fraud = 1", [id],
  );
  const report = result.rows[0];
  if (!report) return null;
  const [apps, attachments] = await Promise.all([
    pool.query<{ app_name: string; username: string[] | null }>("SELECT app_name, username FROM apps WHERE parent_id = $1 ORDER BY id", [id]),
    pool.query<AttachmentMetadata>("SELECT id::text AS id, file_name, file_type, file_size::text AS file_size, uploaded_at FROM attachments WHERE report_id = $1 ORDER BY id", [id]),
  ]);
  return { report, apps: apps.rows, attachments: attachments.rows };
}
