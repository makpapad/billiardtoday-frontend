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

const joinClauses = (parts: Array<string | null | undefined>) =>
  parts
    .map((part) => cleanText(part))
    .filter(Boolean)
    .join(" ");

const addSentencePeriod = (value: string) =>
  value.trim().replace(/\s{2,}/g, " ").replace(/\s+\./g, ".").replace(/[.!?]$/, "") + ".";

export const buildTournamentOverviewParagraphs = (
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
  const sourceDescription = cleanText(summary.description);

  const opening = addSentencePeriod(
    joinClauses([
      title,
      gameType ? `brings together ${gameType.toLowerCase()} competition` : "brings together billiards competition",
      dateWindow ? `from ${dateWindow}` : "",
      venueName ? `at ${venueName}` : "",
      location ? `in ${location}` : "",
    ]),
  );

  const coverageParts = [
    "This page brings the event schedule, stage-by-stage progress, participant list, standings, and published results into one place",
    summary.stages.length > 0
      ? `across ${summary.stages.length} stage${summary.stages.length === 1 ? "" : "s"}`
      : "",
    summary.rankingSeriesTitle
      ? `within the ${summary.rankingSeriesTitle} series`
      : "",
  ];
  const coverage = addSentencePeriod(joinClauses(coverageParts));

  const venueContext = venueName
    ? `at ${venueName}${location ? ` in ${location}` : ""}`
    : location
      ? `in ${location}`
      : "";
  const followAlong = addSentencePeriod(
    joinClauses([
      dateWindow
        ? `Follow the event through ${dateWindow}`
        : "Follow the event as updates are published",
      venueContext,
      "with live updates, draw changes, and final results as they become available",
    ]),
  );

  return [sourceDescription, opening, coverage, followAlong].filter(Boolean);
};

export const buildTournamentDescription = (
  summary: TournamentEventSummary,
  locale = "en-US",
) => {
  const title = buildTournamentTitle(summary);
  const overviewParagraphs = buildTournamentOverviewParagraphs(summary, locale);
  const lead = overviewParagraphs[0] || "";
  const fallback = overviewParagraphs[1] || "";

  return cleanText(lead) || cleanText(fallback) || `${title} tournament page with schedule and results.`;
};
