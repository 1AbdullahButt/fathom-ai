import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, Instrument_Sans, Newsreader } from "next/font/google";
import { NavProgressProvider } from "@/components/nav/NavProgress";
import "./globals.css";

// Sotto fonts (design/FONTS.md): each feeds a token in app/globals.css.
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument-sans",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-newsreader",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: "Fathom AI",
  description: "Meeting notes without a bot: upload a recording, get a transcript, summary and action items with evidence.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${instrumentSans.variable} ${newsreader.variable} ${plexMono.variable}`}>
      <body>
        <NavProgressProvider>{children}</NavProgressProvider>
      </body>
    </html>
  );
}
