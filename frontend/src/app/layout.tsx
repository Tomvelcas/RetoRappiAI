import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Sans } from "next/font/google";

import { SiteNav } from "@/components/site-nav";

import "./globals.css";

const headingFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-heading",
});

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Signal Atlas",
  description: "Visual control room for historical availability signals and grounded chat.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        <div className="relative min-h-screen">
          <SiteNav />
          <div className="relative z-10">{children}</div>
        </div>
      </body>
    </html>
  );
}
