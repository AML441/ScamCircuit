import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Report an incident | ScamCircuit",
  description: "Share the details of a scam incident with ScamCircuit. Add supporting evidence and review your report before submitting.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en" className="h-full antialiased"><body>{children}</body></html>;
}
