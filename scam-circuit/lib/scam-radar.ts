import type { Pool } from "pg";

export const FLAG_REPORT_THRESHOLD = 6;

export type RadarRange = 7 | 30 | 90;
export type IdentifierKind = "payment_handle" | "email" | "phone";
export interface DailyTotal { day: string; reports: number; amount: number | null }
export interface IdentifierDay {
  day: string; kind: IdentifierKind; identifier: string; reports: number; report_id: string; amount: number | null;
}
export interface MethodDay { day: string; method: string; reports: number }
export interface RadarIdentifier {
  kind: IdentifierKind; identifier: string; recent: number; flagged: boolean;
  amount: number | null; reportId: string;
}
export interface RadarDay extends DailyTotal {
  totalReports: number; totalAmount: number | null; recent: number;
  flaggedCount: number; identifiers: RadarIdentifier[];
  methods: { method: string; reports: number }[];
}
export interface RadarData {
  start: string; end: string; range: RadarRange; days: RadarDay[];
  latestIncident: string | null; undatedReports: number;
}

export function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function parseRadarRange(value: string | null): RadarRange {
  if (value === null) return 30;
  if (value !== "7" && value !== "30" && value !== "90") throw new Error("Choose a 7, 30, or 90 day window.");
  return Number(value) as RadarRange;
}

// Pure replay calculation: no day can use an incident after its cursor date.
// Include six earlier days so even the first replay day has a full seven-day window.
export function buildRadar(
  range: RadarRange, end: string, totals: DailyTotal[], identifiers: IdentifierDay[], methods: MethodDay[],
  latestIncident: string | null, undatedReports: number,
): RadarData {
  const start = addDays(end, 1 - range);
  const totalMap = new Map(totals.map((row) => [row.day, row]));
  const groups = new Map<string, IdentifierDay[]>();
  for (const row of identifiers) {
    const key = JSON.stringify([row.kind, row.identifier]);
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }
  const days: RadarDay[] = [];
  let totalReports = 0;
  let totalAmount: number | null = null;
  for (let index = 0; index < range; index++) {
    const day = addDays(start, index);
    const recentStart = addDays(day, -6);
    const current = totalMap.get(day) || { day, reports: 0, amount: null };
    totalReports += current.reports;
    if (current.amount !== null) totalAmount = (totalAmount ?? 0) + current.amount;
    const sum = (from: string, until: string) => totals.reduce((n, row) => n + (row.day >= from && row.day <= until ? row.reports : 0), 0);
    let flaggedCount = 0;
    const active: RadarIdentifier[] = [];
    for (const rows of groups.values()) {
      let recent = 0;
      let amount: number | null = null;
      let last: IdentifierDay | undefined;
      for (const row of rows) {
        if (row.day > day || row.day < recentStart) continue;
        recent += row.reports;
        if (row.amount != null) amount = (amount ?? 0) + row.amount;
        if (!last || row.day > last.day || (row.day === last.day && BigInt(row.report_id) > BigInt(last.report_id))) last = row;
      }
      if (!last) continue;
      const flagged = recent >= FLAG_REPORT_THRESHOLD;
      if (flagged) flaggedCount++;
      active.push({ kind: last.kind, identifier: last.identifier, recent, flagged, amount, reportId: last.report_id });
    }
    active.sort((a, b) => b.recent - a.recent || a.identifier.localeCompare(b.identifier) || a.kind.localeCompare(b.kind));
    const methodCounts = new Map<string, number>();
    for (const row of methods) {
      if (row.day >= recentStart && row.day <= day) methodCounts.set(row.method, (methodCounts.get(row.method) || 0) + row.reports);
    }
    days.push({ ...current, totalReports, totalAmount, recent: sum(recentStart, day),
      flaggedCount, identifiers: active.slice(0, 6),
      methods: [...methodCounts].map(([method, reports]) => ({ method, reports })).sort((a, b) => b.reports - a.reports || a.method.localeCompare(b.method)).slice(0, 4) });
  }
  return { start, end, range, days, latestIncident, undatedReports };
}

export async function getScamRadar(pool: Pick<Pool, "query">, range: RadarRange, today: string): Promise<RadarData> {
  const start = addDays(today, 1 - range);
  const from = addDays(start, -6);
  // time_bucket operates on the existing DATE column. No schema changes or
  // invented timestamps; NULL incident dates are excluded explicitly.
  const results = await pool.query<{
    totals: DailyTotal[]; identifiers: IdentifierDay[]; methods: MethodDay[];
    latest_incident: string | null; undated: number;
  }>(
    `WITH scoped AS MATERIALIZED (
       SELECT d.id, d.transaction_amount, d.payment_handle, d.email, d.phone, d.payment_method,
         time_bucket('1 day'::interval, d.date_occurred)::text AS day
       FROM data d WHERE d.is_fraud = 1 AND d.date_occurred BETWEEN $1::date AND $2::date
     ), daily AS (
       SELECT day, count(*)::int AS reports,
         sum(CASE WHEN transaction_amount >= 0 AND transaction_amount < 'Infinity'::float8 THEN transaction_amount END) AS amount
       FROM scoped GROUP BY day
     ), identifier_days AS (
       SELECT day, i.kind, i.identifier, count(*)::int AS reports, max(id)::text AS report_id,
         sum(CASE WHEN transaction_amount >= 0 AND transaction_amount < 'Infinity'::float8 THEN transaction_amount END) AS amount
       FROM scoped CROSS JOIN LATERAL (VALUES
         ('payment_handle', nullif(btrim(payment_handle), '')),
         ('email', nullif(lower(btrim(email)), '')),
         ('phone', nullif(regexp_replace(phone, '[^0-9]', '', 'g'), ''))
       ) AS i(kind, identifier)
       WHERE i.identifier IS NOT NULL GROUP BY day, i.kind, i.identifier
     ), method_days AS (
       SELECT day, coalesce(nullif(btrim(payment_method), ''), 'Unknown') AS method, count(*)::int AS reports
       FROM scoped GROUP BY day, coalesce(nullif(btrim(payment_method), ''), 'Unknown')
     )
     SELECT coalesce((SELECT json_agg(daily) FROM daily), '[]') AS totals,
       coalesce((SELECT json_agg(identifier_days) FROM identifier_days), '[]') AS identifiers,
       coalesce((SELECT json_agg(method_days) FROM method_days), '[]') AS methods,
       (SELECT max(date_occurred)::text FROM data WHERE is_fraud = 1 AND date_occurred <= $2::date) AS latest_incident,
       (SELECT count(*)::int FROM data WHERE is_fraud = 1 AND date_occurred IS NULL) AS undated`,
    [from, today],
  );
  const row = results.rows[0];
  return buildRadar(range, today, row.totals, row.identifiers, row.methods, row.latest_incident, row.undated);
}
