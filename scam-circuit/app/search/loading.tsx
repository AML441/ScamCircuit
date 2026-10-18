import NavBar from "../components/NavBar";
import ReportSearchTabs from "../components/ReportSearchTabs";

export default function Loading() {
  return <><NavBar /><main className="min-h-screen bg-gray-100 p-6 text-gray-900"><div className="mx-auto w-full max-w-5xl"><ReportSearchTabs activeTab="search" /><div role="status" className="rounded-xl border border-gray-200 bg-white p-8">Searching reports…</div></div></main></>;
}
