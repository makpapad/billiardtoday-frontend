import type { MetadataRoute } from "next";
import { getClubs, getFederations } from "@/lib/directory";
import { listNewsArticles } from "@/lib/cms/news";
import { listPlayers, listTournamentEvents } from "@/lib/publicSiteData";
import { fetchRankingSeriesIndex } from "@/lib/rankings";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://billiardtoday.com";

export const dynamic = "force-dynamic";

const staticRoutes = [
  "/",
  "/tournaments",
  "/players",
  "/clubs",
  "/federations",
  "/rankings",
  "/news",
  "/live",
  "/manual",
  "/privacy-policy",
  "/terms-of-service",
  "/cookie-policy",
] as const;

const toAbsoluteUrl = (path: string) =>
  `${siteUrl.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

const sitemapEntry = (
  path: string,
  options: Pick<MetadataRoute.Sitemap[number], "changeFrequency" | "priority"> = {},
): MetadataRoute.Sitemap[number] => ({
  url: toAbsoluteUrl(path),
  lastModified: new Date(),
  ...options,
});

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [clubs, federations, players, tournamentEvents, rankingSeries, newsArticles] =
    await Promise.all([
      getClubs().catch(() => []),
      getFederations().catch(() => []),
      listPlayers(5000).catch(() => []),
      listTournamentEvents(1000).catch(() => []),
      fetchRankingSeriesIndex().catch(() => []),
      listNewsArticles(500).catch(() => []),
    ]);

  const entries = [
    ...staticRoutes.map((path) =>
      sitemapEntry(path, {
        changeFrequency: path === "/" ? "daily" : "weekly",
        priority: path === "/" ? 1 : 0.8,
      }),
    ),
    ...clubs.map((club) =>
      sitemapEntry(`/clubs/${club.slug}`, {
        changeFrequency: "weekly",
        priority: 0.7,
      }),
    ),
    ...federations.map((federation) =>
      sitemapEntry(`/federations/${federation.slug}`, {
        changeFrequency: "weekly",
        priority: 0.7,
      }),
    ),
    ...players.map((player) =>
      sitemapEntry(player.href, {
        changeFrequency: "monthly",
        priority: 0.6,
      }),
    ),
    ...tournamentEvents
      .filter((event) => event.href)
      .map((event) =>
        sitemapEntry(event.href, {
          changeFrequency: event.endDate ? "monthly" : "daily",
          priority: event.endDate ? 0.6 : 0.8,
        }),
      ),
    ...rankingSeries.map((series) =>
      sitemapEntry(`/rankings/${series.slug}`, {
        changeFrequency: "weekly",
        priority: 0.7,
      }),
    ),
    ...newsArticles.map((article) =>
      sitemapEntry(`/news/${article.slug}`, {
        changeFrequency: "monthly",
        priority: 0.7,
      }),
    ),
  ];

  return Array.from(
    new Map(entries.map((entry) => [entry.url, entry])).values(),
  );
}
