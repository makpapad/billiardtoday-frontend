import type { Metadata } from "next";
import { buildTournamentSlug, type TournamentEventSummary } from "@/lib/tournaments";
import {
  buildTournamentDescription,
  buildTournamentTitle,
} from "@/lib/tournamentSeo";
import { buildOpenGraphImage, toAbsoluteUrl } from "@/lib/socialMetadata";

const LONGONI_U21_SLUG = "longoni-next-gen-grand-prix-3-cushion-u21-2026";
const LONGONI_U21_OG_IMAGE =
  "/img/og/longoni-next-gen-grand-prix-3-cushion-u21-2026.jpg";
const TOURNAMENT_OG_IMAGE_VERSION = "powered-by-bt-no-organizer-logo-20260610";
// Bump when the group share card design/data layout changes: Facebook caches
// the og:image by URL, so a changed URL (new v) forces a fresh download.
const TOURNAMENT_GROUP_OG_VERSION = "dark-v6-20260904";

export function buildTournamentShareMetadata(
  summary: TournamentEventSummary | null,
  options?: {
    embedded?: boolean;
    /** Preferred stage document id (deep-link context). */
    stage?: string | null;
    /** Group label/number to render the group share card for. */
    group?: string | null;
  },
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
  const hasGroupContext = Boolean(options?.group);
  const hasStageContext = Boolean(options?.stage) && !hasGroupContext;
  const contextGroup = options?.group ?? null;
  const contextStage = options?.stage ?? null;
  // Facebook follows og:url — when sharing a specific group or a stage
  // (by-country stats), og:url keeps the query params so the scrape stays on
  // the deep-linked page instead of falling back to the canonical default.
  const contextQuery =
    hasGroupContext
      ? `?${contextStage ? `stage=${encodeURIComponent(contextStage)}&` : ""}group=${encodeURIComponent(contextGroup ?? "")}`
      : hasStageContext
        ? `?stage=${encodeURIComponent(contextStage ?? "")}`
        : "";
  const shareUrl = `${path}${contextQuery}`;
  const ogImagePath =
    slug === LONGONI_U21_SLUG
      ? LONGONI_U21_OG_IMAGE
      : contextQuery
        ? `/api/og/tournament/${encodeURIComponent(slug)}${contextQuery}&v=${TOURNAMENT_GROUP_OG_VERSION}`
        : `/api/og/tournament/${encodeURIComponent(slug)}?v=${TOURNAMENT_OG_IMAGE_VERSION}`;
  const socialImage = buildOpenGraphImage({
    url: ogImagePath,
    width: 1200,
    height: 630,
    alt: hasGroupContext ? `${summary.title} · Group ${contextGroup}` : summary.title,
    type: slug === LONGONI_U21_SLUG ? "image/jpeg" : "image/png",
  });

  const ogTitle = hasGroupContext
    ? `${title} · Group ${contextGroup}`
    : title;
  const ogDescription = hasGroupContext
    ? `${description} Group ${contextGroup} results and standings.`
    : description;

  return {
    title: options?.embedded ? `${summary.title} Embed` : ogTitle,
    description: ogDescription,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: "website",
      locale: "el_GR",
      siteName: "Billiard Today",
      title: ogTitle,
      description: ogDescription,
      url: toAbsoluteUrl(shareUrl),
      images: socialImage ? [socialImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: socialImage ? [String(socialImage.url)] : undefined,
    },
    robots: options?.embedded
      ? {
          index: false,
          follow: false,
        }
      : undefined,
  };
}
