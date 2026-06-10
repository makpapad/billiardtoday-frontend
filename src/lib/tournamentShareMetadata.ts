import type { Metadata } from "next";
import { buildTournamentSlug, type TournamentEventSummary } from "@/lib/tournaments";
import {
  buildTournamentDescription,
  buildTournamentTitle,
} from "@/lib/tournamentSeo";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://billiardtoday.com";
const LONGONI_U21_SLUG = "longoni-next-gen-grand-prix-3-cushion-u21-2026";
const LONGONI_U21_OG_IMAGE =
  "/img/og/longoni-next-gen-grand-prix-3-cushion-u21-2026.jpg";
const TOURNAMENT_OG_IMAGE_VERSION = "powered-by-bt-20260610";

const absoluteUrl = (path: string) =>
  /^https?:\/\//i.test(path)
    ? path
    : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

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
  const title = buildTournamentTitle(summary);
  const description = buildTournamentDescription(summary);
  const path = `${options?.embedded ? "/embed" : ""}/tournaments/${slug}`;
  const canonicalPath = `/tournaments/${slug}`;
  const ogImage = absoluteUrl(
    slug === LONGONI_U21_SLUG
      ? LONGONI_U21_OG_IMAGE
      : `/api/og/tournament/${encodeURIComponent(slug)}?v=${TOURNAMENT_OG_IMAGE_VERSION}`,
  );

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
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    robots: options?.embedded
      ? {
          index: false,
          follow: false,
        }
      : undefined,
  };
}
