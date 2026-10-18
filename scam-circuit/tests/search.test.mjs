import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

const { parseReportSearch, searchUrl, safeSearchBack } = loadTs("lib/report-search-params.ts");
const { searchReports } = loadTs("lib/search-reports.ts");
const { getReportDetails, validReportId } = loadTs("lib/report-details.ts");
const search = (query) => parseReportSearch(new URLSearchParams(query));

function database({ total = 42, reports = [{ id: "9223372036854775806", attachment_count: 2 }], fail = false } = {}) {
  const calls = [];
  return { calls, pool: { query: async (sql, values) => {
    calls.push({ sql, values });
    if (fail) throw Object.assign(new Error("secret database message"), { code: "TEST_FAILURE" });
    return { rows: sql.includes("AS total_amount") ? [{ total: String(total), total_amount: total ? 250 : null }] : reports };
  } } };
}

test("search URLs preserve special characters, filters and pages, and normalize recipient identifiers", () => {
  const original = search({ field: "payment_handle", q: "  $alice&bob+tag_%  ", page: "2" });
  assert.deepEqual(search(new URL(searchUrl(original), "http://local").searchParams), original);
  const recipient = search({ mode: "recipient", payment_handle: " 00098 ", email: " NAME+TAG@EXAMPLE.COM ", phone: "+1 (301) 555-0189" });
  assert.deepEqual(recipient.identifiers, { paymentHandle: "00098", email: "name+tag@example.com", phone: "13015550189" });
  assert.deepEqual(search(new URL(searchUrl(recipient), "http://local").searchParams), recipient);
});

test("invalid filters, pages, oversized keywords and empty recipient mode are rejected", () => {
  for (const query of [{ field: "id; DROP TABLE data" }, { page: "-1" }, { page: "1.2" }, { page: "1e2" }, { page: "9007199254740992" }, { mode: "wrong" }, { mode: "recipient" }, { mode: "recipient", phone: "wrong" }, { q: "x".repeat(2001) }]) assert.throws(() => search(query));
});

test("back links stay on the local search page and retain valid filters", () => {
  for (const url of ["https://wrong.invalid", "//wrong.invalid/search", "/search/../other", "/searching", "/search?field=wrong", "/search?mode=recipient"]) assert.equal(safeSearchBack(url), "/search");
  assert.equal(safeSearchBack("/search?q=alice&field=email&page=2"), "/search?q=alice&field=email&page=2");
});

test("blank searches skip the database; zero matches return a real empty result", async () => {
  const mock = database({ total: 0 });
  assert.equal((await searchReports(mock.pool, search({}))).total, 0);
  assert.equal(mock.calls.length, 0);
  const results = await searchReports(mock.pool, search({ q: "missing" }));
  assert.deepEqual(results, { total: 0, totalAmount: null, page: 1, pages: 1, reports: [] });
  assert.equal(mock.calls.length, 1);
});

test("keyword queries escape literal SQL wildcard characters, constrain fields and paginate results", async () => {
  const mock = database();
  const input = "50%_\\'; DROP TABLE data; --";
  const result = await searchReports(mock.pool, search({ q: input, field: "payment_method", page: "2" }));
  assert.equal(result.total, 42);
  assert.equal(result.page, 2);
  assert.equal(result.pages, 3);
  assert.equal(result.reports[0].id, "9223372036854775806");
  for (const call of mock.calls) {
    assert.equal(call.sql.includes(input), false);
    assert.match(call.sql, /d\.is_fraud = 1/);
    assert.match(call.sql, /d\.payment_method ILIKE \$1/);
    assert.doesNotMatch(call.sql, /d\.email ILIKE/);
    assert.equal(call.values[0], "%50\\%\\_\\\\'; DROP TABLE data; --%");
  }
  assert.deepEqual(mock.calls[1].values.slice(-2), [20, 20]);
  assert.doesNotMatch(mock.calls[1].sql, /file_data|d\.\*/);
});

test("formatted phone searches also match normalized digits; all fields includes messaging accounts", async () => {
  const phone = database();
  await searchReports(phone.pool, search({ field: "phone", q: "+1 (301) 555" }));
  assert.match(phone.calls[0].sql, /regexp_replace\(d\.phone/);
  assert.equal(phone.calls[0].values[1], "%1301555%");
  const all = database();
  await searchReports(all.pool, search({ q: "@alice" }));
  assert.match(all.calls[0].sql, /unnest\(app\.username\)/);
  assert.match(all.calls[0].sql, /d\.email ILIKE/);
  const username = database();
  await searchReports(username.pool, search({ field: "username", q: "@alice" }));
  assert.match(username.calls[0].sql, /app\.app_name ILIKE/);
  assert.doesNotMatch(username.calls[0].sql, /d\.email ILIKE/);
});

test("recipient dashboard and bank lookup share exact OR predicates, normalization and ranking", async () => {
  const mock = database();
  const recipient = search({ mode: "recipient", payment_handle: " CaseSensitive ", email: " TEST@EXAMPLE.COM ", phone: "(301) 555-0189" });
  await searchReports(mock.pool, recipient);
  const { findReportedRecipients } = loadTs("lib/find-reported-recipients.ts");
  const lookup = database();
  await findReportedRecipients(lookup.pool, { payment_handle: "CaseSensitive", email: "test@example.com", phone: "3015550189" });
  assert.deepEqual(mock.calls[0].values, lookup.calls[0].values);
  assert.deepEqual(mock.calls[0].values, ["CaseSensitive", "test@example.com", "3015550189"]);
  assert.match(mock.calls[1].sql, /ORDER BY match_count DESC, d\.id DESC/);
  assert.match(mock.calls[0].sql, /OR/);
  assert.doesNotMatch(mock.calls[0].sql, /ILIKE/);
});

test("out of range pages clamp to the last page without losing totals", async () => {
  const mock = database();
  const results = await searchReports(mock.pool, search({ q: "alice", page: "999999" }));
  assert.equal(results.page, 3);
  assert.deepEqual(mock.calls[1].values.slice(-2), [20, 40]);
});

test("search API validates before database access, disables caching and reports DB errors as failures", async () => {
  const mock = database();
  const get = loadTs("app/api/reports/search/route.ts", { "@/lib/db": { db: mock.pool } }).GET;
  assert.equal((await get(new Request("http://local/api/reports/search?field=wrong"))).status, 400);
  assert.equal(mock.calls.length, 0);
  const response = await get(new Request("http://local/api/reports/search?q=alice"));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal((await response.json()).total, 42);
  const failing = loadTs("app/api/reports/search/route.ts", { "@/lib/db": { db: database({ fail: true }).pool } }).GET;
  const failed = await failing(new Request("http://local/api/reports/search?q=alice"));
  assert.equal(failed.status, 500);
  assert.doesNotMatch(JSON.stringify(await failed.json()), /secret/);
});

test("detail IDs preserve bigint precision and invalid or missing reports do not read evidence", async () => {
  assert.equal(validReportId("9223372036854775806"), true);
  for (const id of ["1.1", "-1", "0", "9223372036854775808", "abc"]) assert.equal(validReportId(id), false);
  const mock = database({ reports: [] });
  assert.equal(await getReportDetails(mock.pool, "invalid"), null);
  assert.equal(mock.calls.length, 0);
  assert.equal(await getReportDetails(mock.pool, "42"), null);
  assert.equal(mock.calls.length, 1);
  assert.match(mock.calls[0].sql, /d\.is_fraud = 1/);
});

test("details fetch app accounts and file metadata without loading binary content", async () => {
  const mock = database({ reports: [{ id: "42" }] });
  const result = await getReportDetails(mock.pool, "42");
  assert.equal(result.report.id, "42");
  assert.equal(mock.calls.length, 3);
  assert.ok(mock.calls.every((call) => call.values[0] === "42"));
  assert.doesNotMatch(mock.calls.map((call) => call.sql).join(" "), /file_data/);
});

test("evidence is scoped to its report, downloaded as inert bytes and uses safe UTF-8 filenames", async () => {
  const mock = database({ reports: [{ file_data: Buffer.from("<html>untrusted</html>"), file_name: 'résumé\r\n".html' }] });
  const get = loadTs("app/api/reports/[id]/attachments/[attachmentId]/route.ts", { "@/lib/db": { db: mock.pool } }).GET;
  const response = await get(new Request("http://local"), { params: Promise.resolve({ id: "42", attachmentId: "5" }) });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "<html>untrusted</html>");
  assert.deepEqual(mock.calls[0].values, ["5", "42"]);
  assert.match(mock.calls[0].sql, /a\.report_id = \$2 AND d\.is_fraud = 1/);
  assert.equal(response.headers.get("content-type"), "application/octet-stream");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(response.headers.get("content-disposition"), /^attachment;/);
  assert.match(response.headers.get("content-disposition"), /r%C3%A9sum%C3%A9__%22.html/);
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("missing, mismatched and invalid attachments return 404; storage failures return 500", async () => {
  const missing = database({ reports: [] });
  const get = loadTs("app/api/reports/[id]/attachments/[attachmentId]/route.ts", { "@/lib/db": { db: missing.pool } }).GET;
  assert.equal((await get(new Request("http://local"), { params: Promise.resolve({ id: "42", attachmentId: "invalid" }) })).status, 404);
  assert.equal(missing.calls.length, 0);
  assert.equal((await get(new Request("http://local"), { params: Promise.resolve({ id: "42", attachmentId: "5" }) })).status, 404);
  const failing = loadTs("app/api/reports/[id]/attachments/[attachmentId]/route.ts", { "@/lib/db": { db: database({ fail: true }).pool } }).GET;
  assert.equal((await failing(new Request("http://local"), { params: Promise.resolve({ id: "42", attachmentId: "5" }) })).status, 500);
});
