import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans, Lobster } from "next/font/google";

import { RootShell } from "@/components/root-shell";

import "./globals.css";

const headingFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
});

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const brandFont = Lobster({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-brand",
});

export const metadata: Metadata = {
  title: "OrbbiBoard",
  description: "Tablero y asistente analítico para explorar históricos de disponibilidad.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${headingFont.variable} ${bodyFont.variable} ${brandFont.variable}`}>
        <RootShell>{children}</RootShell>
      </body>
    </html>
  );
}
