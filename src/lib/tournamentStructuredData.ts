import type { TournamentEventSummary } from "@/lib/tournaments";
import { buildTournamentSlug } from "@/lib/tournaments";
import {
  buildTournamentDateRangeLabel,
  buildTournamentDescription,
  buildTournamentLocationLabel,
  buildTournamentTitle,
  buildTournamentVenueLabel,
} from "@/lib/tournamentSeo";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://billiardtoday.com";

const absoluteUrl = (path: string) =>
  /^https?:\/\//i.test(path)
    ? path
    : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

const cleanText = (value: string | null | undefined) =>
  String(value || "").trim() || undefined;

const buildTournamentUrl = (summary: TournamentEventSummary) =>
  absoluteUrl(`/tournaments/${buildTournamentSlug("", summary.title, summary.season)}`);

const buildLocationName = (summary: TournamentEventSummary) =>
  cleanText(buildTournamentVenueLabel(summary) || buildTournamentLocationLabel(summary));

const buildAddress = (summary: TournamentEventSummary) => {
  const city = cleanText(summary.venueCity || summary.clubCity);
  const country = cleanText(summary.venueCountry || summary.clubCountry);

  if (!city && !country) return undefined;

  return {
    "@type": "PostalAddress",
    ...(city ? { addressLocality: city } : {}),
    ...(country ? { addressCountry: country } : {}),
  };
};

export function buildTournamentStructuredData(summary: TournamentEventSummary) {
  const title = buildTournamentTitle(summary);
  const url = buildTournamentUrl(summary);
  const description =
    cleanText(summary.description) ||
    buildTournamentDescription(summary) ||
    cleanText(
      [
        title,
        summary.gameType ? `${summary.gameType} event` : "billiards event",
        buildTournamentDateRangeLabel(summary.startDate, summary.endDate),
        buildLocationName(summary),
      ]
        .filter(Boolean)
        .join(" - "),
    ) ||
    `${title} tournament page with stages, standings, schedule, and results.`;

  const locationName = buildLocationName(summary);
  const locationAddress = buildAddress(summary);
  const organizerName =
    cleanText(
      summary.organizerType === "federation"
        ? summary.rankingSeriesTitle
        : summary.clubName,
    ) || "Billiard Today";

  const sportsEvent = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: title,
    description,
    url,
    ...(summary.startDate ? { startDate: summary.startDate } : {}),
    ...(summary.endDate ? { endDate: summary.endDate } : {}),
    sport: summary.gameType || "Billiards",
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    organizer: {
      "@type": "Organization",
      name: organizerName,
      url: SITE_URL,
    },
    performer: {
      "@type": "Organization",
      name: "Billiard Today",
      url: SITE_URL,
    },
    ...(locationName
      ? {
          location: {
            "@type": "Place",
            name: locationName,
            ...(locationAddress ? { address: locationAddress } : {}),
          },
        }
      : {}),
  };

  const breadcrumbList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Tournaments",
        item: absoluteUrl("/tournaments"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: title,
        item: url,
      },
    ],
  };

  return [sportsEvent, breadcrumbList];
}
