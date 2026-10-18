import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

const { addDays, parseRadarRange, buildRadar, getScamRadar } = loadTs("lib/scam-radar.ts");
const identifier = (day, reports, overrides = {}) => ({ day, reports, kind: "email", identifier: "person@example.com", report_id: "9223372036854775806", amount: null, ...overrides });

test("radar ranges are bounded and calendar arithmetic crosses DST, leap days, and years", () => {
  assert.equal(parseRadarRange(null), 30);
  for (const range of [7, 30, 90]) assert.equal(parseRadarRange(String(range)), range);
  for (const value of ["", "1", "10000", "7.0", "30; DROP TABLE data"]) assert.throws(() => parseRadarRange(value));
  assert.equal(addDays("2026-11-02", -2), "2026-10-31");
  assert.equal(addDays("2024-03-01", -1), "2024-02-29");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
});

test("replay excludes future incidents, losses, methods, and identifier evidence", () => {
  const radar = buildRadar(7, "2026-10-18", [
    { day: "2026-10-12", reports: 2, amount: 0 },
    { day: "2026-10-14", reports: 3, amount: null },
    { day: "2026-10-18", reports: 100, amount: 10000 },
  ], [identifier("2026-10-12", 2, { report_id: "9223372036854775805" }), identifier("2026-10-14", 3),
    identifier("2026-10-18", 100, { identifier: "future@example.com" })], [
    { day: "2026-10-12", method: "bank-transfer", reports: 2 },
    { day: "2026-10-18", method: "future-method", reports: 100 },
  ], "2026-10-18", 4);
  const first = radar.days[0];
  assert.equal(first.totalReports, 2);
  assert.equal(first.totalAmount, 0);
  assert.equal(first.flaggedCount, 0);
  assert.equal(first.identifiers[0].reportId, "9223372036854775805");
  assert.equal(first.identifiers[0].flagged, false);
  assert.deepEqual(first.methods, [{ method: "bank-transfer", reports: 2 }]);
  assert.equal(radar.days[2].flaggedCount, 0);
  assert.equal(radar.days[2].identifiers[0].flagged, false);
  assert.equal(radar.days[2].totalAmount, 0);
  assert.equal(radar.days[6].totalReports, 105);
  assert.equal(radar.days[6].totalAmount, 10000);
  assert.equal(radar.undatedReports, 4);
});

test("flags require more than five reports within the selected seven days", () => {
  const radar = buildRadar(7, "2026-10-18", [], [
    identifier("2026-10-11", 20), // Excluded from Oct 18's window.
    identifier("2026-10-12", 5, { amount: 100 }),
    identifier("2026-10-18", 1, { amount: 25 }),
    identifier("2026-10-18", 5, { identifier: "five" }),
    identifier("2026-10-18", 6, { identifier: "six-no-history" }),
  ], [], null, 0);
  const last = radar.days.at(-1);
  const main = last.identifiers.find((item) => item.identifier === "person@example.com");
  assert.equal(main.recent, 6);
  assert.equal(main.flagged, true);
  assert.equal(main.amount, 125);
  assert.equal(last.identifiers.find((item) => item.identifier === "five").flagged, false);
  assert.equal(last.identifiers.find((item) => item.identifier === "six-no-history").flagged, true);
  assert.equal(last.flaggedCount, 2);
  const expired = buildRadar(7, "2026-10-19", [], [
    identifier("2026-10-12", 5), identifier("2026-10-18", 1),
  ], [], null, 0).days.at(-1).identifiers[0];
  assert.equal(expired.recent, 1);
  assert.equal(expired.flagged, false);
});

test("empty days are filled, unknown amounts stay unknown, and identifiers retain their kind", () => {
  const radar = buildRadar(7, "2026-10-18", [], [
    identifier("2026-10-18", 3, { identifier: "123", kind: "payment_handle" }),
    identifier("2026-10-18", 3, { identifier: "123", kind: "phone" }),
  ], [], null, 0);
  assert.equal(radar.days.length, 7);
  assert.equal(radar.start, "2026-10-12");
  assert.equal(radar.days[0].reports, 0);
  assert.equal(radar.days[0].totalAmount, null);
  assert.equal(radar.days.at(-1).flaggedCount, 0);
});

test("TigerData query uses incident-date buckets, normalized identifiers, and bound dates", async () => {
  const calls = [];
  const radar = await getScamRadar({ query: async (sql, values) => {
    calls.push({ sql, values });
    return { rows: [{ totals: [], identifiers: [], methods: [], latest_incident: null, undated: 2 }] };
  } }, 30, "2026-10-18");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].values, ["2026-09-13", "2026-10-18"]);
  assert.match(calls[0].sql, /time_bucket\('1 day'::interval, d\.date_occurred\)/);
  assert.match(calls[0].sql, /lower\(btrim\(email\)\)/);
  assert.match(calls[0].sql, /regexp_replace\(phone/);
  assert.doesNotMatch(calls[0].sql, /submitted_at|created_at|INSERT|UPDATE|ALTER/);
  assert.equal(radar.undatedReports, 2);
});

test("radar API validates before querying, disables caching, and hides database failures", async () => {
  let calls = 0;
  const { GET } = loadTs("app/api/radar/route.ts", { "@/lib/db": { db: { query: async () => {
    calls++;
    throw Object.assign(new Error("secret DB connection detail"), { code: "TEST_FAILURE" });
  } } } });
  const bad = await GET(new Request("http://localhost/api/radar?days=1000"));
  assert.equal(bad.status, 400);
  assert.equal(calls, 0);
  const original = console.error;
  console.error = () => {};
  try {
    const failed = await GET(new Request("http://localhost/api/radar?days=7"));
    assert.equal(failed.status, 503);
    assert.equal(failed.headers.get("cache-control"), "no-store");
    assert.doesNotMatch(JSON.stringify(await failed.json()), /secret DB/);
  } finally { console.error = original; }
});

test("successful radar API returns date-only replay data without caching", async () => {
  const { GET } = loadTs("app/api/radar/route.ts", { "@/lib/db": { db: { query: async () => ({ rows: [{
    totals: [], identifiers: [], methods: [], latest_incident: null, undated: 0,
  }] }) } } });
  const response = await GET(new Request("http://localhost/api/radar?days=90"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const data = await response.json();
  assert.equal(data.days.length, 90);
  assert.match(data.end, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(data.days.at(-1).totalReports, 0);
  assert.equal(data.days.at(-1).totalAmount, null);
});

test("alert totals include identifiers beyond the six visible cards", () => {
  const rows = Array.from({ length: 10 }, (_, i) => identifier("2026-10-18", 6, { identifier: `recipient-${i}` }));
  rows.push(identifier("2026-10-18", 1, { identifier: "recipient-0", report_id: "9223372036854775807" }));
  const last = buildRadar(7, "2026-10-18", [], rows, [], null, 0).days.at(-1);
  assert.equal(last.flaggedCount, 10);
  assert.equal(last.identifiers.length, 6);
  assert.equal(last.identifiers[0].reportId, "9223372036854775807");
});
