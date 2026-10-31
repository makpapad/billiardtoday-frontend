import type { MetadataRoute } from "next";
import { getClubs, getFederations } from "@/lib/directory";
import { listNewsArticles } from "@/lib/cms/news";
import { buildTeamTournamentSlug, fetchTeamTournaments } from "@/lib/teamTournaments";
import { listPlayers, listTournamentEvents } from "@/lib/publicSiteData";
import { isPlayerIndexable } from "@/lib/playerIndexability";
import { fetchRankingSeriesIndex } from "@/lib/rankings";
import { cebEditionHref } from "@/lib/cebRanking";
import { readCebRankingArchive, readCebRankingIndex } from "@/lib/cebRankingData";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://billiardtoday.com";

export const dynamic = "force-dynamic";

const staticRoutes = [
  "/",
  "/tournaments",
  "/players",
  "/clubs",
  "/federations",
  "/rankings",
  "/rankings/ceb",
  "/news",
  "/live",
  "/manual",
  "/privacy-policy",
  "/terms-of-service",
  "/cookie-policy",
] as const;

const toAbsoluteUrl = (path: string) =>
  `${siteUrl.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * ΜΟΝΟ πραγματικές ημερομηνίες τροποποίησης.
 * Πριν, ΚΑΘΕ εγγραφή έπαιρνε `lastModified: new Date()` (η ώρα της κλήσης): το Google
 * το διαβάζει ως ψευδές σήμα και αγνοεί το lastmod σε ολόκληρο το sitemap. Όπου δεν
 * υπάρχει πραγματική ημερομηνία, το πεδίο μένει κενό — δεν βάζουμε σημερινή.
 */
const toLastModified = (value?: string | null): Date | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

type SitemapEntryOptions = Pick<
  MetadataRoute.Sitemap[number],
  "changeFrequency" | "priority"
> & { lastModified?: Date };

const sitemapEntry = (
  path: string,
  options: SitemapEntryOptions = {},
): MetadataRoute.Sitemap[number] => {
  const entry: MetadataRoute.Sitemap[number] = {
    url: toAbsoluteUrl(path),
  };
  if (options.lastModified) entry.lastModified = options.lastModified;
  if (options.changeFrequency) entry.changeFrequency = options.changeFrequency;
  if (typeof options.priority === "number") entry.priority = options.priority;
  return entry;
};

/**
 * Οι σελίδες CEB: τα ζωντανά rankings και τα αρχειοθετημένα αντίγραφα κάθε έκδοσης.
 * Το αντίγραφο της *τρέχουσας* έκδοσης μένει έξω — είναι noindex (ίδιο περιεχόμενο με τη ζωντανή σελίδα).
 * Το lastmod είναι η ημερομηνία της ίδιας της έκδοσης (πραγματική), όχι η ώρα της κλήσης.
 */
const cebRankingEntries = (): MetadataRoute.Sitemap => {
  const available = readCebRankingIndex()?.available ?? [];
  const entries: MetadataRoute.Sitemap = [];

  for (const item of available) {
    entries.push(
      sitemapEntry(item.href, {
        changeFrequency: "weekly",
        priority: 0.7,
        lastModified: toLastModified(item.updatedAt),
      }),
    );

    for (const edition of readCebRankingArchive(item.slug)?.editions ?? []) {
      if (edition.edition === item.edition) continue;
      entries.push(
        sitemapEntry(cebEditionHref(item.slug, edition.key), {
          changeFrequency: "monthly",
          priority: 0.5,
          lastModified: toLastModified(edition.updatedAt),
        }),
      );
    }
  }

  return entries;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [clubs, federations, players, tournamentEvents, rankingSeries, newsArticles, teamTournaments] =
    await Promise.all([
      getClubs().catch(() => []),
      getFederations().catch(() => []),
      listPlayers(50000).catch(() => []),
      listTournamentEvents(1000).catch(() => []),
      fetchRankingSeriesIndex().catch(() => []),
      listNewsArticles(500).catch(() => []),
      fetchTeamTournaments().catch(() => []),
    ]);

  const entries = [
    // Σταθερές σελίδες: δεν έχουν πραγματικό updatedAt → χωρίς lastmod (ποτέ σημερινή ημερομηνία).
    ...staticRoutes.map((path) =>
      sitemapEntry(path, {
        changeFrequency: path === "/" ? "daily" : "weekly",
        priority: path === "/" ? 1 : 0.8,
      }),
    ),
    ...cebRankingEntries(),
    ...clubs.map((club) =>
      sitemapEntry(`/clubs/${club.slug}`, {
        changeFrequency: "weekly",
        priority: 0.7,
        lastModified: toLastModified(club.updatedAt),
      }),
    ),
    ...federations.map((federation) =>
      sitemapEntry(`/federations/${federation.slug}`, {
        changeFrequency: "weekly",
        priority: 0.7,
        lastModified: toLastModified(federation.updatedAt),
      }),
    ),
    ...players
      .filter((player) => isPlayerIndexable(player.careerTotalMatches))
      .map((player) =>
        sitemapEntry(player.href, {
          changeFrequency: "monthly",
          priority: 0.6,
          lastModified: toLastModified(player.updatedAt),
        }),
      ),
    ...tournamentEvents
      .filter((event) => event.href)
      .map((event) =>
        sitemapEntry(event.href as string, {
          changeFrequency: event.endDate ? "monthly" : "daily",
          priority: event.endDate ? 0.6 : 0.8,
          lastModified: toLastModified(event.updatedAt),
        }),
      ),
    ...rankingSeries.map((series) =>
      sitemapEntry(`/rankings/${series.slug}`, {
        changeFrequency: "weekly",
        priority: 0.7,
      }),
    ),
    // Οι σελίδες ομαδικών διοργανώσεων έλειπαν τελείως από το sitemap.
    ...teamTournaments.map((teamTournament) =>
      sitemapEntry(`/tournaments/team/${buildTeamTournamentSlug(teamTournament)}`, {
        changeFrequency: "weekly",
        priority: 0.6,
      }),
    ),
    ...newsArticles.map((article) =>
      sitemapEntry(`/news/${article.slug}`, {
        changeFrequency: "monthly",
        priority: 0.7,
        lastModified: toLastModified(article.updatedAt || article.publishedAt),
      }),
    ),
  ];

  return Array.from(
    new Map(entries.map((entry) => [entry.url, entry])).values(),
  );
}
