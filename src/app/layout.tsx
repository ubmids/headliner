import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Instrument_Sans, Space_Mono } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

// Design spec: design/DESIGN.md (Direction C, "Tour poster"). Fonts are self-hosted at build time by next/font.
const display = Big_Shoulders({ subsets: ["latin"], weight: "variable", axes: ["opsz"], variable: "--font-display", display: "swap" });
const body = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Headliner: tour decisions on Qloo taste data",
  description:
    "An agent for live-music promoters: routes the tour, picks the support act and finds sponsors from Qloo's taste graph, and shows how a plain LLM would have got it wrong.",
  openGraph: {
    title: "Headliner: tour decisions on Qloo taste data",
    description: "Routing, support acts and sponsors for a headline tour, grounded in Qloo's cross-domain taste data.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
