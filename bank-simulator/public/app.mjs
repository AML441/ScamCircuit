import { BANK_CONTEXT_FIELDS, getDefaultBankContext, getFraudTestInput, buildTransaction, matchedIdentifiers, validateTransactionCheck } from "/transaction.mjs";

const byId = (id) => document.getElementById(id);
const form = byId("payment-form");
const fields = byId("payment-fields");
const contextFields = byId("bank-context-fields");
const resultPanel = byId("lookup-result");
const amountFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
let busy = false;
let submittedPayload = null;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = String(text);
  return node;
}

function readInput() {
  return {
    paymentHandle: byId("payment-handle").value,
    email: byId("recipient-email").value,
    phone: byId("recipient-phone").value,
    amount: byId("payment-amount").value,
    amountUnknown: byId("amount-unknown").checked,
    description: byId("payment-description").value,
    bankContext: Object.fromEntries(BANK_CONTEXT_FIELDS.map((field) => [field.key, byId(`context-${field.key}`).value])),
  };
}

function setProgress(step) {
  for (const item of document.querySelectorAll("#flow-list li")) {
    const number = Number(item.dataset.step);
    item.classList.toggle("active", number === step);
    item.classList.toggle("complete", number < step);
    if (number === step) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  }
}

function renderPayload(payload, sent = false) {
  byId("payload-json").textContent = JSON.stringify(payload, null, 2);
  byId("context-time-summary").textContent = `${payload.date_occurred} · Hour ${payload.hour_of_day} · Weekend ${payload.is_weekend} · America/New_York`;
  byId("payment-method-summary").textContent = payload.payment_method;
  byId("payment-method-badge").textContent = payload.payment_method;
  byId("payload-caption").textContent = sent ? "Submitted transaction · identifiers match the fields on the left" : "Live preview · includes your bank context edits";
}

function refreshPreview() {
  const input = readInput();
  const amount = Number(input.amount);
  byId("total-amount").textContent = input.amountUnknown ? "Unknown" : Number.isFinite(amount) && amount >= 0 ? amountFormatter.format(amount) : "—";
  try {
    renderPayload(submittedPayload || buildTransaction(input), Boolean(submittedPayload));
  } catch (error) {
    byId("payload-json").textContent = error.message;
    byId("context-time-summary").textContent = "Complete valid payment and context values to update the preview.";
  }
}

function clearResult() {
  submittedPayload = null;
  resultPanel.hidden = true;
  byId("form-error").hidden = true;
  byId("match-list").replaceChildren();
  byId("response-json").textContent = "";
  byId("response-details").open = false;
  byId("submit-label").textContent = "Make payment";
  setProgress(1);
}

function renderResult(state, payload, reports = [], errorMessage = "", check = null) {
  resultPanel.className = `result-panel ${state}`;
  resultPanel.hidden = false;
  byId("result-count").hidden = state !== "flagged" || check?.source === "model";
  byId("response-details").hidden = state === "error";
  byId("match-list").replaceChildren();
  byId("result-icon").setAttribute("href", state === "clear" ? "#i-check" : state === "error" ? "#i-info" : "#i-warning");
  byId("result-eyebrow").textContent = state === "flagged" ? "PAYMENT FLAGGED" : state === "clear" ? "PAYMENT COMPLETED" : "CHECK UNAVAILABLE";
  if (state === "flagged" && check?.source === "model") {
    byId("result-title").textContent = "Our model predicted fraud";
    byId("result-description").textContent = `No prior fraud reports matched this recipient. Our fraud model predicted this transaction was fraudulent, so the simulated payment is paused. Model fraud probability: ${(check.prediction.fraud_probability * 100).toFixed(1)}%.`;
    for (const [factor, contribution] of Object.entries(check.prediction.top_factors)) {
      const card = element("article", "match-report");
      card.append(element("strong", "", factor.replaceAll("_", " ")), element("p", "", `${contribution > 0 ? "Increased" : contribution < 0 ? "Decreased" : "Did not change"} the model's fraud score.`));
      byId("match-list").append(card);
    }
  } else if (state === "flagged") {
    byId("result-title").textContent = "Prior fraud reports found";
    byId("result-count").textContent = String(reports.length);
    byId("result-description").textContent = `${reports.length} existing ${reports.length === 1 ? "report matches" : "reports match"} this recipient’s details. The simulated payment is paused. Review the matches below, ordered by the number of matching identifiers.`;
    const identifierCount = [payload.payment_handle, payload.email, payload.phone].filter(Boolean).length;
    for (const report of reports) {
      const card = element("article", "match-report");
      const heading = element("div", "match-report-heading");
      heading.append(element("strong", "", `Report #${report.id ?? "—"}`), element("span", "match-score", `${report.match_count} of ${identifierCount} identifiers`));
      const identifiers = element("div", "match-identifiers");
      for (const label of matchedIdentifiers(report, payload)) identifiers.append(element("span", "", `${label} matched`));
      card.append(heading, identifiers);
      if (typeof report.description === "string" && report.description) card.append(element("p", "", report.description.length > 240 ? `${report.description.slice(0, 240)}…` : report.description));
      byId("match-list").append(card);
    }
  } else if (state === "clear") {
    byId("result-title").textContent = "Payment completed";
    byId("result-description").textContent = `Your simulated ${payload.transaction_amount === null ? "" : `${amountFormatter.format(payload.transaction_amount)} `}${payload.payment_method} payment to ${payload.payment_handle} went through. No matching reports were found, and the fraud model did not flag this transaction.\n\nThis is a demo confirmation; no real money was moved. An empty result does not independently verify the recipient.`;
  } else {
    byId("result-title").textContent = "We couldn’t check this recipient";
    byId("result-description").textContent = `${errorMessage}\n\nThe simulated payment was not completed. You can retry the check.`;
  }
  byId("response-json").textContent = JSON.stringify(check || reports, null, 2);
  setProgress(state === "error" ? 2 : 3);
  byId("submit-label").textContent = "Check again";
  resultPanel.focus({ preventScroll: true });
  resultPanel.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" });
}

function inputChanged() {
  if (busy) return;
  byId("payment-amount").disabled = byId("amount-unknown").checked;
  byId("payment-amount").required = !byId("amount-unknown").checked;
  clearResult();
  refreshPreview();
}

form.addEventListener("input", inputChanged);
contextFields.addEventListener("input", inputChanged);

function initializeContext() {
  for (const field of BANK_CONTEXT_FIELDS) {
    const wrapper = element("div", "context-field");
    const label = element("label", "", field.label);
    label.htmlFor = `context-${field.key}`;
    const control = element(field.type === "select" ? "select" : "input", "context-control");
    control.id = `context-${field.key}`;
    control.name = field.key;
    control.setAttribute("form", "payment-form");
    if (field.type === "select") {
      for (const [value, text] of field.options) {
        const option = element("option", "", text);
        option.value = value;
        control.append(option);
      }
    } else {
      control.type = field.type;
      if (field.min != null) control.min = String(field.min);
      if (field.max != null) control.max = String(field.max);
      if (field.step != null) control.step = String(field.step);
      if (field.placeholder) control.placeholder = field.placeholder;
      if (field.type === "text") control.maxLength = 2000;
    }
    control.required = Boolean(field.required);
    control.value = String(field.defaultValue);
    control.addEventListener("invalid", () => { control.closest("details").open = true; });
    wrapper.append(label, control);
    byId(`context-${field.group}`).append(wrapper);
  }
}

byId("reset-context").addEventListener("click", () => {
  const defaults = getDefaultBankContext();
  for (const field of BANK_CONTEXT_FIELDS) byId(`context-${field.key}`).value = String(defaults[field.key]);
  inputChanged();
});

byId("load-test").addEventListener("click", () => {
  byId("payment-handle").value = "test_handle";
  byId("recipient-email").value = "test@gmail.com";
  byId("recipient-phone").value = "";
  clearResult();
  refreshPreview();
});

byId("load-new").addEventListener("click", () => {
  const unique = crypto.randomUUID().slice(0, 8);
  byId("payment-handle").value = `new_demo_${unique}`;
  byId("recipient-email").value = `new_demo_${unique}@example.invalid`;
  byId("recipient-phone").value = "";
  clearResult();
  refreshPreview();
});

byId("load-fraud").addEventListener("click", () => {
  const input = getFraudTestInput(crypto.randomUUID());
  byId("payment-handle").value = input.paymentHandle;
  byId("recipient-email").value = input.email;
  byId("recipient-phone").value = input.phone;
  byId("payment-amount").value = input.amount;
  byId("amount-unknown").checked = input.amountUnknown;
  byId("payment-description").value = input.description;
  for (const field of BANK_CONTEXT_FIELDS) byId(`context-${field.key}`).value = String(input.bankContext[field.key]);
  inputChanged();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy) return;
  let payload;
  try { payload = buildTransaction(readInput()); } catch (error) {
    byId("form-error").textContent = error.message;
    byId("form-error").hidden = false;
    byId("form-error").setAttribute("tabindex", "-1");
    byId("form-error").focus();
    return;
  }
  clearResult();
  submittedPayload = payload;
  renderPayload(payload, true);
  busy = true;
  fields.disabled = true;
  contextFields.disabled = true;
  byId("reset-context").disabled = true;
  form.setAttribute("aria-busy", "true");
  byId("submit-label").textContent = "Checking reports and fraud risk…";
  byId("submit-arrow").toggleAttribute("hidden", true);
  byId("submit-spinner").hidden = false;
  setProgress(2);
  try {
    const response = await fetch("/api/check-transaction", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(30000),
    });
    let reports;
    try { reports = await response.json(); } catch { throw new Error("The simulator received an unreadable response. Check that both local servers are running."); }
    if (!response.ok) throw new Error(reports.error || "The recipient lookup failed. Please try again.");
    if (!validateTransactionCheck(reports)) throw new Error("The transaction check returned an unexpected result.");
    renderResult(reports.decision === "blocked" ? "flagged" : "clear", payload, reports.reports, "", reports);
  } catch (error) {
    renderResult("error", payload, [], error.name === "TimeoutError" ? "The recipient lookup timed out. Please try again." : error.message);
  } finally {
    busy = false;
    fields.disabled = false;
    contextFields.disabled = false;
    byId("reset-context").disabled = false;
    form.setAttribute("aria-busy", "false");
    byId("submit-arrow").toggleAttribute("hidden", false);
    byId("submit-spinner").hidden = true;
  }
});

window.addEventListener("focus", () => { if (!busy) refreshPreview(); });
initializeContext();
setProgress(1);
refreshPreview();
