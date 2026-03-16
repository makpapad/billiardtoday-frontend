import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { getCmsAppearance } from "@/lib/cms/strapi";

export const dynamic = "force-dynamic";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appearance = await getCmsAppearance().catch(() => null);
  const colorMode = appearance?.colorMode || "light";
  const htmlClassName = colorMode === "dark" ? "dark" : undefined;
  const bodyStyle =
    colorMode === "system"
      ? undefined
      : ({
          colorScheme: colorMode,
        } as CSSProperties);
  const colorModeScript =
    colorMode === "system"
      ? `(() => {
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = () => {
    root.classList.toggle('dark', media.matches);
    root.style.colorScheme = media.matches ? 'dark' : 'light';
  };
  apply();
  if (media.addEventListener) media.addEventListener('change', apply);
})();`
      : `(() => {
  const root = document.documentElement;
  root.classList.toggle('dark', ${colorMode === "dark" ? "true" : "false"});
  root.style.colorScheme = '${colorMode}';
})();`;

  return (
    <html lang="el" className={htmlClassName} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col" style={bodyStyle}>
        <script dangerouslySetInnerHTML={{ __html: colorModeScript }} />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
