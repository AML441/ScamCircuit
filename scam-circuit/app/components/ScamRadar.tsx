"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FLAG_REPORT_THRESHOLD, type RadarData, type RadarRange, type IdentifierKind } from "@/lib/scam-radar";
import { formatAmount, formatPayment } from "@/lib/report-format";

const card = "rounded-2xl border border-gray-200 bg-white p-5 sm:p-6";
const button = "rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:opacity-50";
const kindLabels: Record<IdentifierKind, string> = { payment_handle: "Payment handle", email: "Email", phone: "Phone" };
const dateLabel = (day: string, full = false) => new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", ...(full ? { year: "numeric" } : {}), timeZone: "UTC",
}).format(new Date(`${day}T00:00:00Z`));
const count = (n: number | null | undefined) => typeof n === "number" && Number.isFinite(n) ? n.toLocaleString("en-US") : "—";

export default function ScamRadar() {
  const [range, setRange] = useState<RadarRange>(30);
  const [snapshot, setData] = useState<RadarData | null>(null);
  // Hot reload may preserve snapshots from before the flag-count field existed.
  const data = snapshot?.days.every((day) => Number.isInteger(day.flaggedCount)) ? snapshot : null;
  const [cursor, setCursor] = useState(29);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [metric, setMetric] = useState<"reports" | "amount">("reports");
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/radar?days=${range}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Scam Radar could not load your reports. Please try again.");
        const next: RadarData = await response.json();
        if (controller.signal.aborted) return;
        if (!Array.isArray(next?.days) || next.days.length !== range
          || next.days.some((day) => !Number.isInteger(day?.flaggedCount))) {
          throw new Error("Radar data needs to be refreshed. Please try again.");
        }
        setData(next);
        setCursor(next.days.length - 1);
        setError("");
      } catch (failure) {
        if (!controller.signal.aborted) setError((failure as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [range, refresh]);

  useEffect(() => {
    if (!playing || !data || cursor >= data.days.length - 1) return;
    const timer = setTimeout(() => setCursor((current) => current + 1), 900);
    return () => clearTimeout(timer);
  }, [playing, data, cursor]);

  // Keep network refresh deliberate so it never interrupts a replay.
  function reload(nextRange = range) {
    setPlaying(false);
    setLoading(true);
    setError("");
    setData(null);
    setRange(nextRange);
    if (nextRange === range) setRefresh((value) => value + 1);
  }
  const day = data?.days[cursor];
  const atEnd = Boolean(data && cursor === data.days.length - 1);
  const isPlaying = playing && !atEnd;
  const max = data ? Math.max(1, ...data.days.map((item) => metric === "reports" ? item.reports : item.amount ?? 0)) : 1;

  return <div className="space-y-5">
    <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="mt-3 max-w-xl leading-6 text-gray-600">Explore incident trends, find frequently reported recipients, and follow the reports behind each pattern.</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-gray-300 bg-white p-1" aria-label="Time window">
          {([7, 30, 90] as const).map((value) => <button key={value} onClick={() => reload(value)} aria-pressed={range === value} className={`rounded-md px-3 py-2 text-xs font-bold focus-visible:outline-2 focus-visible:outline-green-700 ${range === value ? "bg-green-800 text-white" : "text-gray-600 hover:bg-gray-100"}`}>{value} days</button>)}
        </div>
        <button onClick={() => reload()} disabled={loading} className={button} aria-label="Refresh radar data" title="Use Refresh to include newly available reports.">↻ Refresh</button>
      </div>
    </section>

    {(loading || (!data && !error)) && <div role="status" className={`${card} py-20 text-center text-sm text-gray-500`}>Loading incident trends…</div>}
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">{error} <button className="ml-2 font-semibold underline" onClick={() => reload()}>Retry</button></div>}

    {data && day && !loading && <>
      <section className="overflow-hidden rounded-2xl border border-green-900 bg-green-950 text-white" aria-label="Incident replay">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-green-100"><span className={`h-2 w-2 rounded-full ${atEnd ? "bg-green-400" : "bg-amber-300"}`} />{atEnd ? "Latest incident-date view" : "Replaying incident dates"}</div>
          <p className="text-xs text-green-200">Daily time buckets · Powered by TigerData</p>
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-xs text-green-200">Incidents through</p><p className="mt-1 text-2xl font-semibold" aria-live="off">{dateLabel(day.day, true)}</p></div>
            <div className="flex gap-2">
              <button className="rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-green-950 hover:bg-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" onClick={() => {
                if (isPlaying) setPlaying(false);
                else { if (atEnd) setCursor(0); setPlaying(true); }
              }}>{isPlaying ? "Ⅱ Pause" : "▶ Play replay"}</button>
              {!atEnd && <button className="rounded-lg border border-white/40 px-4 py-2 text-sm font-semibold hover:bg-white/10" onClick={() => { setPlaying(false); setCursor(data.days.length - 1); }}>Latest</button>}
            </div>
          </div>
          <label className="mt-6 block"><span className="sr-only">Replay incident date</span>
            <input type="range" min={0} max={data.days.length - 1} value={cursor} aria-valuetext={dateLabel(day.day, true)} onChange={(event) => { setPlaying(false); setCursor(Number(event.target.value)); }} className="h-6 w-full cursor-pointer accent-green-400" />
          </label>
          <div className="mt-1 flex justify-between text-xs text-green-200"><span>{dateLabel(data.start)}</span><span>{dateLabel(data.end)}</span></div>
        </div>
      </section>

      <section aria-label="Radar summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Incidents in view", count(day.totalReports), `Since ${dateLabel(data.start)} · through selected day`],
          ["Reported losses · USD", formatAmount(day.totalAmount), "Known amounts in this view"],
          ["Last 7 incident days", count(day.recent), "Through your selected date"],
          ["Flagged identifiers", count(day.flaggedCount), `${FLAG_REPORT_THRESHOLD}+ reports in the last 7 days`],
        ].map(([label, value, hint]) => <div className={card} key={label}><p className="text-xs font-medium text-gray-500">{label}</p><p className="mt-2 break-words text-2xl font-bold tracking-tight">{value}</p><p className="mt-2 text-xs leading-5 text-gray-500">{hint}</p></div>)}
      </section>

      <section className={card} aria-label="Daily incident trends">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="font-bold">The shape of reported activity</h2><p className="mt-1 text-xs text-gray-500">{dateLabel(data.start)} – {dateLabel(data.end, true)} · Select a day to investigate</p></div>
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1" aria-label="Chart measure">{([['reports', 'Incidents'], ['amount', 'Losses']] as const).map(([value, label]) => <button key={value} aria-pressed={metric === value} onClick={() => setMetric(value)} className={`rounded-md px-3 py-2 text-xs font-semibold ${metric === value ? "bg-white text-green-900 shadow-sm" : "text-gray-500"}`}>{label}</button>)}</div>
        </div>
        <div className="mt-6 flex items-center justify-between text-[11px] text-gray-500"><span>{metric === "reports" ? "Incidents per day" : "Known losses per day · USD"}</span><span>Peak {metric === "reports" ? count(Math.max(...data.days.map((item) => item.reports))) : formatAmount(Math.max(...data.days.map((item) => item.amount ?? 0)))}</span></div>
        <div className="relative mt-2">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col justify-between"><div className="border-t border-dashed border-gray-200" /><div className="border-t border-dashed border-gray-200" /><div className="border-t border-dashed border-gray-200" /></div>
          <div className="relative flex h-44 items-end gap-px border-b border-gray-300 sm:h-52 sm:gap-1" role="group" aria-label="Daily incident chart">
            {data.days.map((item, index) => {
              const value = metric === "reports" ? item.reports : item.amount ?? 0;
              return <button key={item.day} onClick={() => { setPlaying(false); setCursor(index); }} aria-pressed={cursor === index}
                aria-label={`${dateLabel(item.day, true)}: ${count(item.reports)} incidents, ${formatAmount(item.amount)} reported losses`}
                title={`${dateLabel(item.day)} · ${metric === "reports" ? `${count(item.reports)} incidents` : formatAmount(item.amount)}`}
                className={`group flex h-full min-w-0 flex-1 items-end rounded-t-sm focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-green-700 ${index === cursor ? "bg-green-50 ring-1 ring-inset ring-green-700" : "hover:bg-gray-100"}`}>
                <span className={`block w-full rounded-t-sm ${index > cursor ? "bg-gray-200" : index === cursor ? "bg-green-600" : "bg-green-800"}`} style={{ height: `${value > 0 ? Math.max(2, value / max * 94) : 1}%` }} />
              </button>;
            })}
          </div>
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-gray-500"><span>{dateLabel(data.start)}</span><span>{dateLabel(data.days[Math.floor(data.days.length / 2)].day)}</span><span>{dateLabel(data.end)}</span></div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs"><p className="text-gray-500"><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-green-800" /> Through selected day <span className="ml-3 mr-1 inline-block h-2 w-2 rounded-sm bg-gray-200" /> Later incident dates</p><button className="font-semibold text-green-800 hover:underline" onClick={() => setShowTable(!showTable)} aria-expanded={showTable}>{showTable ? "Hide" : "Show"} daily data</button></div>
        {showTable && <div className="mt-4 max-h-64 overflow-auto rounded-lg border border-gray-200"><table className="w-full text-left text-xs"><caption className="sr-only">Daily incidents and known losses through the replay date</caption><thead className="sticky top-0 bg-gray-50"><tr><th className="p-3">Incident date</th><th className="p-3">Incidents</th><th className="p-3">Known losses · USD</th></tr></thead><tbody>{data.days.slice(0, cursor + 1).map((item) => <tr key={item.day} className="border-t border-gray-100"><td className="p-3">{dateLabel(item.day, true)}</td><td className="p-3">{count(item.reports)}</td><td className="p-3">{formatAmount(item.amount)}</td></tr>)}</tbody></table></div>}
        {day.totalReports === 0 && <p className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">No dated incidents in this view through {dateLabel(day.day)}. Move the replay forward or try a wider window.</p>}
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[1.65fr_1fr]">
        <section className={card} aria-label="Reported recipient identifiers">
          <div className="flex items-center justify-between gap-3"><h2 className="font-bold">Recipients to investigate</h2><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">{day.flaggedCount} flagged</span></div>
          <p className="mt-2 text-xs leading-5 text-gray-500">Ranked by matching report count in the last 7 incident days. A report may match multiple identifiers; these are not separate people.</p>
          {day.identifiers.length === 0 ? <p className="mt-5 rounded-lg bg-gray-50 p-6 text-sm leading-6 text-gray-500">No recipient identifiers in this seven-day window. Reports without a handle, email, or phone still appear in the chart.</p> : <ul className="mt-3 divide-y divide-gray-100">{day.identifiers.map((item) => {
            const search = `/search?${new URLSearchParams({ mode: "recipient", [item.kind]: item.identifier })}`;
            return <li key={`${item.kind}:${item.identifier}`} className="py-4">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-medium text-gray-500">{kindLabels[item.kind]}</p><p className="mt-1 break-all text-sm font-semibold text-gray-900">{item.identifier}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${item.flagged ? "bg-amber-50 text-amber-800" : "bg-gray-100 text-gray-600"}`}>{item.flagged ? "Flagged" : "Reported activity"}</span></div>
              <p className="mt-2 text-xs text-gray-600"><strong>{count(item.recent)}</strong> reported incidents in 7 days</p>
              <p className="mt-1 text-xs text-gray-600">Reported losses in these incidents: {formatAmount(item.amount)}</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-green-800"><Link href={`/reports/${item.reportId}?${new URLSearchParams({ back: search })}`} className="hover:underline">Open matching evidence →</Link><Link href={search} className="hover:underline">All matching reports · all dates →</Link></div>
            </li>;
          })}</ul>}
        </section>
        <div className="space-y-5">
          <section className={card} aria-label="Payment method trends"><h2 className="font-bold">Payment methods</h2><p className="mt-2 text-xs text-gray-500">Last 7 incident days through {dateLabel(day.day)}</p>
            {day.methods.length === 0 ? <p className="mt-5 text-sm text-gray-500">No incidents in this window.</p> : <ul className="mt-5 space-y-4">{day.methods.map((item) => <li key={item.method}><div className="flex justify-between gap-3 text-xs"><span className="break-words font-medium">{formatPayment(item.method)}</span><span className="shrink-0 text-gray-500">{count(item.reports)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-green-700" style={{ width: `${item.reports / Math.max(1, day.recent) * 100}%` }} /></div></li>)}</ul>}
          </section>
          <section className="rounded-2xl border border-green-200 bg-green-50 p-5 sm:p-6">
            <h2 className="text-sm font-bold text-green-950">When is something flagged?</h2>
            <p className="mt-2 text-xs leading-6 text-green-900">We flag a payment handle, email address, or phone number when it appears in more than 5 reports within 7 days. That means the flag appears at {FLAG_REPORT_THRESHOLD} reports.</p>
            <p className="mt-3 text-xs leading-6 text-green-900">During replay, we count reports with incident dates on your selected day and the 6 days before it. The flag clears when fewer than {FLAG_REPORT_THRESHOLD} reports remain in that window.</p>
            <p className="mt-3 text-xs leading-6 text-green-900">A flag helps you find frequently reported details. It does not confirm fraud.</p>
          </section>
        </div>
      </div>
    </>}
  </div>;
}
