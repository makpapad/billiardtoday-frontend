import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { getCmsAppearance } from "@/lib/cms/strapi";

export const dynamic = "force-dynamic";

const googleTagManagerId = process.env.NEXT_PUBLIC_GTM_ID || "GTM-M2LPF82V";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://billiardtoday.com"),
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
      <head>
        {googleTagManagerId ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${googleTagManagerId}');`,
            }}
          />
        ) : null}
      </head>
      <body className="min-h-screen flex flex-col" style={bodyStyle}>
        {googleTagManagerId ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${googleTagManagerId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        ) : null}
        <script dangerouslySetInnerHTML={{ __html: colorModeScript }} />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
