import type { Metadata } from "next";
import NavBar from "../components/NavBar";
import ReportSearchTabs from "../components/ReportSearchTabs";
import ScamRadar from "../components/ScamRadar";

export const metadata: Metadata = { title: "Scam Radar | ScamCircuit", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function RadarPage() {
  return <>
    <NavBar />
    <main className="min-h-screen bg-gray-100 px-4 py-6 text-gray-900 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <ReportSearchTabs activeTab="radar" />
        <ScamRadar />
      </div>
    </main>
  </>;
}
