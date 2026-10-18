export const BANK_TIME_ZONE = "America/New_York";

export const BANK_CONTEXT_FIELDS = [
  { key: "customer_age", label: "Customer age", group: "customer", type: "number", defaultValue: 32, min: 0, max: 120, step: 1 },
  { key: "prev_transactions", label: "Previous transactions", group: "customer", type: "number", defaultValue: 14, min: 0, step: 1 },
  { key: "is_first_transaction", label: "First transaction", group: "customer", type: "select", defaultValue: 0, options: [["0", "No · 0"], ["1", "Yes · 1"], ["", "Not provided"]] },
  { key: "date_occurred", label: "Date occurred", group: "timing", type: "date", defaultValue: "" },
  { key: "hour_of_day", label: "Hour of day (0–23)", group: "timing", type: "number", defaultValue: "", min: 0, max: 23, step: 1, placeholder: "Auto · current hour" },
  { key: "is_weekend", label: "Weekend", group: "timing", type: "select", defaultValue: "", options: [["", "Auto · from date"], ["0", "No · 0"], ["1", "Yes · 1"]] },
  { key: "num_items", label: "Number of items", group: "timing", type: "number", defaultValue: 1, min: 0, step: 1 },
  { key: "store_type", label: "Store type", group: "timing", type: "select", defaultValue: 0, options: [["0", "Online · 0"], ["1", "In person · 1"], ["", "Not provided"]] },
  { key: "velocity_score", label: "Velocity score", group: "timing", type: "number", defaultValue: 0.18, min: 0, step: "any" },
  { key: "device_type", label: "Device type", group: "device", type: "text", defaultValue: "2", placeholder: "Code or device name" },
  { key: "network_quality", label: "Network quality (0–100)", group: "device", type: "number", defaultValue: 94, min: 0, max: 100, step: "any" },
  { key: "distance_from_home", label: "Distance from home", group: "device", type: "number", defaultValue: 0, min: 0, step: "any" },
  { key: "payment_method", label: "Payment method", group: "other", type: "text", defaultValue: "Zelle", required: true },
  { key: "app_contact", label: "App contact", group: "other", type: "text", defaultValue: "false", placeholder: "true, false, or app name" },
  { key: "website_url", label: "Website URL", group: "other", type: "text", defaultValue: "", placeholder: "Optional" },
  { key: "other_contact", label: "Other contact", group: "other", type: "text", defaultValue: "", placeholder: "Optional" },
];

export function getDefaultBankContext() {
  return Object.fromEntries(BANK_CONTEXT_FIELDS.map((field) => [field.key, field.defaultValue]));
}

export function getFraudTestInput(recipientId) {
  return {
    paymentHandle: `fraud_demo_${recipientId}`,
    email: `fraud_demo_${recipientId}@example.invalid`,
    phone: "",
    amount: "",
    amountUnknown: true,
    description: "Fraud model test",
    bankContext: {
      ...getDefaultBankContext(),
      hour_of_day: 1,
      is_weekend: 1,
      num_items: 2,
      customer_age: 20,
      prev_transactions: 2,
      distance_from_home: 43.37,
      device_type: 2,
      network_quality: 67.9,
      is_first_transaction: 1,
      store_type: 1,
      velocity_score: "",
      website_url: "google.com",
      app_contact: "Messages",
    },
  };
}

function contextNumber(value, field) {
  if (typeof value === "string") value = value.trim();
  if (value == null || value === "") return null;
  if (!["number", "string"].includes(typeof value)) throw new Error(`${field.label} must be a number.`);
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) > Number.MAX_SAFE_INTEGER || (field.step === 1 && !Number.isInteger(number))) throw new Error(`${field.label} must be a valid ${field.step === 1 ? "whole " : ""}number.`);
  if (field.min != null && number < field.min) throw new Error(`${field.label} must be at least ${field.min}.`);
  if (field.max != null && number > field.max) throw new Error(`${field.label} must be at most ${field.max}.`);
  return number;
}

function buildBankContext(overrides, parts) {
  if (overrides != null && (typeof overrides !== "object" || Array.isArray(overrides))) throw new Error("Bank context must be an object.");
  const values = { ...getDefaultBankContext(), ...overrides };
  const dateOccurred = values.date_occurred || `${parts.year}-${parts.month}-${parts.day}`;
  const date = new Date(`${dateOccurred}T00:00:00Z`);
  if (typeof dateOccurred !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateOccurred) || dateOccurred.startsWith("0000") || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dateOccurred) throw new Error("Enter a valid date occurred.");
  const result = {};
  for (const field of BANK_CONTEXT_FIELDS) {
    const value = values[field.key];
    if (field.key === "date_occurred") result.date_occurred = dateOccurred;
    else if (field.key === "hour_of_day") result.hour_of_day = value == null || value === "" ? Number(parts.hour) : contextNumber(value, field);
    else if (field.key === "is_weekend") result.is_weekend = value == null || value === "" ? ([0, 6].includes(date.getUTCDay()) ? 1 : 0) : contextNumber(value, { ...field, min: 0, max: 1, step: 1 });
    else if (field.type === "number") result[field.key] = contextNumber(value, field);
    else if (field.type === "select") result[field.key] = contextNumber(value, { ...field, min: 0, max: 1, step: 1 });
    else {
      if (value != null && !["string", "number", "boolean"].includes(typeof value)) throw new Error(`${field.label} must be text.`);
      const text = value == null ? "" : String(value).trim();
      if (field.required && !text) throw new Error(`${field.label} is required.`);
      if (text.length > 2000) throw new Error(`${field.label} must be at most 2,000 characters.`);
      if (field.key === "device_type" && text && /^\d+(\.\d+)?$/.test(text)) result[field.key] = contextNumber(text, { ...field, min: 0 });
      else if (field.key === "app_contact" && ["true", "false"].includes(text.toLowerCase())) result[field.key] = text.toLowerCase() === "true";
      else result[field.key] = text || null;
    }
  }
  return result;
}

export function buildTransaction(input, now = new Date()) {
  if (typeof input.paymentHandle !== "string") throw new Error("Enter the recipient’s payment handle as text.");
  const paymentHandle = input.paymentHandle.trim();
  if (!paymentHandle || paymentHandle.length > 2000) throw new Error("Enter the recipient’s payment handle or account ID.");
  const amountText = String(input.amount ?? "").trim();
  const amount = input.amountUnknown === true ? null : Number(amountText);
  if (amount !== null && (!/^\d+(\.\d+)?$/.test(amountText) || !Number.isFinite(amount) || amount < 0.01 || amount > 100000)) {
    throw new Error("Enter an amount between $0.01 and $100,000.");
  }
  const email = String(input.email ?? "").trim() || null;
  const phone = String(input.phone ?? "").trim() || null;
  if (email && email.length > 2000) throw new Error("The recipient email is too long.");
  if (phone && (!/^\+?[0-9\s().-]+$/.test(phone) || phone.replace(/[^0-9]/g, "").length > 15)) {
    throw new Error("Enter a valid destination phone number, including its country code if known.");
  }
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: BANK_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  const bankContext = buildBankContext(input.bankContext, parts);

  return {
    transaction_id: `sim_${now.getTime()}`,
    timestamp: now.toISOString(),
    transaction_amount: amount,
    currency: "USD",
    ...bankContext,
    id: null,
    payment_handle: paymentHandle,
    email,
    phone,
    description: String(input.description ?? "").trim() || "Concert tickets",
  };
}

export function matchedIdentifiers(report, payload) {
  const matches = [];
  if (typeof report.payment_handle === "string" && report.payment_handle.trim() === payload.payment_handle) matches.push("Payment handle");
  if (payload.email && typeof report.email === "string" && report.email.trim().toLowerCase() === payload.email.toLowerCase()) matches.push("Email");
  if (payload.phone && typeof report.phone === "string" && report.phone.replace(/[^0-9]/g, "") === payload.phone.replace(/[^0-9]/g, "")) matches.push("Phone");
  return matches;
}

// Validate the decision as well as its evidence before displaying a completed payment.
export function validateTransactionCheck(result) {
  if (!result || typeof result !== "object" || !Array.isArray(result.reports)) return false;
  if (result.source === "reports") {
    return result.decision === "blocked" && result.prediction === null && result.reports.length > 0
      && result.reports.every((row) => row && Number.isInteger(row.match_count) && row.match_count >= 1 && row.match_count <= 3);
  }
  const prediction = result.prediction;
  return result.source === "model" && result.reports.length === 0 && prediction
    && typeof prediction.is_fraud === "boolean"
    && Number.isFinite(prediction.fraud_probability) && prediction.fraud_probability >= 0 && prediction.fraud_probability <= 1
    && prediction.top_factors && typeof prediction.top_factors === "object" && !Array.isArray(prediction.top_factors)
    && Object.values(prediction.top_factors).every((value) => typeof value === "number" && Number.isFinite(value))
    && result.decision === (prediction.is_fraud ? "blocked" : "allowed");
}
