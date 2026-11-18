/**
 * Sitemap index: λέει στη Google ότι υπάρχουν δύο αρχεία, με σειρά προτεραιότητας.
 *
 * 1. `/sitemap.xml`         — κύριο: ό,τι θέλουμε σίγουρα στο ευρετήριο
 * 2. `/sitemap-players.xml` — όλοι οι αθλητές (και οι αραιές σελίδες)
 *
 * Αυτό υποβάλλεται στο Search Console (και δηλώνεται στο robots.txt).
 */

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://billiardtoday.com";

const list = [
  { loc: `${siteUrl.replace(/\/+$/, "")}/sitemap.xml`, priority: "1.0" },
  { loc: `${siteUrl.replace(/\/+$/, "")}/sitemap-players.xml`, priority: "0.5" },
];

export const revalidate = 3600;

export async function GET() {
  const body = list
    .map(
      (entry) =>
        `  <sitemap>\n    <loc>${entry.loc}</loc>\n  </sitemap>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
