import Link from "next/link";

export default function ReportSearchTabs({ activeTab }: { activeTab: "report" | "search" }) {
  return (
    <nav aria-label="Report and search" className="mb-6 flex justify-center gap-10 border-b border-gray-300">
      <div className="flex gap-8">
        {([
          { tab: "report", label: "Report", href: "/" },
          { tab: "search", label: "Search", href: "/search" },
        ] as const).map(({ tab, label, href }) => (
          <Link
            key={tab}
            href={href}
            aria-current={activeTab === tab ? "page" : undefined}
            className={`border-b-2 px-2 py-3 text-sm font-semibold transition ${
              activeTab === tab
                ? "border-[#115c04] text-[#115c04]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
