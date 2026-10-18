import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "../components/NavBar";
import ReportSearchTabs from "../components/ReportSearchTabs";
import { db } from "@/lib/db";
import { parseReportSearch, searchFields, searchUrl, type ReportSearch } from "@/lib/report-search-params";
import { PAGE_SIZE, searchReports, type ReportSearchResults } from "@/lib/search-reports";
import { formatAmount, formatDate, formatPayment } from "@/lib/report-format";

export const metadata: Metadata = { title: "Search reports | ScamCircuit", robots: { index: false, follow: false }, referrer: "no-referrer" };

const control = "mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100";

function SearchForm({ search }: { search: ReportSearch }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6" aria-label="Search filters">
      <form action="/search" method="get" key={searchUrl(search)} className="flex flex-col gap-4 sm:flex-row sm:items-end">
        {search.mode === "recipient" ? <>
          <input type="hidden" name="mode" value="recipient" />
          {([
            ["payment_handle", "Payment handle", search.identifiers.paymentHandle],
            ["email", "Email", search.identifiers.email],
            ["phone", "Phone", search.identifiers.phone],
          ] as const).map(([name, label, value]) => (
            <label key={name} className="min-w-0 flex-1 text-sm font-semibold text-gray-700">{label}
              <input name={name} defaultValue={value || ""} maxLength={2000} className={control} />
            </label>
          ))}
        </> : <>
          <label className="text-sm font-semibold text-gray-700 sm:w-56">Search in
            <select name="field" defaultValue={search.field} className={control}>
              {searchFields.map((field) => <option key={field.value} value={field.value}>{field.label}</option>)}
            </select>
          </label>
          <label className="min-w-0 flex-1 text-sm font-semibold text-gray-700">Keyword or identifier
            <input type="search" name="q" defaultValue={search.q} placeholder="Email, phone, payment method, username…" maxLength={2000} required className={control} />
          </label>
        </>}
        <button type="submit" className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-green-700 px-6 py-3 text-sm font-semibold text-white hover:bg-green-800">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
          Search reports
        </button>
      </form>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <p>{search.mode === "recipient" ? "Exact matches on any identifier. Handles are case sensitive; email and phone formatting are normalized." : "Case-insensitive keyword matches. Phone searches also ignore spaces and punctuation."}</p>
        <Link href="/search" className="font-semibold text-green-800 hover:underline">{search.mode === "recipient" ? "Switch to keyword search" : "Clear search"}</Link>
      </div>
    </section>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === "string") params.set(key, first);
  }
  let search: ReportSearch;
  let validationError = "";
  try { search = parseReportSearch(params); } catch (error) {
    validationError = (error as Error).message;
    search = parseReportSearch(new URLSearchParams());
  }
  const active = !validationError && (search.mode === "recipient" || Boolean(search.q));
  let results: ReportSearchResults | null = null;
  let loadError = "";
  if (active) {
    try { results = await searchReports(db, search); } catch (error) {
      console.error("Report search failed", { code: (error as { code?: string }).code || "UNKNOWN" });
      loadError = "Reports could not be loaded. Please retry your search.";
    }
  }
  const back = searchUrl(search, results?.page || search.page);
  const identifierCount = Object.values(search.identifiers).filter(Boolean).length;

  return <>
    <NavBar />
    <main className="min-h-screen bg-gray-100 p-6 text-gray-900">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <ReportSearchTabs activeTab="search" />
        <div>
          <p className="mt-3 max-w-4xl leading-6 text-gray-600">Search reported scams, compare matching records, and open a report to investigate its details and submitted evidence.</p>
        </div>
        <SearchForm search={search} />
        {validationError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{validationError}</p>}
        {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{loadError} <Link href={back} className="font-semibold underline">Retry</Link></div>}
        {!active && !validationError && <section className="rounded-xl border border-gray-200 bg-white px-6 py-14 text-center">
          <h2 className="text-xl font-semibold">Start with a detail you know</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-500">Look up a payment handle, email, phone number, or a keyword from an incident. Select a field to narrow your search.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {[['payment_method', 'Zelle'], ['payment_method', 'bank-transfer']].map(([field, q]) => <Link key={q} href={`/search?${new URLSearchParams({ field, q })}`} className="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-semibold text-green-800 hover:bg-green-100">Try “{formatPayment(q)}” →</Link>)}
          </div>
        </section>}
        {results && <>
          <section aria-label="Search summary" className="grid gap-4 sm:grid-cols-3">
            {[
              ["Matching reports", results.total.toLocaleString("en-US")],
              ["Reported amount · USD", formatAmount(results.totalAmount)],
              ["Search type", search.mode === "recipient" ? "Exact recipient match" : searchFields.find((field) => field.value === search.field)!.label],
            ].map(([label, value]) => <div key={label} className="rounded-xl border border-gray-200 bg-white p-5"><p className="text-xs font-medium text-gray-500">{label}</p><p className="mt-2 break-words text-2xl font-bold text-gray-900">{value}</p></div>)}
          </section>
          <section aria-label="Search results" className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5">
              <div className="min-w-0 flex-1"><h2 className="break-words font-bold">{search.mode === "recipient" ? "Recipient matches" : `Results for “${search.q}”`}</h2><p className="mt-1 text-xs text-gray-500">{search.mode === "recipient" ? "Ranked by matching identifiers, then newest report ID." : "Ordered by newest report ID. Open any report to investigate."}</p></div>
              {results.total > 0 && <p className="text-xs text-gray-500">{((results.page - 1) * PAGE_SIZE + 1).toLocaleString("en-US")}–{Math.min(results.page * PAGE_SIZE, results.total).toLocaleString("en-US")} of {results.total.toLocaleString("en-US")}</p>}
            </div>
            {results.total === 0 ? <div className="p-12 text-center"><h3 className="text-lg font-semibold">No matching reports</h3><p className="mt-2 text-sm text-gray-500">Try another keyword or field. An empty search does not verify a recipient.</p></div> : <ul className="divide-y divide-gray-100">
              {results.reports.map((report) => <li key={report.id}>
                <Link href={`/reports/${report.id}?${new URLSearchParams({ back })}`} className="group block p-5 transition-colors hover:bg-green-50/50 focus-visible:outline-2 focus-visible:outline-green-700 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="break-all font-semibold text-green-900">{report.payment_handle || report.email || report.phone || `Report #${report.id}`}</h3><span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">Reported scam</span>{search.mode === "recipient" && <span className="rounded-full bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-800">{report.match_count} of {identifierCount} identifiers matched</span>}</div><p className="mt-2 text-xs text-gray-500">Report #{report.id} · {formatDate(report.date_occurred)}</p></div>
                    <span className="shrink-0 text-sm font-semibold text-green-800 group-hover:underline">Investigate <span aria-hidden="true">→</span></span>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    {[["Payment method", formatPayment(report.payment_method)], ["Email", report.email || "Not provided"], ["Phone", report.phone || "Not provided"], ["Reported amount", formatAmount(report.transaction_amount)]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}
                  </dl>
                  {report.description && <p className="mt-4 line-clamp-2 break-words text-sm leading-6 text-gray-600">{report.description}</p>}
                  <p className="mt-3 text-xs font-medium text-gray-500">{report.attachment_count} submitted {report.attachment_count === 1 ? "file" : "files"}</p>
                </Link>
              </li>)}
            </ul>}
            {results.pages > 1 && <nav aria-label="Results pages" className="flex items-center justify-between border-t border-gray-200 p-5 text-sm">
              {results.page > 1 ? <Link className="font-semibold text-green-800 hover:underline" href={searchUrl(search, results.page - 1)}>← Previous</Link> : <span className="text-gray-400">← Previous</span>}
              <span className="text-xs text-gray-500">Page {results.page} of {results.pages}</span>
              {results.page < results.pages ? <Link className="font-semibold text-green-800 hover:underline" href={searchUrl(search, results.page + 1)}>Next →</Link> : <span className="text-gray-400">Next →</span>}
            </nav>}
          </section>
          <p className="text-xs leading-5 text-gray-500">Reports reflect submitted information, which may be incomplete or unverified. Reported amounts include known amounts only.</p>
        </>}
      </div>
    </main>
  </>;
}
