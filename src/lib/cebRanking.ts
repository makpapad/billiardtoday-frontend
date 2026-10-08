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

/**
 * Επεξηγηματικό κείμενο μιας λίστας CEB (η αριστερή στήλη «How this list is built»).
 * Είναι data-driven: κάθε κατηγορία φέρνει το δικό της κείμενο στο JSON, ώστε άλλες
 * κατηγορίες (π.χ. Ladies) να μην κληρονομούν το κείμενο του Individual. Όταν το πεδίο
 * λείπει, το `resolveCebIntro` χτίζει ένα γενικό κείμενο από τα δικά της τουρνουά.
 */
export type CebRankingIntroItem = {
  /** Έντονη αρχή της παραγράφου (προαιρετική). */
  lead: string;
  /** Η συνέχεια/επεξήγηση. */
  body: string;
};

/** Γραμμή του πίνακα «How players earn points» (θέση → πόντοι· null = δεν πληρώνει). */
export type CebRankingPointsRow = {
  label: string;
  values: (number | null)[];
};

export type CebRankingIntro = {
  items: CebRankingIntroItem[];
  /** Κεφαλίδες στηλών της κλίμακας· όταν λείπει, χρησιμοποιούνται οι πρότυπες της CEB. */
  pointsHeader?: string[];
  pointsRows: CebRankingPointsRow[];
  pointsNote?: string;
};

/** Πρότυπες κεφαλίδες στηλών της κλίμακας πόντων (1 … 32, με την τελευταία στήλη «**»). */
export const CEB_POINTS_HEADER = ["1", "2", "3–4", "5–8", "9–16", "17–32", "**"];

const coerceCebIntro = (value: unknown): CebRankingIntro | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;

  const items: CebRankingIntroItem[] = Array.isArray(raw.items)
    ? raw.items
        .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
        .map((entry) => ({
          lead: typeof entry.lead === "string" ? entry.lead.trim() : "",
          body: typeof entry.body === "string" ? entry.body.trim() : "",
        }))
        .filter((entry) => entry.lead.length > 0 || entry.body.length > 0)
    : [];

  const pointsRows: CebRankingPointsRow[] = Array.isArray(raw.pointsRows)
    ? raw.pointsRows
        .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
        .map((entry) => ({
          label: typeof entry.label === "string" ? entry.label.trim() : "",
          values: Array.isArray(entry.values)
            ? entry.values.map((point) =>
                typeof point === "number" && Number.isFinite(point) ? point : null,
              )
            : [],
        }))
        .filter((entry) => entry.label.length > 0 && entry.values.length > 0)
    : [];

  const pointsHeader = Array.isArray(raw.pointsHeader)
    ? raw.pointsHeader.filter((head): head is string => typeof head === "string").map((head) => head.trim())
    : undefined;
  const pointsNote = typeof raw.pointsNote === "string" ? raw.pointsNote.trim() : "";

  if (items.length === 0 && pointsRows.length === 0) return null;
  return { items, pointsHeader, pointsRows, pointsNote };
};

/** Σκάλα κλίμακας σε επτά στήλες (όσοι και οι θέσεις του πίνακα), με `null` για το κενό. */
const padScale = (scale: number[]): (number | null)[] => {
  const values: (number | null)[] = scale.slice(0, CEB_POINTS_HEADER.length);
  while (values.length < CEB_POINTS_HEADER.length) values.push(null);
  return values;
};

/** «B, C, D» → «B–D» όταν τα κλειδιά είναι συνεχόμενα μονογράμματα· αλλιώς λίστα με κόμματα. */
const columnRangeLabel = (keys: string[]): string => {
  if (keys.length === 0) return "";
  if (keys.length === 1) return keys[0];
  const single = keys.every((key) => key.length === 1);
  const contiguous = single && keys.every((key, index) => index === 0 || key.charCodeAt(0) === keys[index - 1].charCodeAt(0) + 1);
  return contiguous ? `${keys[0]}–${keys[keys.length - 1]}` : keys.join(", ");
};

/**
 * Γενικό κείμενο, χτισμένο ΑΠΟΚΛΕΙΣΤΙΚΑ από τα δεδομένα της ίδιας της λίστας, όταν το
 * JSON δεν φέρνει δικό του `intro`. Έτσι μια κατηγορία χωρίς κείμενο δείχνει σωστές
 * πληροφορίες (τα δικά της τουρνουά και τις δικές τους κλίμακες) — ποτέ το κείμενο άλλης.
 */
export const buildFallbackCebIntro = (payload: CebRankingPayload): CebRankingIntro => {
  const events = Array.isArray(payload.events) ? payload.events : [];
  const keys = events.map((event) => event.key).filter(Boolean);
  const range = keys.length > 1 ? `${keys[0]}–${keys[keys.length - 1]}` : (keys[0] ?? "");

  // Ομαδοποίηση των στηλών που μοιράζονται την ίδια κλίμακα πόντων → μία γραμμή πίνακα.
  const groups = new Map<string, { keys: string[]; scale: number[] }>();
  for (const event of events) {
    if (!event || !Array.isArray(event.scale)) continue;
    const key = JSON.stringify(event.scale);
    const existing = groups.get(key);
    if (existing) existing.keys.push(event.key);
    else groups.set(key, { keys: [event.key], scale: event.scale });
  }
  const pointsRows: CebRankingPointsRow[] = Array.from(groups.values()).map((group) => ({
    label: `Columns ${columnRangeLabel(group.keys)}`,
    values: padScale(group.scale),
  }));

  return {
    items: [
      {
        lead: "European players only.",
        body: "The CEB ranking is a European circuit — only players registered with a European federation are listed.",
      },
      {
        lead: `${events.length} counting tournaments.`,
        body: `Every total is the points a player earned in the tournaments that count for this list${
          range ? ` (columns ${range})` : ""
        }. The columns that do not count stay empty.`,
      },
      {
        lead: "Points follow the official scale.",
        body: "Each tournament pays the finishing positions as printed on the official CEB sheet — the scale of every column is shown next to it.",
      },
      {
        lead: "Ties follow the official order.",
        body: "Players on the same total are ordered as the official CEB sheet publishes them.",
      },
    ],
    pointsRows,
    pointsNote: "Points per finishing position, exactly as printed at the top of the official CEB list.",
  };
};

/**
 * Το επεξηγηματικό κείμενο της λίστας: το `intro` του JSON όταν υπάρχει (αντικείμενο ή
 * απλό κείμενο), αλλιώς το `dataNote`, αλλιώς το γενικό κείμενο από τα δεδομένα της λίστας.
 * Ποτέ δεν πέφτει σε κείμενο άλλης κατηγορίας.
 */
export const resolveCebIntro = (payload: CebRankingPayload): CebRankingIntro => {
  const structured = coerceCebIntro(payload.intro);
  if (structured) return structured;

  const raw = payload.intro as unknown;
  const note = (typeof raw === "string" ? raw.trim() : "") || (payload.dataNote ?? "").trim();
  if (note) return { items: [{ lead: "", body: note }], pointsRows: [] };

  return buildFallbackCebIntro(payload);
};

/**
 * Σύντομη ετικέτα κατηγορίας για το eyebrow της σελίδας: «Individual — Men» → «Individual»,
 * «Ladies» → «Ladies». Πέφτει στο discipline/τίτλο όταν λείπει η ετικέτα.
 */
export const cebCategoryShortLabel = (
  payload: Pick<CebRankingPayload, "categoryLabel" | "discipline" | "title">,
): string => {
  const label = (payload.categoryLabel ?? "").trim();
  if (label) {
    const short = label.split(/\s*[—–]\s*/)[0]?.trim();
    if (short) return short;
  }
  return payload.discipline?.trim() || payload.title?.trim() || "Ranking";
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
   * Το επεξηγηματικό κείμενο της λίστας (data-driven, ανά κατηγορία). Μπορεί να είναι
   * πλήρες αντικείμενο ή απλό κείμενο· όταν λείπει, ο πίνακας χτίζει γενικό κείμενο
   * από τα δικά του τουρνουά (βλ. `resolveCebIntro`).
   */
  intro?: CebRankingIntro | string;
  /** Εναλλακτικό σημείο εισόδου για το ίδιο κείμενο (απλό κείμενο). */
  dataNote?: string;
  /**
   * Ποιο αρχείο συνδέσμων προφίλ (θέση → παίκτης) ανήκει σε αυτή τη λίστα:
   * "official" (προεπιλογή, `player-links.json`) ή "computed"
   * (`player-links-computed.json`) — η αρίθμηση των θέσεων αλλάζει μαζί με τη λίστα.
   */
  links?: string;
  /** "computed" = υπολογισμένη από τα δικά μας αποτελέσματα, όχι αντίγραφο του PDF. */
  dataSource?: string;
};

export type CebRankingIndexMode = "data" | "pdf";

export type CebRankingIndexEntry = {
  slug: string;
  title: string;
  discipline: string;
  categoryLabel: string;
  edition: string;
  updatedAt: string | null;
  /**
   * Player/federation/suspension counts — absent on `mode: "pdf"` entries (the
   * category is still served as the official CEB sheet, without data).
   */
  players?: number;
  federations?: number;
  suspended?: number;
  href: string;
  sourceUrl: string;
  /**
   * `"pdf"` = the category shows the official CEB sheet inside our page (see
   * `public/data/ceb-ranking/pdf-sources.json`) until the data edition is built;
   * anything else/absent = a regular ranking with a table.
   */
  mode?: CebRankingIndexMode;
};

/**
 * A category still served as the OFFICIAL CEB PDF sheet while the data edition is
 * being prepared. Source: `public/data/ceb-ranking/pdf-sources.json` (written by the
 * importer). A copy of the PDF is kept in `file` (same origin, so it renders in an
 * `<object>`/`<iframe>` without X-Frame-Options issues).
 */
export type CebPdfCategory = {
  slug: string;
  title: string;
  discipline: string;
  categoryLabel: string;
  /** E.g. "13/2026" — the edition as the CEB sheet writes it. */
  editionLabel: string;
  /** Last-update date of the sheet (YYYY-MM-DD) or null. */
  lastUpdate: string | null;
  lastUpdateNote?: string | null;
  /** Absolute URL of the official PDF at the CEB (eurobillard.org) — opens in a new tab. */
  pdfUrl: string;
  /** Self-hosted copy, a relative path under public/ (e.g. `/data/ceb-ranking/pdf/3c-ladies.pdf`). */
  file: string;
  bytes?: number | null;
  sha256?: string | null;
  fetchedAt?: string | null;
  rows?: number | null;
  /** true = the sheet has rows marked as suspended (grey/yellow) — we show the legend. */
  suspendedNote?: boolean;
};

export type CebPdfSources = {
  generatedAt: string;
  sourcePage: string;
  note?: string;
  categories: CebPdfCategory[];
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
