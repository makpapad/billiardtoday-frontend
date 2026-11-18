import { listPlayers } from "@/lib/publicSiteData";

/**
 * Δεύτερο sitemap: ΟΛΟΙ οι αθλητές που έχουν έστω έναν αγώνα.
 *
 * Γιατί χωριστά από το κύριο: το κύριο `sitemap.xml` κρατά μόνο τις σελίδες με
 * ουσιαστικό περιεχόμενο (≥5 αγώνες). Αν έμπαιναν εκεί και οι υπόλοιποι ~1.400
 * αραιές σελίδες, το αρχείο θα έστελνε 40% φτωχό περιεχόμενο και η Google θα
 * αμφισβητούσε συνολικά το sitemap — μαζί και τις δυνατές σελίδες.
 *
 * Έτσι δεν χάνεται κανείς: όλοι δηλώνονται, αλλά σε δεύτερη προτεραιότητα.
 */

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://billiardtoday.com";

/** Πότε άλλαξε το ΠΡΟΤΥΠΟ της σελίδας αθλητή (βιογραφικό + 200 τουρνουά). */
const TEMPLATE_REVISION = new Date("2026-11-16T00:00:00Z");

const withRevision = (value?: string | null): string => {
  const parsed = value ? new Date(value) : null;
  const date = parsed && !Number.isNaN(parsed.getTime()) && parsed > TEMPLATE_REVISION
    ? parsed
    : TEMPLATE_REVISION;
  return date.toISOString();
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const revalidate = 3600;

export async function GET() {
  const players = await listPlayers(50000, { withMatchCount: true }).catch(() => []);

  const urls = players
    .filter((player) => {
      const count = player.matchCount;
      // `matchCount` λείπει (αποτυχία query) → δεν φιλτράρουμε, ποτέ άδειο αρχείο.
      if (count === undefined || count === null) return true;
      return count > 0;
    })
    .map((player) => {
      const loc = escapeXml(
        `${siteUrl.replace(/\/+$/, "")}${player.href.startsWith("/") ? player.href : `/${player.href}`}`,
      );
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${withRevision(player.updatedAt)}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.4</priority>\n  </url>`;
    });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
