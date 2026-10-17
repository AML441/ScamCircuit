import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runtimeRequire = createRequire(import.meta.url);
import ts from "typescript";

// Compile the actual server modules in memory, replacing only the DB boundary.
function loadTs(filename, mocks = {}, cache = new Map()) {
  filename = path.resolve(__dirname, "..", filename);
  if (cache.has(filename)) return cache.get(filename);
  const compiledModule = { exports: {} };
  cache.set(filename, compiledModule.exports);
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const localRequire = (specifier) => {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
    if (specifier.startsWith("@/") || specifier.startsWith(".")) {
      const target = specifier.startsWith("@/")
        ? path.resolve(__dirname, "..", specifier.slice(2))
        : path.resolve(path.dirname(filename), specifier);
      return loadTs(`${target}.ts`, mocks, cache);
    }
    return runtimeRequire(specifier);
  };
  new Function("require", "module", "exports", compiled)(localRequire, compiledModule, compiledModule.exports);
  cache.set(filename, compiledModule.exports);
  return compiledModule.exports;
}

const { validateReport, validateEvidence, parseUsernames, MAX_REQUEST_BYTES } = loadTs("lib/report-validation.ts");
const { saveReport } = loadTs("lib/save-report.ts");

function input(overrides = {}) {
  return {
    contactMethods: ["email"], contactMethodDetails: { email: "sender@example.com" },
    messagingPlatforms: [], messagingUsernames: { instagram: "@test", other: "@other" }, paymentMethod: "bank-transfer", paymentHandle: "", amountLost: "",
    incidentDate: "2026-10-17", narrative: "A test incident.",
    accuracyConfirmed: true, privacyAcknowledged: true, ...overrides,
  };
}

function database(failAt) {
  const calls = [];
  let released = false;
  const client = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (failAt && sql.includes(failAt)) throw Object.assign(new Error("Simulated DB failure"), { code: "TEST_FAILURE" });
      if (sql.startsWith("INSERT")) {
        const columns = sql.match(/\(([^)]+)\)/)[1].split(",").map((column) => column.trim());
        if (columns.includes("id")) {
          throw Object.assign(new Error("Cannot insert a non-DEFAULT value into an identity column"), { code: "428C9" });
        }
        if (sql.includes("INSERT INTO data")) {
          assert.match(sql, /RETURNING id::text AS id/);
          return { rows: [{ id: "9223372036854775806" }] };
        }
      }
      return { rows: [] };
    },
    release() { released = true; },
  };
  return { pool: { async connect() { return client; } }, calls, released: () => released };
}

test("optional amount and handle are NULL; weekends use the date, independent of timezone", () => {
  for (const [date, weekend] of [["2026-10-16", 0], ["2026-10-17", 1], ["2026-10-18", 1], ["2026-10-19", 0]]) {
    const result = validateReport(input({ incidentDate: date }));
    assert.equal(result.ok, true);
    assert.equal(result.report.isWeekend, weekend);
    assert.equal(result.report.amountLost, null);
    assert.equal(result.report.paymentHandle, null);
  }
  assert.equal(validateReport(input({ amountLost: "0" })).report.amountLost, 0);
  assert.equal(validateReport(input({ amountLost: "12.34" })).report.amountLost, 12.34);
});

test("required fields, invalid dates, invalid amounts, and forged confirmations are rejected", () => {
  for (const change of [
    { contactMethods: [] }, { contactMethods: ["unknown"] }, { contactMethods: "email" },
    { contactMethodDetails: {} }, { contactMethodDetails: { email: "  " } },
    { paymentMethod: "" }, { paymentMethod: "unknown" },
    { incidentDate: "2026-02-30" }, { incidentDate: "2026-13-01" },
    { narrative: "  " }, { accuracyConfirmed: false }, { privacyAcknowledged: "true" },
    { amountLost: "-1" }, { amountLost: "NaN" }, { amountLost: "Infinity" },
    { amountLost: "1.234" }, { amountLost: {} }, { amountLost: "1e2" },
    { paymentHandle: {} },
  ]) assert.equal(validateReport(input(change)).ok, false, JSON.stringify(change));
});

test("conditional app and Other fields are required; deselected details are ignored", () => {
  assert.equal(validateReport(input({ paymentMethod: "payment-app" })).ok, false);
  assert.equal(validateReport(input({ paymentMethod: "payment-app", paymentApp: "other" })).ok, false);
  assert.equal(validateReport(input({ paymentMethod: "other" })).ok, false);
  const social = { contactMethods: ["social-messaging"], contactMethodDetails: { "social-messaging": "@test" } };
  assert.equal(validateReport(input(social)).ok, false);
  assert.equal(validateReport(input({ ...social, messagingPlatforms: ["other"] })).ok, false);
  const valid = validateReport(input({ ...social, messagingPlatforms: ["instagram", "other"], otherMessagingPlatform: "Signal", paymentMethod: "payment-app", paymentApp: "other", otherPaymentApp: "Test Pay" }));
  assert.equal(valid.ok, true);
  const ignored = validateReport(input({ messagingPlatforms: ["instagram"], paymentApp: "venmo", contactMethodDetails: { email: "sender@example.com", phone: "stale" } }));
  assert.deepEqual(ignored.report.messagingPlatforms, []);
  assert.equal(ignored.report.paymentApp, "");
  assert.equal(ignored.report.contactMethodDetails.phone, undefined);
});

test("usernames are parsed per platform, trimmed, deduplicated, and required", () => {
  assert.deepEqual(parseUsernames(" @alice, @bob, , @alice, "), ["@alice", "@bob"]);
  const social = { contactMethods: ["social-messaging"], contactMethodDetails: {}, messagingPlatforms: ["instagram", "whatsapp"] };
  const result = validateReport(input({ ...social, messagingUsernames: { instagram: " @alice, @bob, @alice ", whatsapp: "+15550100, +15550101", x: "ignored" } }));
  assert.equal(result.ok, true);
  assert.deepEqual(result.report.messagingUsernames, { instagram: ["@alice", "@bob"], whatsapp: ["+15550100", "+15550101"] });
  for (const usernames of [{}, { instagram: ", ," }, { instagram: ["@alice"] }, { instagram: "@alice" }]) {
    assert.equal(validateReport(input({ ...social, messagingUsernames: usernames })).ok, false);
  }
});

test("files are optional, multiple are supported, and file limits are enforced", () => {
  const files = [new File(["one"], "one.txt"), new File(["two"], "two.txt")];
  assert.equal(validateEvidence([]), null);
  assert.equal(validateEvidence(files), null);
  assert.match(validateEvidence(Array(11).fill(files[0])), /at most/);
  assert.match(validateEvidence([new File([], "empty.txt")]), /Empty/);
  assert.match(validateEvidence([{ size: 21 * 1024 * 1024, name: "large", type: "" }]), /20 MB/);
});

test("report, app names, bytea files, flags and parent IDs are saved in one transaction", async () => {
  const mock = database();
  const report = validateReport(input({
    contactMethods: ["email", "social-messaging", "other"],
    contactMethodDetails: { email: "sender@example.com", "social-messaging": "@someone", other: "A flyer" },
    messagingPlatforms: ["instagram", "other"], otherMessagingPlatform: "Signal",
    paymentMethod: "payment-app", paymentApp: "other", otherPaymentApp: "Test Pay",
  })).report;
  const files = [new File(["first"], "first.txt", { type: "text/plain" }), new File(["second"], "second.txt")];
  const id = await saveReport(mock.pool, report, files);
  assert.match(id, /^\d+$/);
  assert.equal(id, "9223372036854775806");
  assert.equal(mock.calls[0].sql, "BEGIN");
  assert.equal(mock.calls.at(-1).sql, "COMMIT");
  const data = mock.calls.find((call) => call.sql.includes("INSERT INTO data"));
  assert.match(data.sql, /0\.0, 1/);
  assert.deepEqual(data.values.slice(0, 6), [null, 1, null, "sender@example.com", null, null]);
  assert.equal(data.values[6], "A flyer");
  assert.equal(data.values[8], true);
  assert.equal(data.values[9], "payment-app: Other: Test Pay");
  const apps = mock.calls.filter((call) => call.sql.includes("INSERT INTO apps"));
  assert.deepEqual(apps.map((call) => call.values), [[id, "Instagram", ["@test"]], [id, "Signal", ["@other"]]]);
  const attachments = mock.calls.filter((call) => call.sql.includes("INSERT INTO attachments"));
  assert.equal(attachments.length, 2);
  assert.equal(attachments[0].values[0], id);
  assert.deepEqual(attachments[0].values[1], Buffer.from("first"));
  assert.equal(attachments[0].values[4], 5);
  assert.equal(mock.released(), true);
});

test("inserts with SQL-like text use parameters and don't interpolate user content", async () => {
  const mock = database();
  const narrative = "'); DROP TABLE data; --";
  await saveReport(mock.pool, validateReport(input({ narrative })).report, []);
  const insert = mock.calls.find((call) => call.sql.includes("INSERT INTO data"));
  assert.equal(insert.sql.includes(narrative), false);
  assert.equal(insert.values.at(-1), narrative);
  assert.equal(mock.calls.some((call) => call.sql.includes("attachments")), false);
});

test("failures in any table roll back the transaction and release the connection", async () => {
  for (const table of ["data", "apps", "attachments"]) {
    const mock = database(table);
    const report = validateReport(input({ contactMethods: ["social-messaging"], contactMethodDetails: { "social-messaging": "@test" }, messagingPlatforms: ["instagram"] })).report;
    await assert.rejects(saveReport(mock.pool, report, [new File(["test"], "test.txt")]));
    assert.equal(mock.calls.at(-1).sql, "ROLLBACK");
    assert.equal(mock.calls.some((call) => call.sql === "COMMIT"), false);
    assert.equal(mock.released(), true);
  }
});

function route(mock) {
  return loadTs("app/api/reports/route.ts", { "@/lib/db": { db: mock.pool } }).POST;
}
function request(data = input(), files = []) {
  const form = new FormData();
  form.append("report", JSON.stringify(data));
  files.forEach((file) => form.append("files", file));
  return new Request("http://localhost/api/reports", { method: "POST", body: form });
}

test("API accepts multipart reports with and without attachments and returns the saved ID", async () => {
  for (const files of [[], [new File(["a"], "a.txt"), new File(["b"], "b.txt")]]) {
    const mock = database();
    const response = await route(mock)(request(input(), files));
    assert.equal(response.status, 201);
    assert.match((await response.json()).reportId, /^\d+$/);
    assert.equal(mock.calls.filter((call) => call.sql.includes("attachments")).length, files.length);
  }
});

test("API rejects missing fields, wrong content types, malformed JSON and oversized requests before DB access", async () => {
  const mock = database();
  const post = route(mock);
  assert.equal((await post(request(input({ narrative: "" })))).status, 400);
  assert.equal((await post(new Request("http://localhost/api/reports", { method: "POST", body: "{}", headers: { "content-type": "application/json" } }))).status, 415);
  const form = new FormData();
  form.append("report", "invalid json");
  assert.equal((await post(new Request("http://localhost/api/reports", { method: "POST", body: form }))).status, 400);
  const oversized = request();
  oversized.headers.set("content-length", String(MAX_REQUEST_BYTES + 1));
  assert.equal((await post(oversized)).status, 413);
  assert.equal(mock.calls.length, 0);
});

test("API returns an error instead of success on a DB failure", async () => {
  const mock = database("data");
  const response = await route(mock)(request());
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.reportId, undefined);
  assert.match(body.error, /could not be saved/);
  assert.equal(mock.calls.at(-1).sql, "ROLLBACK");
});

test("missing table errors identify the relation in server logs without exposing it in the response", async () => {
  const calls = [];
  const mock = database();
  const client = await mock.pool.connect();
  const query = client.query;
  client.query = async (sql, values) => {
    if (sql.includes("INSERT INTO attachments")) {
      throw Object.assign(new Error('relation "attachments" does not exist'), { code: "42P01" });
    }
    return query(sql, values);
  };
  const originalError = console.error;
  console.error = (...args) => calls.push(args);
  try {
    const response = await route(mock)(request(input(), [new File(["test"], "test.txt")]));
    assert.equal(response.status, 500);
    assert.equal(calls[0][1].code, "42P01");
    assert.equal(calls[0][1].message, 'relation "attachments" does not exist');
    assert.equal(JSON.stringify(calls).includes("sender@example.com"), false);
    assert.equal(JSON.stringify(await response.json()).includes("attachments"), false);
    assert.equal(mock.calls.at(-1).sql, "ROLLBACK");
    assert.equal(mock.released(), true);
  } finally {
    console.error = originalError;
  }
});
