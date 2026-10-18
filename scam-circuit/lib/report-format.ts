export function formatAmount(value: number | null): string {
  return value == null || !Number.isFinite(value) ? "Not provided" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

export function formatDate(value: string | null): string {
  if (!value) return "Not provided";
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "Not provided" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function formatPayment(value: string | null): string {
  if (!value) return "Not provided";
  return value.replace(/^payment-app:\s*/i, "").replaceAll("-", " ");
}

export function formatBytes(value: string): string {
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return "Size unavailable";
  return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
