import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://billiardtoday.com"),
  title: {
    default: "Billiard Today",
    template: "%s | Billiard Today",
  },
  description:
    "Billiard tournaments, results, rankings, clubs, players, and structured CMS content for the Greek billiard community.",
  keywords: [
    "billiard",
    "tournaments",
    "results",
    "rankings",
    "players",
    "clubs",
    "billiard today",
  ],
  authors: [{ name: "Billiard Today" }],
  creator: "Billiard Today",
  publisher: "Billiard Today",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "el_GR",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://billiardtoday.com",
    siteName: "Billiard Today",
    title: "Billiard Today",
    description:
      "Billiard tournaments, results, rankings, clubs, players, and structured CMS content.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Billiard Today",
    description:
      "Billiard tournaments, results, rankings, clubs, players, and structured CMS content.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
