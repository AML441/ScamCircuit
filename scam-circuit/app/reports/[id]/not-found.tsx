import Link from "next/link";
import NavBar from "@/app/components/NavBar";

export default function NotFound() {
  return <><NavBar /><main className="min-h-screen bg-gray-50 px-6 py-16 text-center text-gray-900"><h1 className="text-2xl font-bold">Report not found</h1><p className="mt-3 text-sm text-gray-500">This report is unavailable or the link is invalid.</p><Link href="/search" className="mt-6 inline-block font-semibold text-green-800 hover:underline">Search reports →</Link></main></>;
}
