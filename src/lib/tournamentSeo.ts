import type { TournamentEventSummary } from "@/lib/tournaments";
import { toPlainText } from "@/lib/richText";

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
  const sourceDescription = toPlainText(summary.description);

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

/**
 * Meta description: μία γραμμή, ≤158 χαρακτήρες, κομμένη σε λέξη.
 * ΧΩΡΙΣ αυτό, μόλις η διοργάνωση αποκτήσει `description`, το meta γινόταν
 * ολόκληρη η πρώτη παράγραφος (1.400+ χαρακτήρες, με αλλαγές γραμμής).
 */
const clampMetaDescription = (value: string, max = 158) => {
  const clean = cleanText(value).replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > 60 ? slice.slice(0, lastSpace) : slice;
  return `${cut.replace(/[\s,;:.\-–]+$/, "")}.`;
};

/** «2-8 November 2026» όταν ίδιος μήνας, «29 October - 3 November 2026» όταν όχι. */
const compactDateRange = (
  start: string | null | undefined,
  end: string | null | undefined,
  locale = "en-US",
) => {
  const parse = (value: string | null | undefined) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const a = parse(start);
  const b = parse(end);
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString(locale, { ...opts, timeZone: "UTC" });
  if (a && b) {
    if (a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth()) {
      return `${a.getUTCDate()}-${b.getUTCDate()} ${fmt(b, { month: "long", year: "numeric" })}`;
    }
    if (a.getUTCFullYear() === b.getUTCFullYear()) {
      return `${fmt(a, { day: "numeric", month: "long" })} - ${fmt(b, { day: "numeric", month: "long", year: "numeric" })}`;
    }
    return `${fmt(a, { day: "numeric", month: "long", year: "numeric" })} - ${fmt(b, { day: "numeric", month: "long", year: "numeric" })}`;
  }
  return a ? fmt(a, { day: "numeric", month: "long", year: "numeric" }) : null;
};

/**
 * Meta description από ΔΕΔΟΜΕΝΑ, όχι από κολόβωμα κειμένου:
 * «<τίτλος>, 2-8 November 2026 at <γήπεδο>, <πόλη>, <χώρα>. Live results, draw and
 * stage-by-stage scores.» Μία γραμμή, ≤158 χαρακτήρες, πάντα ολοκληρωμένη πρόταση.
 */
export const buildTournamentDescription = (
  summary: TournamentEventSummary,
  locale = "en-US",
) => {
  const title = buildTournamentTitle(summary);
  const range = compactDateRange(summary.startDate, summary.endDate, locale);
  const venue = cleanText(summary.venueName || summary.clubName);
  const place = [summary.venueCity || summary.clubCity, summary.venueCountry || summary.clubCountry]
    .map((value) => cleanText(value))
    .filter(Boolean)
    .join(", ");
  const where = venue
    ? ` at ${venue}${place ? `, ${place}` : ""}`
    : place
      ? ` in ${place}`
      : "";
  const core = `${title}${range ? `, ${range}` : ""}${where}.`;
  const tail = " Live results, draw and stage-by-stage scores.";
  return clampMetaDescription(`${core}${tail}`, 158) || core;
};
