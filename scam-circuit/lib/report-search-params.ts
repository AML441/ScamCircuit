import { getRecipientIdentifiers, type RecipientIdentifiers } from "./find-reported-recipients";

export const searchFields = [
  { value: "all", label: "All fields" },
  { value: "payment_method", label: "Payment method" },
  { value: "payment_handle", label: "Payment handle" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "website_url", label: "Website" },
  { value: "username", label: "Messaging app / username" },
  { value: "description", label: "Description" },
  { value: "other_contact", label: "Other contact" },
] as const;

export type SearchField = typeof searchFields[number]["value"];
export interface ReportSearch {
  mode: "keyword" | "recipient";
  q: string;
  field: SearchField;
  page: number;
  identifiers: RecipientIdentifiers;
}

export class SearchValidationError extends Error {}

export function parseReportSearch(params: URLSearchParams): ReportSearch {
  const mode = params.get("mode") || "keyword";
  if (mode !== "keyword" && mode !== "recipient") throw new SearchValidationError("Choose keyword or recipient search.");
  const field = params.get("field") || "all";
  if (!searchFields.some((option) => option.value === field)) throw new SearchValidationError("Choose a supported search field.");
  const q = (params.get("q") || "").trim();
  if (q.length > 2000) throw new SearchValidationError("Search terms must be at most 2,000 characters.");
  const rawPage = params.get("page") || "1";
  const page = Number(rawPage);
  if (!/^\d+$/.test(rawPage) || !Number.isSafeInteger(page) || page < 1) throw new SearchValidationError("Page must be a positive whole number.");
  const identifiers = getRecipientIdentifiers(mode === "recipient" ? {
    payment_handle: params.get("payment_handle"), email: params.get("email"), phone: params.get("phone"),
  } : {});
  if (mode === "recipient" && !Object.values(identifiers).some(Boolean)) throw new SearchValidationError("Provide a payment handle, email, or phone to match a recipient.");
  return { mode, q, field: field as SearchField, page, identifiers };
}

export function searchUrl(search: ReportSearch, page = search.page): string {
  const params = new URLSearchParams();
  if (search.mode === "recipient") {
    params.set("mode", "recipient");
    for (const [key, value] of Object.entries({ payment_handle: search.identifiers.paymentHandle, email: search.identifiers.email, phone: search.identifiers.phone })) {
      if (value) params.set(key, value);
    }
  } else {
    if (search.q) params.set("q", search.q);
    if (search.field !== "all") params.set("field", search.field);
  }
  if (page > 1) params.set("page", String(page));
  return `/search${params.size ? `?${params}` : ""}`;
}

export function safeSearchBack(value: string | string[] | undefined): string {
  if (typeof value !== "string" || !value.startsWith("/search")) return "/search";
  try {
    const url = new URL(value, "https://scamcircuit.invalid");
    if (url.origin !== "https://scamcircuit.invalid" || url.pathname !== "/search") return "/search";
    return searchUrl(parseReportSearch(url.searchParams));
  } catch { return "/search"; }
}
