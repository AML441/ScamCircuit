import { paymentApps } from "./report-options";

export function formatAmount(value: number | null): string {
  return value == null || !Number.isFinite(value) ? "Not provided" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

export function formatDate(value: string | null): string {
  if (!value) return "Not provided";
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "Not provided" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function formatPayment(value: string | null): string {
  const name = value?.replace(/^\s*payment-app:\s*/i, "").trim();
  if (!name) return "Not provided";
  if (/^other:\s*/i.test(name)) return `Other: ${name.replace(/^other:\s*/i, "")}`;
  const key = name.replace(/[-_]+/g, " ").replace(/\s+/g, " ").toLowerCase();
  const labels: Record<string, string> = {
    "bank transfer": "Bank Transfer", "payment app": "Payment App",
    "credit card": "Credit Card", "debit card": "Debit Card",
    crypto: "Cryptocurrency", cryptocurrency: "Cryptocurrency",
    "gift card": "Gift Card", "cash check": "Cash or Check",
  };
  const app = paymentApps.find((app) => app.value.replaceAll("-", " ") === key || app.label.toLowerCase() === key);
  return app?.label || (Object.hasOwn(labels, key) ? labels[key] : "") || name.replace(/[-_]+/g, " ").replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

export function formatBytes(value: string): string {
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return "Size unavailable";
  return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
