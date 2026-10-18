import { test } from "node:test";
import assert from "node:assert/strict";
import { BANK_CONTEXT_FIELDS, getDefaultBankContext, getFraudTestInput, buildTransaction, matchedIdentifiers } from "../public/transaction.mjs";
import { createHandler } from "../handler.mjs";

const input = { paymentHandle: "test_handle", email: "test@gmail.com", phone: "+1 (301) 555-0189", amount: "250.00", description: "Concert tickets" };
const now = new Date("2026-10-17T14:32:18Z");
const report = { id: "42", match_count: 2, payment_handle: "test_handle", email: "test@gmail.com", phone: null, description: "An existing report" };
const request = (payload = buildTransaction(input, now)) => new Request("http://localhost:3001/api/check-recipient", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
});

test("displayed inputs become flat recipient fields, while bank context is deterministic", () => {
  const payload = buildTransaction(input, now);
  assert.equal(payload.payment_handle, input.paymentHandle);
  assert.equal(typeof payload.payment_handle, "string");
  assert.equal(payload.email, input.email);
  assert.equal(payload.phone, input.phone);
  assert.equal(payload.transaction_amount, 250);
  assert.equal(payload.payment_method, "Zelle");
  assert.equal(payload.hour_of_day, 10);
  assert.equal(payload.date_occurred, "2026-10-17");
  assert.equal(payload.is_weekend, 1);
  assert.equal(payload.customer_age, 32);
  assert.equal(payload.is_first_transaction, 0);
  assert.equal(payload.prev_transactions, 14);
  assert.equal(payload.store_type, 0);
  assert.equal(payload.timestamp, now.toISOString());
  assert.equal("recipient" in payload, false);
});

test("date, hour and weekend use New York time even across a UTC date boundary", () => {
  const friday = buildTransaction(input, new Date("2026-10-17T01:30:00Z"));
  assert.equal(friday.date_occurred, "2026-10-16");
  assert.equal(friday.hour_of_day, 21);
  assert.equal(friday.is_weekend, 0);
  const midnight = buildTransaction(input, new Date("2026-10-18T04:30:00Z"));
  assert.equal(midnight.date_occurred, "2026-10-18");
  assert.equal(midnight.hour_of_day, 0);
  assert.equal(midnight.is_weekend, 1);
});

test("edited bank context reaches the flat payload with proper numeric and flag types", () => {
  const payload = buildTransaction({ ...input, bankContext: {
    customer_age: "45", prev_transactions: "0", is_first_transaction: "1",
    date_occurred: "2026-10-16", hour_of_day: "0", is_weekend: "1",
    num_items: "3", store_type: "1", velocity_score: "0.75",
    device_type: "mobile", network_quality: "67.9", distance_from_home: "43.37",
    payment_method: "PayPal", app_contact: "Messages", website_url: "google.com", other_contact: "Another contact",
  } }, now);
  assert.equal(payload.customer_age, 45);
  assert.equal(payload.prev_transactions, 0);
  assert.equal(payload.is_first_transaction, 1);
  assert.equal(payload.date_occurred, "2026-10-16");
  assert.equal(payload.hour_of_day, 0);
  assert.equal(payload.is_weekend, 1);
  assert.equal(payload.num_items, 3);
  assert.equal(payload.store_type, 1);
  assert.equal(payload.velocity_score, 0.75);
  assert.equal(payload.device_type, "mobile");
  assert.equal(payload.network_quality, 67.9);
  assert.equal(payload.distance_from_home, 43.37);
  assert.equal(payload.payment_method, "PayPal");
  assert.equal(payload.app_contact, "Messages");
  assert.equal(payload.website_url, "google.com");
  assert.equal(payload.other_contact, "Another contact");
});

test("weekend follows edited dates unless explicitly overridden", () => {
  const weekday = buildTransaction({ ...input, bankContext: { date_occurred: "2026-10-16" } }, now);
  assert.equal(weekday.is_weekend, 0);
  const override = buildTransaction({ ...input, bankContext: { is_weekend: "0" } }, now);
  assert.equal(override.date_occurred, "2026-10-17");
  assert.equal(override.is_weekend, 0);
});

test("blank optional numeric context sends null while automatic timing still works", () => {
  const payload = buildTransaction({ ...input, bankContext: { customer_age: "", prev_transactions: null, velocity_score: " ", is_first_transaction: "", date_occurred: "", hour_of_day: "", is_weekend: "", app_contact: "true" } }, now);
  assert.equal(payload.customer_age, null);
  assert.equal(payload.prev_transactions, null);
  assert.equal(payload.velocity_score, null);
  assert.equal(payload.is_first_transaction, null);
  assert.equal(payload.app_contact, true);
  assert.equal(payload.date_occurred, "2026-10-17");
  assert.equal(payload.hour_of_day, 10);
  assert.equal(payload.is_weekend, 1);
});

test("reset defaults restores original context without overriding recipient or amount fields", () => {
  const defaults = getDefaultBankContext();
  defaults.customer_age = "99";
  assert.equal(getDefaultBankContext().customer_age, 32);
  const reset = buildTransaction({ ...input, bankContext: getDefaultBankContext() }, now);
  assert.deepEqual(reset, buildTransaction(input, now));
  const protectedInputs = buildTransaction({ ...input, bankContext: { payment_handle: "wrong", email: "wrong@example.com", phone: "1234", transaction_amount: 999 } }, now);
  assert.equal(protectedInputs.payment_handle, input.paymentHandle);
  assert.equal(protectedInputs.email, input.email);
  assert.equal(protectedInputs.phone, input.phone);
  assert.equal(protectedInputs.transaction_amount, 250);
  assert.equal(new Set(BANK_CONTEXT_FIELDS.map((field) => field.key)).size, BANK_CONTEXT_FIELDS.length);
});

test("invalid context dates, numbers and binary flags are rejected", () => {
  for (const bankContext of [
    { date_occurred: "2026-02-30" }, { hour_of_day: 24 }, { hour_of_day: 1.5 },
    { is_weekend: 2 }, { is_first_transaction: -1 }, { store_type: 4 },
    { network_quality: 101 }, { customer_age: "NaN" }, { customer_age: -1 },
    { prev_transactions: "not a number" }, { payment_method: "" },
  ]) assert.throws(() => buildTransaction({ ...input, bankContext }, now));
});

test("optional identifiers become null, and leading zeros in handles are preserved", () => {
  const payload = buildTransaction({ ...input, paymentHandle: " 00098 ", phone: "", email: "  " }, now);
  assert.equal(payload.payment_handle, "00098");
  assert.equal(payload.phone, null);
  assert.equal(payload.email, null);
});

test("invalid handles, amounts and destination phones cannot be submitted", () => {
  for (const change of [{ paymentHandle: "" }, { paymentHandle: 98 }, { amount: "" }, { amount: "0" }, { amount: "-1" }, { amount: "NaN" }, { amount: "0.001" }, { amount: "100001" }, { phone: "invalid" }]) {
    assert.throws(() => buildTransaction({ ...input, ...change }, now));
  }
});

test("matching field labels use the same handle, email and phone normalization as the API", () => {
  assert.deepEqual(matchedIdentifiers({ payment_handle: "test_handle ", email: " TEST@GMAIL.COM ", phone: "+13015550189" }, buildTransaction(input, now)), ["Payment handle", "Email", "Phone"]);
  assert.deepEqual(matchedIdentifiers({ payment_handle: "TEST_HANDLE", email: "other@example.com", phone: null }, buildTransaction(input, now)), []);
});

test("the proxy calls only the existing lookup API, forwards metadata and preserves ranked rows", async () => {
  const payload = buildTransaction({ ...input, bankContext: { customer_age: "55", network_quality: "50", is_first_transaction: "1" } }, now);
  const reports = [report, { ...report, id: "43", match_count: 1, email: "other@example.com" }];
  const calls = [];
  const handle = createHandler({ fetchImpl: async (url, options) => {
    calls.push({ url: String(url), options });
    return Response.json(reports);
  } });
  const response = await handle(request(payload));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), reports);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://127.0.0.1:3000/api/reports/check-recipient");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), payload);
});

test("a custom main-app URL is supported without allowing request-controlled proxy destinations", async () => {
  let destination;
  const handle = createHandler({ lookupBaseUrl: "http://localhost:4000", fetchImpl: async (url) => { destination = String(url); return Response.json([]); } });
  const response = await handle(request({ ...buildTransaction(input, now), lookup_url: "http://other.invalid" }));
  assert.equal(response.status, 200);
  assert.equal(destination, "http://localhost:4000/api/reports/check-recipient");
});

test("only a successful empty report array represents no matches", async () => {
  const response = await createHandler({ fetchImpl: async () => Response.json([]) })(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
});

test("database failures and unreachable lookup services are not reported as no matches", async () => {
  const failure = await createHandler({ fetchImpl: async () => Response.json({ error: "Previous reports could not be checked." }, { status: 500 }) })(request());
  assert.equal(failure.status, 500);
  assert.match((await failure.json()).error, /could not be checked/);
  const unreachable = await createHandler({ fetchImpl: async () => { throw new Error("Connection refused"); } })(request());
  assert.equal(unreachable.status, 502);
  assert.equal(Array.isArray(await unreachable.json()), false);
});

test("unexpected or unreadable lookup responses fail instead of showing a clear result", async () => {
  for (const reply of [Response.json({}), Response.json([{}]), Response.json([{ match_count: 0 }]), new Response("<html>Error</html>")]) {
    const response = await createHandler({ fetchImpl: async () => reply })(request());
    assert.equal(response.status, 502);
    assert.equal(Array.isArray(await response.json()), false);
  }
});

test("bad input is rejected before any upstream lookup", async () => {
  let called = false;
  const handle = createHandler({ fetchImpl: async () => { called = true; return Response.json([]); } });
  assert.equal((await handle(request({ payment_handle: 98 }))).status, 400);
  const malformed = new Request("http://localhost:3001/api/check-recipient", { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
  assert.equal((await handle(malformed)).status, 400);
  const oversized = request({ ...buildTransaction(input, now), description: "x".repeat(64 * 1024) });
  assert.equal((await handle(oversized)).status, 413);
  const badType = new Request("http://localhost:3001/api/check-recipient", { method: "POST", body: "{}" });
  assert.equal((await handle(badType)).status, 415);
  assert.equal((await handle(new Request("http://localhost:3001/api/check-recipient"))).status, 405);
  assert.equal(called, false);
});

test("static assets are served without exposing server source or arbitrary files", async () => {
  const handle = createHandler({ fetchImpl: async () => { throw new Error("No API request expected"); } });
  for (const pathname of ["/", "/styles.css", "/app.mjs", "/transaction.mjs"]) {
    const response = await handle(new Request(`http://localhost:3001${pathname}`));
    assert.equal(response.status, 200);
    assert.ok((await response.text()).length > 100);
  }
  for (const pathname of ["/server.mjs", "/.env", "/package.json", "/../handler.mjs"]) {
    assert.equal((await handle(new Request(`http://localhost:3001${pathname}`))).status, 404);
  }
  const head = await handle(new Request("http://localhost:3001/", { method: "HEAD" }));
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
});

test("transaction checks forward the full payload and preserve report and model decisions", async () => {
  const payload = buildTransaction(input, now);
  for (const result of [
    { source: "reports", decision: "blocked", reports: [report], prediction: null },
    ...[true, false].map((is_fraud) => ({ source: "model", decision: is_fraud ? "blocked" : "allowed", reports: [], prediction: { is_fraud, fraud_probability: is_fraud ? 0.95 : 0.1, top_factors: { velocity_score: 1.2 } } })),
  ]) {
    const handle = createHandler({ fetchImpl: async (url, options) => {
      assert.equal(String(url), "http://127.0.0.1:3000/api/transactions/check");
      assert.deepEqual(JSON.parse(options.body), payload);
      return Response.json(result);
    } });
    const response = await handle(new Request("http://localhost:3001/api/check-transaction", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }));
    assert.equal(response.status, 200);
    const body = await response.json();
    if (result.source === "reports") {
      const url = new URL(body.investigation_url);
      assert.equal(url.origin, "http://127.0.0.1:3000");
      assert.equal(url.pathname, "/search");
      assert.equal(url.searchParams.get("mode"), "recipient");
      for (const field of ["payment_handle", "email", "phone"]) assert.equal(url.searchParams.get(field), payload[field]);
      delete body.investigation_url;
    } else assert.equal(body.investigation_url, undefined);
    assert.deepEqual(body, result);
  }
});

test("investigation links use the configured browser URL and encode recipient values without forwarding transaction metadata", async () => {
  const payload = buildTransaction({ ...input, paymentHandle: "$alice&email=wrong", email: "Name+tag@example.com", phone: "" }, now);
  const handle = createHandler({ lookupBaseUrl: "http://internal.invalid", webBaseUrl: "https://reports.example.com", fetchImpl: async () => Response.json({
    source: "reports", decision: "blocked", reports: [report], prediction: null, investigation_url: "https://wrong.invalid",
  }) });
  const response = await handle(new Request("http://localhost:3001/api/check-transaction", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, webBaseUrl: "https://wrong.invalid" }) }));
  const url = new URL((await response.json()).investigation_url);
  assert.equal(url.origin, "https://reports.example.com");
  assert.equal(url.searchParams.get("payment_handle"), payload.payment_handle);
  assert.equal(url.searchParams.get("email"), payload.email);
  assert.equal(url.searchParams.has("phone"), false);
  assert.equal(url.searchParams.has("transaction_amount"), false);
});

test("contradictory, missing or malformed model decisions never complete a payment", async () => {
  for (const result of [[], {}, { source: "model", decision: "allowed", reports: [], prediction: null },
    { source: "model", decision: "allowed", reports: [], prediction: { is_fraud: true, fraud_probability: 0.95, top_factors: {} } },
    { source: "reports", decision: "allowed", reports: [report], prediction: null },
  ]) {
    const handle = createHandler({ fetchImpl: async () => Response.json(result) });
    const response = await handle(new Request("http://localhost:3001/api/check-transaction", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildTransaction(input, now)) }));
    assert.equal(response.status, 502);
  }
});


test("fraud preset preserves all twelve supplied model values and uses a fixed demo recipient", () => {
  const input = getFraudTestInput();
  const payload = buildTransaction(input, now);
  const expected = {
    transaction_amount: null, hour_of_day: 1, is_weekend: 1,
    num_items: 2, customer_age: 20, prev_transactions: 2,
    distance_from_home: 43.37, device_type: 2, network_quality: 67.9,
    is_first_transaction: 1, store_type: 1, velocity_score: null,
  };
  for (const [field, value] of Object.entries(expected)) assert.equal(payload[field], value, field);
  assert.equal("is_fraud" in payload, false);
  assert.equal(input.paymentHandle, "fraud_demo");
  assert.equal(input.email, "fraud_demo@example.invalid");
  assert.equal(payload.phone, null);
  input.bankContext.customer_age = 99;
  assert.equal(getFraudTestInput().bankContext.customer_age, 20);
});


test("unknown amount is explicit and becomes JSON null without accepting invalid normal amounts", () => {
  assert.equal(buildTransaction({ ...input, amount: "", amountUnknown: true }, now).transaction_amount, null);
  assert.equal(JSON.parse(JSON.stringify(buildTransaction(getFraudTestInput(), now))).velocity_score, null);
  assert.throws(() => buildTransaction({ ...input, amount: "", amountUnknown: false }, now));
  assert.throws(() => buildTransaction({ ...input, amount: "", amountUnknown: "true" }, now));
});
