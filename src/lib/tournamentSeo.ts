import type { TournamentEventSummary } from "@/lib/tournaments";

const cleanText = (value: string | null | undefined) =>
  String(value || "").trim() || "";

export const appendSeasonIfMissing = (
  title: string,
  season?: number | null,
) => {
  const cleanTitle = cleanText(title);
  const cleanSeason =
    typeof season === "number" && Number.isFinite(season) ? String(season) : "";

  if (!cleanTitle || !cleanSeason) return cleanTitle;
  return new RegExp(`(?:^|[\\s\\-(),/])${cleanSeason}$`).test(cleanTitle)
    ? cleanTitle
    : `${cleanTitle} ${cleanSeason}`;
};

export const buildTournamentTitle = (summary: TournamentEventSummary) =>
  appendSeasonIfMissing(summary.title, summary.season);

export const buildTournamentVenueLabel = (summary: TournamentEventSummary) =>
  cleanText(summary.venueName || summary.clubName);

export const buildTournamentLocationLabel = (summary: TournamentEventSummary) =>
  [summary.venueCity || summary.clubCity, summary.venueCountry || summary.clubCountry]
    .map((value) => cleanText(value))
    .filter(Boolean)
    .join(", ");

export const formatTournamentDate = (
  value: string | null,
  locale = "en-US",
) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const buildTournamentDateRangeLabel = (
  start: string | null,
  end: string | null,
  locale = "en-US",
) => {
  const startText = formatTournamentDate(start, locale);
  const endText = formatTournamentDate(end, locale);

  if (startText && endText) {
    return startText === endText ? startText : `${startText} - ${endText}`;
  }

  return startText || endText || null;
};

export const buildTournamentDescription = (
  summary: TournamentEventSummary,
  locale = "en-US",
) => {
  const title = buildTournamentTitle(summary);
  const gameType = cleanText(summary.gameType);
  const venueName = buildTournamentVenueLabel(summary);
  const location = buildTournamentLocationLabel(summary);
  const dateWindow = buildTournamentDateRangeLabel(
    summary.startDate,
    summary.endDate,
    locale,
  );

  const parts = [
    title,
    gameType ? `${gameType} tournament` : "billiard tournament",
    venueName || location ? `held at ${venueName || location}` : "",
    location && venueName ? `in ${location}` : "",
    dateWindow ? `scheduled for ${dateWindow}` : "",
    "with schedule, stages, standings, participants, live updates, and results.",
  ].filter(Boolean);

  return parts.join(" ");
};
