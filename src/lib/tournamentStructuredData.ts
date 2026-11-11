import type { TournamentEventSummary } from "@/lib/tournaments";
import { buildTournamentSlug } from "@/lib/tournaments";
import { toPlainText } from "@/lib/richText";
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
    toPlainText(summary.description) ||
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
    cleanText(summary.organizerName) ||
    cleanText(
      summary.organizerType === "federation"
        ? summary.rankingSeriesTitle
        : summary.clubName,
    ) ||
    "Billiard Today";
  // Ο πραγματικός διοργανωτής (ομοσπονδία ή σύλλογος), όχι το SITE_URL.
  const organizerUrl = summary.organizerHref
    ? absoluteUrl(summary.organizerHref)
    : undefined;

  const sportsEvent = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: title,
    description,
    url,
    ...(summary.startDate ? { startDate: summary.startDate } : {}),
    ...(summary.endDate ? { endDate: summary.endDate } : {}),
    sport: summary.gameType || "Billiards",
    // Πραγματικοί αγώνες σε φυσικό χώρο: το OnlineEventAttendanceMode ήταν λάθος και
    // η Google απέρριπτε το Event (μετρημένο live 11/11/2026).
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    organizer: {
      "@type": "Organization",
      name: organizerName,
      ...(organizerUrl ? { url: organizerUrl } : {}),
    },
    // ΧΩΡΙΣ performer: το «Billiard Today» ως performer ήταν παραπλανητικό — δεν αγωνίζεται.
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
