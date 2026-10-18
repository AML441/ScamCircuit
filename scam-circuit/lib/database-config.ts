/** Preserve pg's current certificate verification without deprecated SSL aliases. */
export function databaseConnectionString(value: string | undefined): string | undefined {
  if (!value) return value;
  let url: URL;
  try { url = new URL(value); } catch { return value; }
  // Preserve non-URL/socket configurations and explicit libpq compatibility.
  if (!["postgres:", "postgresql:"].includes(url.protocol)
    || url.searchParams.getAll("uselibpqcompat").at(-1) === "true") return value;
  const mode = url.searchParams.getAll("sslmode").at(-1);
  if (mode && ["prefer", "require", "verify-ca"].includes(mode)) {
    url.searchParams.set("sslmode", "verify-full");
    return url.href;
  }
  return value;
}
