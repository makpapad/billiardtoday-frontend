import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { getCmsAppearance } from "@/lib/cms/strapi";
import { buildDefaultOpenGraphImage, SITE_URL } from "@/lib/socialMetadata";

export const dynamic = "force-dynamic";

const googleAnalyticsId =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-BHBG58ND1R";
const defaultSocialImage = buildDefaultOpenGraphImage("Billiard Today");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
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
    url: SITE_URL,
    siteName: "Billiard Today",
    title: "Billiard Today",
    description:
      "Billiard tournaments, results, rankings, clubs, players, and structured CMS content.",
    images: [defaultSocialImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Billiard Today",
    description:
      "Billiard tournaments, results, rankings, clubs, players, and structured CMS content.",
    images: [String(defaultSocialImage.url)],
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
      <head>
        {googleAnalyticsId ? (
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
          />
        ) : null}
        {googleAnalyticsId ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${googleAnalyticsId}');`,
            }}
          />
        ) : null}
      </head>
      <body className="min-h-screen flex flex-col" style={bodyStyle}>
        <script dangerouslySetInnerHTML={{ __html: colorModeScript }} />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
