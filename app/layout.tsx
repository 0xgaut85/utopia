import type { Metadata } from "next";
import { Inter, Bricolage_Grotesque, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { SmoothScrollProvider } from "@/components/providers/smooth-scroll-provider";
import { ComingSoonProvider } from "@/components/coming-soon";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const siteUrl = "https://utopiadata.net";
const siteTitle = "Utopia";
const siteDescription =
  "The world's largest source of ground level spatial data. Building the training set for a global LLM of physical reality.";

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: "Utopia",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    site: "@utopiadata",
    creator: "@utopiadata",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${bricolage.variable} ${instrumentSerif.variable} ${mono.variable}`}
    >
      <body className="font-body antialiased">
        <SmoothScrollProvider>
          <ComingSoonProvider>{children}</ComingSoonProvider>
        </SmoothScrollProvider>
        <div className="grain-overlay" />
      </body>
    </html>
  );
}
