import { contactOptions, messagingPlatforms, paymentApps } from "./report-options";

export const MAX_FILES = 10;
export const MAX_TOTAL_FILE_BYTES = 20 * 1024 * 1024;
// Leave room for multipart headers and the report JSON.
export const MAX_REQUEST_BYTES = MAX_TOTAL_FILE_BYTES + 1024 * 1024;

export interface ValidReport {
  contactMethods: string[];
  contactMethodDetails: Record<string, string>;
  messagingPlatforms: string[];
  messagingUsernames: Record<string, string[]>;
  otherMessagingPlatform: string;
  paymentMethod: string;
  paymentApp: string;
  otherPaymentApp: string;
  otherPaymentMethod: string;
  paymentHandle: string | null;
  amountLost: number | null;
  incidentDate: string;
  isWeekend: number;
  narrative: string;
}

type ValidationResult = { ok: true; report: ValidReport } | { ok: false; error: string };

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseUsernames(value: string): string[] {
  return [...new Set(value.split(",").map((username) => username.trim()).filter(Boolean))];
}

function selection(value: unknown, options: { value: string }[]): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !options.some((option) => option.value === item))) return null;
  return [...new Set(value)] as string[];
}

export function validateReport(input: unknown): ValidationResult {
  const data = record(input);
  const fail = (error: string): ValidationResult => ({ ok: false, error });
  const contactMethods = selection(data.contactMethods, contactOptions);
  if (!contactMethods?.length) return fail("Select at least one contact method.");

  const rawDetails = record(data.contactMethodDetails);
  const contactMethodDetails: Record<string, string> = {};
  for (const method of contactMethods) {
    if (method === "social-messaging") continue;
    const detail = text(rawDetails[method]);
    if (!detail || detail.length > 2000) return fail(`Provide contact details (up to 2,000 characters) for ${contactOptions.find((option) => option.value === method)?.label}.`);
    contactMethodDetails[method] = detail;
  }

  const usesApps = contactMethods.includes("social-messaging");
  const platforms = usesApps ? selection(data.messagingPlatforms, messagingPlatforms) : [];
  if (!platforms || (usesApps && !platforms.length)) return fail("Select at least one social media or messaging platform.");
  const otherMessagingPlatform = platforms.includes("other") ? text(data.otherMessagingPlatform) : "";
  if (platforms.includes("other") && (!otherMessagingPlatform || otherMessagingPlatform.length > 200)) return fail("Specify the other platform or app (up to 200 characters).");
  const rawUsernames = record(data.messagingUsernames);
  const messagingUsernames: Record<string, string[]> = {};
  for (const platform of platforms) {
    const raw = text(rawUsernames[platform]);
    const usernames = parseUsernames(raw);
    if (!raw || raw.length > 2000 || !usernames.length || usernames.length > 50 || usernames.some((username) => username.length > 200)) {
      const name = platform === "other" ? otherMessagingPlatform : messagingPlatforms.find((option) => option.value === platform)?.label;
      return fail(`Enter usernames or account identifiers for ${name}, separated by commas (up to 50 entries, 200 characters each and 2,000 total).`);
    }
    messagingUsernames[platform] = usernames;
  }

  const paymentMethod = text(data.paymentMethod);
  if (!["bank-transfer", "payment-app", "credit-card", "debit-card", "crypto", "gift-card", "cash-check", "other"].includes(paymentMethod)) return fail("Select a payment method.");
  const paymentApp = paymentMethod === "payment-app" ? text(data.paymentApp) : "";
  if (paymentMethod === "payment-app" && !paymentApps.some((app) => app.value === paymentApp)) return fail("Select a payment app.");
  const otherPaymentApp = paymentApp === "other" ? text(data.otherPaymentApp) : "";
  if (paymentApp === "other" && (!otherPaymentApp || otherPaymentApp.length > 200)) return fail("Specify the other payment app (up to 200 characters).");
  const otherPaymentMethod = paymentMethod === "other" ? text(data.otherPaymentMethod) : "";
  if (paymentMethod === "other" && (!otherPaymentMethod || otherPaymentMethod.length > 200)) return fail("Specify the other payment method (up to 200 characters).");

  const paymentHandle = text(data.paymentHandle) || null;
  if (paymentHandle && paymentHandle.length > 2000) return fail("Payment handle must be at most 2,000 characters.");
  if (data.paymentHandle != null && typeof data.paymentHandle !== "string") return fail("Payment handle must be text.");

  let amountLost: number | null = null;
  if (data.amountLost != null && data.amountLost !== "") {
    if (typeof data.amountLost !== "string" || !/^\d+(\.\d{1,2})?$/.test(data.amountLost)) return fail("Enter a nonnegative amount with at most two decimal places, or leave it blank.");
    amountLost = Number(data.amountLost);
    if (!Number.isFinite(amountLost) || amountLost > Number.MAX_SAFE_INTEGER / 100) return fail("The amount entered is too large.");
  }

  const incidentDate = text(data.incidentDate);
  const date = new Date(`${incidentDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(incidentDate) || incidentDate.startsWith("0000") || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== incidentDate) return fail("Enter a valid incident date.");
  const narrative = text(data.narrative);
  if (!narrative || narrative.length > 20000) return fail("Describe what happened (up to 20,000 characters).");
  if (data.accuracyConfirmed !== true || data.privacyAcknowledged !== true) return fail("Both confirmations are required before submitting.");

  return { ok: true, report: {
    contactMethods, contactMethodDetails, messagingPlatforms: platforms, messagingUsernames,
    otherMessagingPlatform, paymentMethod, paymentApp, otherPaymentApp,
    otherPaymentMethod, paymentHandle, amountLost, incidentDate,
    isWeekend: [0, 6].includes(date.getUTCDay()) ? 1.0 : 0.0, narrative,
  } };
}

export function validateEvidence(files: File[]): string | null {
  if (files.length > MAX_FILES) return `Upload at most ${MAX_FILES} files.`;
  if (files.some((file) => !file.size)) return "Empty files cannot be uploaded.";
  if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_FILE_BYTES) return "Attachments must total 20 MB or less.";
  if (files.some((file) => file.name.length > 255 || file.type.length > 255)) return "An attachment filename or type is too long.";
  return null;
}
