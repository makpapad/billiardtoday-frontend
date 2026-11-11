import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { getCmsAppearance } from "@/lib/cms/strapi";
import { buildDefaultOpenGraphImage, SITE_URL } from "@/lib/socialMetadata";

/**
 * ΠΡΟΣΟΧΗ: εδώ ΔΕΝ μπαίνει `force-dynamic`. Ήταν εδώ και ακύρωνε κάθε `revalidate`
 * των δημόσιων σελίδων (no-store παντού, πλήρες render σε κάθε crawl — μετρημένο
 * 11/11/2026). Οι διαδρομές που θέλουν ζωντανά δεδομένα το δηλώνουν μόνες τους
 * (`/live*`, `/federation*`, `/embed/live*`, `/desk`).
 */

const googleAnalyticsId =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-BHBG58ND1R";
const defaultSocialImage = buildDefaultOpenGraphImage("Billiard Today");

/**
 * Entity σήμανση σε όλο το site. Χωρίς αυτή η Google δεν ξέρει ποιος είναι ο εκδότης:
 * δεν υπήρχε ΚΑΝΕΝΑ Organization/WebSite JSON-LD (μετρημένο 11/11/2026 σε /, /clubs,
 * /rankings, /tournaments, /news). Χωρίς sameAs/ψεύτικο SearchAction — δεν υπάρχει
 * δικό μας προφίλ κοινωνικού δικτύου και το /players δεν έχει ελεύθερη αναζήτηση.
 */
const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Billiard Today",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo-billiardtoday.png`,
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Billiard Today",
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
  title: {
    // Η αρχική δήλωνε σκέτο «Billiard Today» (14 χαρακτήρες, μηδέν keywords).
    // Το template ισχύει μόνο για τις υποσελίδες· εδώ χρειάζεται πλήρες, στοχευμένο title.
    default: "Live Billiard Scores, Tournaments & Rankings | Billiard Today",
    template: "%s | Billiard Today",
  },
  description:
    "International billiard tournaments, live scores, results, world rankings, and club and player profiles for carom and 3-cushion billiards.",
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
  // ΠΡΟΣΟΧΗ: μην ξαναβάλεις `alternates.canonical` εδώ. Ήταν `"/"` και κάθε σελίδα
  // χωρίς δικό της metadata δήλωνε canonical την αρχική (επιβεβαιωμένο live στο
  // /account, 11/11/2026) — δηλαδή έλεγε στη Google «αγνόησέ με».
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Billiard Today",
    title: "Live Billiard Scores, Tournaments & Rankings | Billiard Today",
    description:
      "International billiard tournaments, live scores, results, world rankings, and club and player profiles for carom and 3-cushion billiards.",
    images: [defaultSocialImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Live Billiard Scores, Tournaments & Rankings | Billiard Today",
    description:
      "International billiard tournaments, live scores, results, world rankings, and club and player profiles for carom and 3-cushion billiards.",
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
    <html lang="en" className={htmlClassName} suppressHydrationWarning>
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <script dangerouslySetInnerHTML={{ __html: colorModeScript }} />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
