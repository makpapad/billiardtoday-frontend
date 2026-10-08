/**
 * CEB official rankings — shared types and pure helpers.
 *
 * NO node:fs here: client components import this module too. The JSON readers
 * live in `cebRankingData.ts` (server components only).
 *
 * The data comes from `public/data/ceb-ranking/*.json`, produced by the importer
 * (`docs/ai/ceb-ranking/build_ceb_data.py`) from the official CEB PDF. It sits
 * under public/ so the daily importer can rewrite it on the server without a
 * rebuild; the pages revalidate every 5 min, so a new edition appears on its own.
 */

export type CebRankingEvent = {
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

/**
 * Χρώμα σήμανσης του αποκλεισμένου αθλητή, όπως στο επίσημο φύλλο της CEB:
 * γκρι = αποκλεισμός 1 χρόνου, κίτρινο = αποκλεισμός 3 μηνών.
 */
export type CebSuspensionMark = "grey" | "yellow";

/** Αποκλεισμός στη νέα μορφή που στέλνει η μηχανή. */
export type CebSuspension = {
  mark: CebSuspensionMark;
  since: string | null;
  until: string | null;
  tillFurtherNotice: boolean;
};

/**
 * Το `suspended` κάθε γραμμής: ημερομηνία σε μορφή string (παλιά μορφή — γκρι,
 * χωρίς ημερομηνία λήξης· «till further notice»), αντικείμενο (νέα μορφή) ή null.
 */
export type CebSuspensionValue = string | CebSuspension | null;

/**
 * Κανονικοποιεί το `suspended` της γραμμής σε μία μορφή, ώστε ο πίνακας να
 * δουλεύει και με τις δύο μορφές δεδομένων:
 * - string ημερομηνίας → γκρι, από εκείνη την ημερομηνία, χωρίς λήξη
 *   (till further notice)
 * - αντικείμενο → όπως δίνεται· το `mark` πέφτει σε γκρι όταν λείπει ή είναι άγνωστο
 */
export const normalizeCebSuspension = (
  value: CebSuspensionValue | undefined,
): CebSuspension | null => {
  if (!value) return null;
  if (typeof value === "string") {
    const since = value.trim();
    return since ? { mark: "grey", since, until: null, tillFurtherNotice: true } : null;
  }
  const since = typeof value.since === "string" && value.since.trim() ? value.since.trim() : null;
  const until = typeof value.until === "string" && value.until.trim() ? value.until.trim() : null;
  return {
    mark: value.mark === "yellow" ? "yellow" : "grey",
    since,
    until,
    tillFurtherNotice: value.tillFurtherNotice ?? !until,
  };
};

/**
 * Ο μύθος του επίσημου φύλλου της CEB, αυτολεξεί στα αγγλικά (όπως στο PDF).
 * Δεν αλλάζει η διατύπωσή του.
 */
export const CEB_SUSPENSION_LEGEND =
  "Grey marked entries suspended for 1 year starting from the mentioned date and till further notice. Yellow marked entries suspended for 3 months from the mentioned date.";

export type CebRankingRow = {
  rank: number;
  name: string;
  fed: string;
  points: number;
  ev: (number | null)[];
  suspended: CebSuspensionValue;
};

export type CebRankingCounts = {
  players: number;
  federations: number;
  suspended: number;
};

/** Link του πίνακα CEB προς το προφίλ του παίκτη (κλειδί = η θέση/rank της γραμμής). */
export type CebPlayerLink = {
  id: number;
  slug: string;
  db: string;
  kind?: string;
};

export type CebPlayerLinks = Record<string, CebPlayerLink>;

/**
 * Κανονικοποίηση ονόματος για αντιστοίχιση ταυτότητας: πεζά, χωρίς τόνους/διακριτικά,
 * με ένα κενό ανάμεσα στα λεκτικά. Η σειρά των λεκτικών διατηρείται (δεν ταξινομείται),
 * ώστε η αντιστοίχιση γραμμής ↔ `db` να μην παράγει ψευδείς ταιριάσματα.
 */
export const normalizeCebName = (value: string | null | undefined): string =>
  (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Ίδιο με το `normalizeCebName`, αλλά με ταξινομημένα λεκτικά (για αντίστροφη αναζήτηση). */
export const normalizeCebNameLoose = (value: string | null | undefined): string =>
  normalizeCebName(value).split(" ").filter(Boolean).sort().join(" ");

/**
 * Ευρετήριο ταυτότητας των συνδέσμων προφίλ: κανονικοποιημένο όνομα (`db`) → σύνδεσμος.
 * Χτίζεται μία φορά ανά λίστα αντί να γίνεται αναζήτηση σε κάθε γραμμή.
 */
export const buildCebPlayerLinkIndex = (
  links?: CebPlayerLinks,
): Map<string, CebPlayerLink> => {
  const index = new Map<string, CebPlayerLink>();
  if (!links) return index;
  for (const link of Object.values(links)) {
    const key = normalizeCebName(link?.db);
    if (key && !index.has(key)) index.set(key, link);
  }
  return index;
};

/**
 * Ο σύνδεσμος προφίλ μιας γραμμής του πίνακα — ΜΕ ΤΑΥΤΟΤΗΤΑ, όχι με θέση.
 *
 * Το αρχείο `player-links*.json` είναι keyed με τη ΘΕΣΗ, αλλά η σειρά του δεν
 * συμπίπτει με τις γραμμές της λίστας· μια αλλαγή αρίθμησης θα έδειχνε άλλον
 * αθλητή. Πρώτα ψάχνουμε σύνδεσμο με το ίδιο κανονικοποιημένο όνομα, και τη θέση
 * τη δεχόμαστε μόνο ως fallback — και ΠΟΤΕ σύνδεσμο του οποίου το όνομα δεν
 * ταιριάζει με τη γραμμή.
 */
export const resolveCebPlayerLink = (
  row: { name: string; rank: number },
  links?: CebPlayerLinks,
  index?: Map<string, CebPlayerLink>,
): CebPlayerLink | undefined => {
  if (!links) return undefined;
  const nameKey = normalizeCebName(row.name);
  if (!nameKey) return undefined;
  const byName = index ?? buildCebPlayerLinkIndex(links);
  const identity = byName.get(nameKey);
  if (identity) return identity;
  const positional = links[String(row.rank)];
  if (positional && normalizeCebName(positional.db) === nameKey) return positional;
  return undefined;
};

export type CebRankingPayload = {
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
  counts: CebRankingCounts;
  events: CebRankingEvent[];
  federations: Record<string, string>;
  rows: CebRankingRow[];
  /**
   * Ποιο αρχείο συνδέσμων προφίλ (θέση → παίκτης) ανήκει σε αυτή τη λίστα:
   * "official" (προεπιλογή, `player-links.json`) ή "computed"
   * (`player-links-computed.json`) — η αρίθμηση των θέσεων αλλάζει μαζί με τη λίστα.
   */
  links?: string;
  /** "computed" = υπολογισμένη από τα δικά μας αποτελέσματα, όχι αντίγραφο του PDF. */
  dataSource?: string;
};

export type CebRankingIndexEntry = {
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

export type CebRankingIndex = {
  sourcePage: string;
  generatedAt: string;
  available: CebRankingIndexEntry[];
  /**
   * Οι κατατάξεις που δεν έχουν ακόμη χτιστεί στο BilliardToday. Όσο λείπουν, ο κόμβος
   * τις δείχνει με σύνδεσμο προς το επίσημο PDF τους στη CEB (`pdfUrl`) — απόλυτο URL,
   * ώστε να μη χρειάζεται rebuild όταν η CEB αλλάξει αρχείο.
   */
  upcoming: Array<{ title: string; file: string; pdfUrl?: string; note?: string }>;
};

export const CEB_RANKING_HUB_PATH = "/rankings/ceb";
export const CEB_RANKING_PAGE_SIZE = 50;

export const formatCebDate = (value: string | null | undefined): string | null => {
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

export const formatCebScale = (scale: number[]) => scale.join(" / ");

export const cebRankingHref = (slug: string) => `${CEB_RANKING_HUB_PATH}/${slug}`;

/**
 * Rankings archive — κάθε δημοσιευμένη έκδοση κρατιέται σε δικό της αντίγραφο
 * (`public/data/ceb-ranking/archive/<slug>/<key>.json`), ώστε μια νέα έκδοση να
 * μην σβήνει την προηγούμενη. Το κλειδί βγαίνει από την έκδοση: "16/2026" -> "16-2026".
 */
export const cebEditionKey = (edition: string): string => edition.trim().replace(/\//g, "-");

export const cebEditionHref = (slug: string, key: string) =>
  `${CEB_RANKING_HUB_PATH}/${slug}/${key}`;

/** «16/2026» -> «2026» (η σεζόν), για ταξινόμηση και εμφάνιση. */
export const cebEditionSeason = (edition: string): string => edition.split("/")[1]?.trim() ?? "";

export type CebRankingArchiveEdition = {
  key: string;
  edition: string;
  updatedAt: string | null;
  archivedAt: string;
  players: number;
  federations: number;
  suspended: number;
  sourceUrl: string;
  /**
   * Προαιρετικά πεδία που γράφονται μόνο όταν κρατάμε και το δικό μας
   * υπολογισμένο αντίγραφο της έκδοσης (`archive/<slug>/<key>.computed.json`).
   * Οι παλιές εγγραφές δεν τα έχουν — ό,τι λείπει πέφτει στα βασικά πεδία.
   */
  computedFile?: string | null;
  computedAt?: string | null;
  computedPlayers?: number | null;
  computedPoints?: number | null;
};

export type CebRankingArchive = {
  slug: string;
  title: string;
  generatedAt: string;
  /** Νεότερη έκδοση πρώτη. */
  editions: CebRankingArchiveEdition[];
};
