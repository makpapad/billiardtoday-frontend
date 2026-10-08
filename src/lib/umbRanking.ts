/**
 * UMB official rankings — shared types and pure helpers.
 *
 * NO node:fs here: client components import this module too. The JSON readers
 * live in `umbRankingData.ts` (server components only).
 *
 * The data comes from `public/data/umb-ranking/*.json`, produced from the
 * official UMB "Events Ranking" PDF and (when `dataSource: "computed"`) from our
 * own results engine (cebRankingEngine, category `umb-events`). It sits under
 * public/ so the importer can rewrite it on the server without a rebuild; the
 * pages revalidate every 5 min, so a new edition appears on its own.
 *
 * Διαφορές από το CEB (ίδιο σχήμα δεδομένων, άλλο περιεχόμενο):
 *  - Είναι ΠΑΓΚΟΣΜΙΑ κατάταξη: χωρίς «only European» φίλτρο, χωρίς στήλη εθνικών
 *    πρωταθλημάτων. 11 στήλες: 1 Παγκόσμιο Πρωτάθλημα (A) + 10 World Cups (B–K).
 *  - Στοιχεία απουσίας ως ΑΡΝΗΤΙΚΕΣ τιμές στη στήλη του τουρνουά (−8 δεν δηλώθηκε,
 *    −16 δηλώθηκε και δεν αγωνίστηκε), που αφαιρούνται από το σύνολο.
 *  - Δεν υπάρχει αρχείο εκδόσεων (archive) ούτε PDF export.
 */

export type UmbRankingEvent = {
  key: string;
  short: string;
  name: string;
  city: string | null;
  date: string | null;
  scale: number[];
  href: string | null;
  ours: boolean;
  note?: string;
};

export type UmbRankingRow = {
  rank: number;
  name: string;
  fed: string;
  points: number;
  ev: (number | null)[];
  suspended: string | null;
};

export type UmbRankingCounts = {
  players: number;
  federations: number;
  suspended: number;
};

/** Σύνδεσμος του πίνακα UMB προς το προφίλ του παίκτη (κλειδί = η θέση/rank της γραμμής). */
export type UmbPlayerLink = {
  id: number;
  slug: string;
  db: string;
  kind?: string;
};

export type UmbPlayerLinks = Record<string, UmbPlayerLink>;

export type UmbRankingPayload = {
  slug: string;
  title: string;
  discipline: string;
  categoryLabel: string;
  edition: string;
  updatedAt: string | null;
  lastEvent: string | null;
  sourceUrl: string;
  sourcePage: string;
  sourceLabel: string;
  generatedAt: string;
  counts: UmbRankingCounts;
  events: UmbRankingEvent[];
  federations: Record<string, string>;
  rows: UmbRankingRow[];
  /**
   * Ποιο αρχείο συνδέσμων προφίλ (θέση → παίκτης) ανήκει σε αυτή τη λίστα:
   * "computed" (`player-links-computed.json`) ή "official" (`player-links.json`).
   * Η αρίθμηση των θέσεων αλλάζει μαζί με τη λίστα.
   */
  links?: string;
  /** "computed" = υπολογισμένη από τα δικά μας αποτελέσματα, όχι αντίγραφο του PDF. */
  dataSource?: string;
  /** Πεδίο της UMB: η κατάταξη είναι παγκόσμια (πάντα "world" στα δεδομένα μας). */
  scope?: string;
};

export type UmbRankingIndexEntry = {
  slug: string;
  title: string;
  discipline: string;
  categoryLabel: string;
  edition: string;
  updatedAt: string | null;
  players: number;
  federations: number;
  suspended: number;
  href: string;
  sourceUrl: string;
};

export type UmbRankingIndex = {
  sourcePage: string;
  generatedAt: string;
  available: UmbRankingIndexEntry[];
  upcoming?: Array<{ title: string; file: string }>;
};

export const UMB_RANKING_HUB_PATH = "/rankings/umb";
export const UMB_RANKING_PAGE_SIZE = 50;

export const formatUmbScale = (scale: number[]) => scale.join(" / ");

export const umbRankingHref = (slug: string) => `${UMB_RANKING_HUB_PATH}/${slug}`;

export const formatUmbDate = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value;
  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

/**
 * UMB editions archive — κάθε δημοσιευμένη έκδοση κρατιέται σε δικό της αντίγραφο
 * (`public/data/umb-ranking/archive/<slug>/<key>.json`), ώστε μια νέα έκδοση να μην
 * σβήνει την προηγούμενη. Το κλειδί βγαίνει από την έκδοση: "05/2026" -> "05-2026".
 */
export const umbEditionKey = (edition: string): string => edition.trim().replace(/\//g, "-");

export const umbEditionHref = (slug: string, key: string) =>
  `${UMB_RANKING_HUB_PATH}/${slug}/${key}`;

/** «05/2026» -> «2026» (η σεζόν), για ταξινόμηση και εμφάνιση. */
export const umbEditionSeason = (edition: string): string => edition.split("/")[1]?.trim() ?? "";

export type UmbRankingArchiveEdition = {
  key: string;
  edition: string;
  updatedAt: string | null;
  archivedAt: string;
  players: number;
  federations: number;
  suspended: number;
  sourceUrl: string;
};

export type UmbRankingArchive = {
  slug: string;
  title: string;
  generatedAt: string;
  /** Νεότερη έκδοση πρώτη. */
  editions: UmbRankingArchiveEdition[];
};
