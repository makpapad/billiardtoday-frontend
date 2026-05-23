import type { Metadata } from "next";
import { buildTournamentSlug, type TournamentEventSummary } from "@/lib/tournaments";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://billiardtoday.com";
const LONGONI_U21_SLUG = "longoni-next-gen-grand-prix-3-cushion-u21-2026";
const LONGONI_U21_OG_IMAGE =
  "/img/og/longoni-next-gen-grand-prix-3-cushion-u21-2026.jpg";

const absoluteUrl = (path: string) =>
  /^https?:\/\//i.test(path)
    ? path
    : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

const appendSeasonIfMissing = (title: string, season?: number | null) => {
  const cleanTitle = String(title || "").trim();
  const cleanSeason =
    typeof season === "number" && Number.isFinite(season) ? String(season) : "";

  if (!cleanSeason || !cleanTitle) return cleanTitle;
  return new RegExp(`(?:^|[\\s\\-(),/])${cleanSeason}$`).test(cleanTitle)
    ? cleanTitle
    : `${cleanTitle} ${cleanSeason}`;
};

const buildTournamentDescription = (summary: TournamentEventSummary) => {
  const title = appendSeasonIfMissing(summary.title, summary.season);
  const gameType = String(summary.gameType || "").trim();
  const venueName = String(summary.venueName || summary.clubName || "").trim();
  const location = [summary.venueCity || summary.clubCity, summary.venueCountry || summary.clubCountry]
    .filter(Boolean)
    .join(", ")
    .trim();
  const dateWindow =
    summary.startDate && summary.endDate
      ? `${summary.startDate} to ${summary.endDate}`
      : summary.startDate || summary.endDate || "";

  const parts = [
    title,
    gameType ? `${gameType} tournament` : "billiard tournament",
    venueName || location ? `held at ${venueName || location}` : "",
    location && venueName ? `in ${location}` : "",
    dateWindow ? `running ${dateWindow}` : "",
    "with schedule, stages, standings, live updates, and results.",
  ].filter(Boolean);

  return parts.join(" ");
};

export function buildTournamentShareMetadata(
  summary: TournamentEventSummary | null,
  options?: { embedded?: boolean },
): Metadata {
  if (!summary) {
    return {
      title: options?.embedded ? "Tournament Embed" : "Tournament not found",
    };
  }

  const slug = buildTournamentSlug("", summary.title, summary.season);
  const title = appendSeasonIfMissing(summary.title, summary.season);
  const description = buildTournamentDescription(summary);
  const path = `${options?.embedded ? "/embed" : ""}/tournaments/${slug}`;
  const canonicalPath = `/tournaments/${slug}`;
  const ogImage = slug === LONGONI_U21_SLUG ? absoluteUrl(LONGONI_U21_OG_IMAGE) : null;

  return {
    title: options?.embedded ? `${summary.title} Embed` : title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: "website",
      locale: "el_GR",
      siteName: "Billiard Today",
      title,
      description,
      url: absoluteUrl(path),
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: summary.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    robots: options?.embedded
      ? {
          index: false,
          follow: false,
        }
      : undefined,
  };
}
