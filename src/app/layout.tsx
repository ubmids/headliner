import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Headliner: tour decisions on Qloo taste data",
  description:
    "An agent for live-music promoters: routes the tour, picks the support act and finds sponsors from Qloo's taste graph, and shows how a plain LLM would have got it wrong.",
  openGraph: {
    title: "Headliner: tour decisions on Qloo taste data",
    description: "Routing, support acts and sponsors for a headline tour, grounded in Qloo's cross-domain taste data.",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e0e0d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
