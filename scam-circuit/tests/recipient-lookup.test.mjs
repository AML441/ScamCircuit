import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

const { getRecipientIdentifiers, findReportedRecipients, RecipientLookupValidationError } = loadTs("lib/find-reported-recipients.ts");

const transaction = {
  transaction_id: "txn_839201",
  timestamp: "2026-10-17T14:32:18Z",
  amount: 250,
  currency: "USD",
  sender_id: "usr_10293",
  recipient: {
    account_id: "acct_2002",
    name: "Bob Smith",
    email: "bob@example.com",
    phone: "+13015550189",
  },
  payment_method: "ZELLE",
  description: "Concert tickets",
};

function database(rows = [], failure) {
  const calls = [];
  return {
    calls,
    pool: {
      async query(sql, values) {
        calls.push({ sql, values });
        if (failure) throw failure;
        return { rows };
      },
    },
  };
}

function post(pool) {
  return loadTs("app/api/reports/check-recipient/route.ts", { "@/lib/db": { db: pool } }).POST;
}

function request(payload = transaction) {
  return new Request("http://localhost/api/reports/check-recipient", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
}

test("extracts only recipient identifiers from the supplied transaction", () => {
  assert.deepEqual(getRecipientIdentifiers(transaction), {
    accountId: "acct_2002", email: "bob@example.com", phone: "13015550189",
  });
});

test("normalizes surrounding whitespace, email case and phone formatting without guessing country codes or account case", () => {
  assert.deepEqual(getRecipientIdentifiers({ recipient: {
    account_id: " ACCT_2002 ", email: " BOB@EXAMPLE.COM ", phone: " +1 (301) 555-0189 ",
  } }), { accountId: "ACCT_2002", email: "bob@example.com", phone: "13015550189" });
  assert.equal(getRecipientIdentifiers({ recipient: { phone: "301-555-0189" } }).phone, "3015550189");
});

test("matches payment_handle, email or phone in flagged reports with parameterized exact comparisons", async () => {
  const row = { id: "9007199254740993", match_count: 3, is_fraud: "1", payment_handle: "acct_2002", email: "bob@example.com", phone: "+13015550189", description: "An earlier report" };
  const mock = database([row]);
  const matches = await findReportedRecipients(mock.pool, transaction);
  assert.deepEqual(matches, [row]);
  assert.equal(mock.calls.length, 1);
  const { sql, values } = mock.calls[0];
  assert.deepEqual(values, ["acct_2002", "bob@example.com", "13015550189"]);
  assert.match(sql, /FROM data AS d/);
  assert.match(sql, /d\.is_fraud = 1\s+AND\s*\(/);
  assert.match(sql, /btrim\(d\.payment_handle\) = \$1/);
  assert.match(sql, /OR .*lower\(btrim\(d\.email\)\) = \$2/);
  assert.match(sql, /OR .*regexp_replace\(d\.phone, '\[\^0-9\]', '', 'g'\) = \$3/);
  assert.doesNotMatch(sql, /JOIN|LIKE|ILIKE/);
  for (const identifier of values) assert.equal(sql.includes(identifier), false);
});

test("query ranks three matches before two before one, breaking ties by descending report ID", async () => {
  const rows = [
    { id: "10", match_count: 3 },
    { id: "30", match_count: 2 },
    { id: "20", match_count: 2 },
    { id: "50", match_count: 1 },
  ];
  const mock = database(rows);
  const matches = await findReportedRecipients(mock.pool, transaction);
  const { sql } = mock.calls[0];
  assert.match(sql, /CASE WHEN \$1::text IS NOT NULL AND btrim\(d\.payment_handle\) = \$1 THEN 1 ELSE 0 END/);
  assert.match(sql, /\+ CASE WHEN \$2::text IS NOT NULL AND lower\(btrim\(d\.email\)\) = \$2 THEN 1 ELSE 0 END/);
  assert.match(sql, /\+ CASE WHEN \$3::text IS NOT NULL AND regexp_replace\(d\.phone, '\[\^0-9\]', '', 'g'\) = \$3 THEN 1 ELSE 0 END/);
  assert.match(sql, /\) AS match_count/);
  assert.match(sql, /ORDER BY match_count DESC, d\.id DESC/);
  assert.deepEqual(matches, rows);
});

test("each identifier can be supplied independently and missing identifiers stay null", async () => {
  const cases = [
    [{ account_id: "acct_2002" }, ["acct_2002", null, null]],
    [{ email: "BOB@EXAMPLE.COM" }, [null, "bob@example.com", null]],
    [{ phone: "+1 (301) 555-0189" }, [null, null, "13015550189"]],
  ];
  for (const [recipient, values] of cases) {
    const mock = database([{ id: "1", match_count: 1, is_fraud: "1" }]);
    assert.equal((await findReportedRecipients(mock.pool, { recipient })).length, 1);
    assert.deepEqual(mock.calls[0].values, values);
  }
});

test("returns [] for no matching reports, and skips the DB when identifiers are absent", async () => {
  const mock = database();
  assert.deepEqual(await findReportedRecipients(mock.pool, transaction), []);
  assert.equal(mock.calls.length, 1);
  mock.calls.length = 0;
  for (const recipient of [{}, { account_id: "  ", email: null, phone: "" }, { name: "Bob Smith" }]) {
    assert.deepEqual(await findReportedRecipients(mock.pool, { recipient }), []);
  }
  assert.equal(mock.calls.length, 0);
});

test("rejects malformed recipient inputs before querying the DB", async () => {
  const mock = database();
  for (const payload of [null, [], {}, { recipient: null }, { recipient: [] },
    { recipient: { account_id: 2002 } }, { recipient: { email: {} } },
    { recipient: { phone: "not a phone" } }, { recipient: { phone: "301call5550189" } },
    { recipient: { account_id: "x".repeat(2001) } }]) {
    await assert.rejects(findReportedRecipients(mock.pool, payload), RecipientLookupValidationError);
  }
  assert.equal(mock.calls.length, 0);
});

test("SQL-like account IDs are sent as literal parameters", async () => {
  const account = "' OR 1=1; DROP TABLE data; --";
  const mock = database();
  await findReportedRecipients(mock.pool, { recipient: { account_id: account } });
  assert.equal(mock.calls[0].sql.includes(account), false);
  assert.deepEqual(mock.calls[0].values, [account, null, null]);
});

test("database failures reject instead of being mistaken for an empty match list", async () => {
  const failure = Object.assign(new Error("Database unavailable"), { code: "ECONNREFUSED" });
  await assert.rejects(findReportedRecipients(database([], failure).pool, transaction), (error) => error === failure);
});

test("API returns plain report arrays, including [] when there are no matches", async () => {
  for (const rows of [[], [{ id: "9007199254740993", match_count: 2, is_fraud: "1", description: "Earlier report" }]]) {
    const mock = database(rows);
    const response = await post(mock.pool)(request());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), rows);
  }
});

test("API rejects malformed JSON, invalid recipient objects, and wrong content types", async () => {
  const mock = database();
  const handle = post(mock.pool);
  const badJson = new Request("http://localhost/api/reports/check-recipient", { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
  assert.equal((await handle(badJson)).status, 400);
  assert.equal((await handle(request({ recipient: [] }))).status, 400);
  assert.equal((await handle(request({ recipient: { email: [] } }))).status, 400);
  const badType = new Request("http://localhost/api/reports/check-recipient", { method: "POST", body: "{}" });
  assert.equal((await handle(badType)).status, 415);
  assert.equal(mock.calls.length, 0);
});

test("API enforces the request limit even when Content-Length is absent", async () => {
  const mock = database();
  const handle = post(mock.pool);
  const oversized = request({ ...transaction, description: "x".repeat(64 * 1024) });
  assert.equal(oversized.headers.has("content-length"), false);
  assert.equal((await handle(oversized)).status, 413);
  const declaredOversized = request();
  declaredOversized.headers.set("content-length", String(65 * 1024));
  assert.equal((await handle(declaredOversized)).status, 413);
  assert.equal(mock.calls.length, 0);
});

test("API failures return 500, don't expose DB errors, and don't return []", async () => {
  const mock = database([], Object.assign(new Error("Sensitive connection details"), { code: "ECONNREFUSED" }));
  const response = await post(mock.pool)(request());
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(Array.isArray(body), false);
  assert.match(body.error, /could not be checked/);
  assert.equal(JSON.stringify(body).includes("Sensitive"), false);
});
