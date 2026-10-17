import type { Pool } from "pg";
import { messagingPlatforms, paymentApps } from "./report-options";
import type { ValidReport } from "./report-validation";

export async function saveReport(pool: Pool, report: ValidReport, files: File[]): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const detail = (method: string) => report.contactMethodDetails[method] || null;

    let paymentMethod = report.paymentMethod;
    if (paymentMethod === "other") paymentMethod = `other: ${report.otherPaymentMethod}`;
    if (paymentMethod === "payment-app") {
      const app = report.paymentApp === "other"
        ? `Other: ${report.otherPaymentApp}`
        : paymentApps.find((app) => app.value === report.paymentApp)!.label;
      paymentMethod = `payment-app: ${app}`;
    }

    const result = await client.query<{ id: string }>(
      `INSERT INTO data
        (transaction_amount, is_weekend, store_type, is_fraud,
         payment_handle, email, phone, website_url, other_contact,
         date_occurred, app_contact, payment_method, description)
       VALUES ($1, $2, 0.0, 1, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id::text AS id`,
      [report.amountLost, report.isWeekend, report.paymentHandle,
        detail("email"), detail("phone"), detail("website"), detail("other"),
        report.incidentDate, report.contactMethods.includes("social-messaging"),
        paymentMethod, report.narrative],
    );
    // Let PostgreSQL generate identity values and preserve bigint precision.
    const id = result.rows[0].id;

    for (const value of report.messagingPlatforms) {
      const appName = value === "other"
        ? report.otherMessagingPlatform
        : messagingPlatforms.find((app) => app.value === value)!.label;
      await client.query(
        "INSERT INTO apps (parent_id, app_name, username) VALUES ($1, $2, $3::text[])",
        [id, appName, report.messagingUsernames[value]],
      );
    }

    for (const file of files) {
      await client.query(
        `INSERT INTO attachments
          (report_id, file_data, file_type, file_name, file_size)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, Buffer.from(await file.arrayBuffer()),
          file.type || "application/octet-stream", file.name, file.size],
      );
    }
    await client.query("COMMIT");
    return id;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
