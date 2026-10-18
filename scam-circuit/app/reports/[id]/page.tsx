import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import NavBar from "@/app/components/NavBar";
import { db } from "@/lib/db";
import { getReportDetails } from "@/lib/report-details";
import { safeSearchBack } from "@/lib/report-search-params";
import { formatAmount, formatBytes, formatDate, formatPayment } from "@/lib/report-format";

export const metadata: Metadata = { title: "Investigate report | ScamCircuit", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ReportPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const back = safeSearchBack((await searchParams).back);
  let data: Awaited<ReturnType<typeof getReportDetails>>;
  try { data = await getReportDetails(db, id); } catch (error) {
    console.error("Report detail failed", { code: (error as { code?: string }).code || "UNKNOWN" });
    return <><NavBar /><main className="min-h-screen bg-gray-50 px-6 py-10 text-gray-900"><div className="mx-auto max-w-6xl"><Link href={back} className="font-semibold text-green-800">← Back to results</Link><p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">This report could not be loaded. <Link href={`/reports/${id}?${new URLSearchParams({ back })}`} className="font-semibold underline">Try again</Link>.</p></div></main></>;
  }
  if (!data) notFound();
  const { report, apps, attachments } = data;
  const identifiers = [
    ["Payment handle", "payment_handle", report.payment_handle],
    ["Email", "email", report.email],
    ["Phone", "phone", report.phone],
    ["Website", "website_url", report.website_url],
    ["Other contact", "other_contact", report.other_contact],
  ];

  return <><NavBar /><main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-8 text-gray-900 sm:px-6 sm:py-10">
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href={back} className="text-sm font-semibold text-green-800 hover:underline">← Back to results</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-semibold text-amber-800">Reported scam · Unverified submission</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[["Reported amount · USD", formatAmount(report.transaction_amount)], ["Payment method", formatPayment(report.payment_method)], ["Submitted evidence", `${attachments.length} ${attachments.length === 1 ? "file" : "files"}`]].map(([label, value]) => <div key={label} className="rounded-xl border border-gray-200 bg-white p-5"><p className="text-xs text-gray-500">{label}</p><p className="mt-2 break-words text-xl font-bold">{value}</p></div>)}
      </div>
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-bold">What happened</h2>
        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
          {report.description || "No description was provided for this report."}
        </p>
      </section>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-bold">Recipient &amp; contact details</h2>
          <p className="mt-2 text-xs leading-5 text-gray-500">Select a value to search for related reports.</p>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            {identifiers.map(([label, field, value]) => (
              <div key={field} className="min-w-0">
                <dt className="text-xs text-gray-500">{label}</dt>
                <dd className="mt-1 break-all text-sm">
                  {value ? (
                    <Link href={`/search?${new URLSearchParams({ field: field!, q: value })}`} className="font-medium text-green-800 hover:underline">
                      {value} <span aria-hidden="true">↗</span>
                    </Link>
                  ) : <span className="text-gray-400">Not provided</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-bold">Messaging accounts</h2>
          {apps.length ? (
            <ul className="mt-5 space-y-5">
              {apps.map((app, index) => (
                <li key={`${app.app_name}-${index}`}>
                  <p className="text-xs font-semibold text-gray-500">{app.app_name}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {app.username?.length ? app.username.map((username) => (
                      <Link key={username} href={`/search?${new URLSearchParams({ field: "username", q: username })}`} className="max-w-full break-all rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-100">
                        {username} ↗
                      </Link>
                    )) : <p className="text-sm text-gray-400">No usernames provided</p>}
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 text-sm text-gray-500">No messaging accounts were provided.</p>}
        </section>
      </div>
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-bold">Submitted files <span className="ml-1 text-sm font-normal text-gray-500">({attachments.length})</span></h2>
        <p className="mt-2 text-xs leading-5 text-gray-500">Download the original submitted files to review the evidence.</p>
        {attachments.length ? (
          <ul className="mt-4 divide-y divide-gray-100">
            {attachments.map((file) => (
              <li key={file.id} className="flex flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:gap-4">
                <div className="min-w-0">
                  <p className="break-all text-sm font-semibold">{file.file_name || "Untitled evidence"}</p>
                  <p className="mt-1 break-all text-xs text-gray-500">{formatBytes(file.file_size)} · {file.file_type || "Unknown file type"}</p>
                </div>
                <a href={`/api/reports/${report.id}/attachments/${file.id}`} className="shrink-0 rounded-lg border border-green-200 px-3 py-2 text-xs font-semibold text-green-800 hover:bg-green-50" aria-label={`Download ${file.file_name || "evidence"}`}>
                  Download ↓
                </a>
              </li>
            ))}
          </ul>
        ) : <p className="mt-5 rounded-lg bg-gray-50 p-4 text-sm text-gray-500">No files were submitted with this report.</p>}
      </section>
    </div>
  </main></>;
}
