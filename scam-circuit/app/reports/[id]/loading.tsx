import NavBar from "@/app/components/NavBar";

export default function Loading() {
  return <><NavBar /><main className="min-h-screen bg-gray-50 p-8 text-gray-900"><div role="status" className="mx-auto max-w-6xl rounded-xl border border-gray-200 bg-white p-8">Loading report and submitted evidence…</div></main></>;
}
