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
const TOURNAMENT_OG_IMAGE_VERSION = "jpeg-20261105";
// Bump when the group share card design/data layout changes: Facebook caches
// the og:image by URL, so a changed URL (new v) forces a fresh download.
// 20260907: bumped to v10 — ea22bab reverted the WebP route server-side and FB
// cached the blank result under the old v9 URL; new URL forces a fresh scrape.
const TOURNAMENT_GROUP_OG_VERSION = "v11-jpeg-20261105";
/** Bump όταν αλλάζει η σχεδίαση της κάρτας αγώνα. */
const TOURNAMENT_MATCH_OG_VERSION = "v5-scores-under-names-20261105";

export function buildTournamentShareMetadata(
  summary: TournamentEventSummary | null,
  options?: {
    embedded?: boolean;
    /** Preferred stage document id (deep-link context). */
    stage?: string | null;
    /** Group label/number to render the group share card for. */
    group?: string | null;
    /** Match document id — η κάρτα του συγκεκριμένου αγώνα ως og:image. */
    match?: string | null;
    /**
     * Αποτύπωμα του αποτελέσματος (π.χ. «25-18»). Μπαίνει στο URL της κάρτας ώστε
     * μόλις καταχωρηθεί/αλλάξει σκορ να αλλάξει και το URL και το Facebook να
     * ξανακατεβάσει την κάρτα με το αποτέλεσμα αντί για την παλιά «VS».
     */
    matchVersion?: string | null;
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
  const matchContext = (options?.match ?? "").trim() || null;
  const shareUrl = matchContext
    ? `${path}?match=${encodeURIComponent(matchContext)}`
    : `${path}${contextQuery}`;
  const ogImagePath = matchContext
    ? `/api/og/match/${encodeURIComponent(summary.documentId)}/${encodeURIComponent(matchContext)}?format=wide&v=${TOURNAMENT_MATCH_OG_VERSION}${
        options?.matchVersion
          ? `&r=${encodeURIComponent(options.matchVersion)}`
          : ""
      }`
    : slug === LONGONI_U21_SLUG
      ? LONGONI_U21_OG_IMAGE
      : contextQuery
        ? `/api/og/tournament/${encodeURIComponent(slug)}${contextQuery}&v=${TOURNAMENT_GROUP_OG_VERSION}`
        : `/api/og/tournament/${encodeURIComponent(slug)}?v=${TOURNAMENT_OG_IMAGE_VERSION}`;
  const socialImage = buildOpenGraphImage({
    url: ogImagePath,
    width: 1200,
    height: 630,
    alt: matchContext
      ? `${summary.title} · match`
      : hasGroupContext
        ? `${summary.title} · Group ${contextGroup}`
        : summary.title,
    type: "image/jpeg",
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

/**
 * Αποτύπωμα του αποτελέσματος ενός αγώνα (π.χ. «25-18») για το URL της κάρτας.
 *
 * Χρησιμεύει στο cache του Facebook: μόλις καταχωρηθεί ή αλλάξει σκορ, αλλάζει
 * και το URL της εικόνας, οπότε ο crawler κατεβάζει νέα κάρτα με το αποτέλεσμα
 * αντί να δείχνει την παλιά «VS» έκδοση.
 */
export async function resolveMatchResultVersion(
  eventId: string | null | undefined,
  matchId: string | null | undefined,
): Promise<string | null> {
  if (!eventId || !matchId) return null;
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://billiardtoday.com";
  try {
    const res = await fetch(
      `${site}/api/events/${encodeURIComponent(eventId)}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    const payload = await res.json();
    const stages: any[] = Array.isArray(payload?.data?.event_stages)
      ? payload.data.event_stages
      : [];
    for (const stage of stages) {
      const matches: any[] = Array.isArray(stage?.groups) ? stage.groups : [];
      const hit = matches.find(
        (m: any) =>
          String(m?.documentId ?? "") === matchId ||
          String(m?.id ?? "") === matchId,
      );
      if (!hit) continue;
      const p1 = Number(hit?.player1_points ?? 0);
      const p2 = Number(hit?.player2_points ?? 0);
      const i1 = Number(hit?.player1_innings ?? 0);
      const i2 = Number(hit?.player2_innings ?? 0);
      if (p1 === 0 && p2 === 0) return "pre";
      return `${p1}-${p2}-${i1}-${i2}`;
    }
    return null;
  } catch {
    return null;
  }
}
