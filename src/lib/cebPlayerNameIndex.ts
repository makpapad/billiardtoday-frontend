import { unstable_cache } from "next/cache";
import { SERVER_API_URL } from "@/lib/api";
import {
  cebDbLinkKey,
  normalizeCebName,
  normalizeCebNameLoose,
} from "@/lib/cebRanking";
import type { CebPlayerLink, CebPlayerLinks } from "@/lib/cebRanking";

/**
 * DB-backed name index των παικτών μας (Strapi `bt-players`), για τους πίνακες της CEB.
 *
 * Το γιατί: τα `public/data/ceb-ranking/player-links*.json` φτιάχτηκαν για ΜΙΑ λίστα
 * (3-Cushion Individual) και είναι keyed με θέση — σε κάθε άλλη λίστα (Ladies, Cadre,
 * 1-Cushion, Artistic) το όνομα ενός αθλητή που ΥΠΑΡΧΕΙ στη βάση έμενε σκέτο κείμενο.
 * Εδώ χτίζεται ΕΝΑ ευρετήριο ονομάτων → παίκτη, μία φορά, από τη βάση, και μπαίνει
 * ΔΙΠΛΑ στους συνδέσμους κάθε λίστας (βλ. `buildCebDbPlayerLinks`).
 *
 * Κανόνες (ποτέ μάντεμα):
 * - Ταίριασμα ΜΟΝΟ με πλήρη ονόματα (κανονικοποιημένα: πεζά, χωρίς τόνους/σημεία,
 *   `SURNAME Firstname` ↔ `Firstname Surname`). Τα αρχικά ΔΕΝ ταιριάζουν.
 * - Ο σύνδεσμος δίνεται ΜΟΝΟ όταν το όνομα ανήκει σε ΕΝΑΝ παίκτη. Αν δύο εγγραφές
 *   της βάσης δίνουν το ίδιο κλειδί, το κλειδί μπαίνει ως «διφορούμενο» (null) και
 *   η γραμμή ΔΕΝ παίρνει σύνδεσμο — λάθος σύνδεσμος είναι χειρότερος από καθόλου.
 *
 * Server-only (server components / route handlers).
 */

export type CebDbNameIndex = {
  /** Κανονικοποιημένο όνομα → ο ΜΟΝΑΔΙΚΟΣ παίκτης· `null` = διφορούμενο (ποτέ σύνδεσμος). */
  byName: Map<string, CebPlayerLink | null>;
  /** Id παίκτη → τα κανονικοποιημένα κλειδιά του (για το προφίλ → γραμμή λίστας). */
  namesById: Map<number, Set<string>>;
};

type PlayerNameEntry = {
  /** Strapi numeric id (ο αριθμός του `/players/<id>-<slug>`). */
  id: number;
  /** Το εμφανιζόμενο όνομα (αγγλικό όπου υπάρχει) με τα κενά σε παύλες. */
  slug: string;
  /** Ονόματα όπως τα κρατά η βάση (αγγλικά + μητρικά). */
  names: string[];
};

/** Πόσο συχνά ξαναδιαβάζεται το ευρετήριο από τη βάση (το URL του προφίλ δεν αλλάζει σχεδόν ποτέ). */
const INDEX_REVALIDATE_SECONDS = 3600;
const PAGE_SIZE = 1000;
const MAX_PAGES = 12;
const FETCH_TIMEOUT_MS = 8000;

const readString = (value: unknown): string | null => {
  const clean = String(value ?? "").trim();
  return clean || null;
};

const unwrapEntity = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const attributes = row.attributes;
  return attributes && typeof attributes === "object"
    ? { ...(attributes as Record<string, unknown>), ...row }
    : row;
};

/** Το τμήμα-slug του `/players/<id>-<slug>` — ίδιος κανόνας με το `buildPlayerHref` του publicSiteData. */
const slugFromName = (name: string): string => name.trim().replace(/\s+/g, "-");

/**
 * Όλοι οι παίκτες της βάσης, μόνο με τα πεδία που χρειάζεται το ευρετήριο.
 * Σελίδες των 1000 (όριο του endpoint) — σήμερα 4 σελίδες για ~3.250 παίκτες.
 */
const fetchPlayerNameEntries = async (): Promise<PlayerNameEntry[]> => {
  const token = process.env.STRAPI_API_TOKEN;
  const headers: HeadersInit | undefined = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;
  const entries = new Map<number, PlayerNameEntry>();

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const params = new URLSearchParams();
    params.set("pagination[page]", String(page));
    params.set("pagination[pageSize]", String(PAGE_SIZE));
    params.set("fields[0]", "full_name");
    params.set("fields[1]", "full_name_en");
    // Πλασματικοί δοκιμαστικοί λογαριασμοί («Player 01»…) δεν ανήκουν σε καμία λίστα.
    params.set("filters[is_test_player][$ne]", "true");

    const res = await fetch(`${SERVER_API_URL}/api/bt-players?${params.toString()}`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`bt-players name index failed: ${res.status}`);
    }

    const json = (await res.json().catch(() => null)) as
      | { data?: unknown[]; meta?: { pagination?: { pageCount?: number } } }
      | null;
    const rows = Array.isArray(json?.data) ? json.data : [];

    for (const raw of rows) {
      const entity = unwrapEntity(raw);
      const id = Number(entity?.id);
      const english = readString(entity?.full_name_en);
      const native = readString(entity?.full_name);
      if (!Number.isFinite(id) || (!english && !native)) continue;

      const names = Array.from(new Set([english, native].filter((name): name is string => Boolean(name))));
      const display = english ?? native ?? "";
      const existing = entries.get(id);
      if (existing) {
        for (const name of names) {
          if (!existing.names.includes(name)) existing.names.push(name);
        }
      } else {
        entries.set(id, { id, slug: slugFromName(display), names });
      }
    }

    const pageCount = Number(json?.meta?.pagination?.pageCount) || 1;
    if (rows.length === 0 || page >= pageCount) break;
  }

  return Array.from(entries.values());
};

/**
 * ΜΙΑ ανάγνωση της βάσης ανά ώρα, ό,τι κι αν ζητήσει ο render (Next data cache) — ο
 * πίνακας δεν κάνει εκατοντάδες lookups, μόνο ένα φορτωμένο ευρετήριο στη μνήμη.
 */
const readPlayerNameEntriesCached = unstable_cache(
  fetchPlayerNameEntries,
  ["ceb-player-name-index-v1"],
  { revalidate: INDEX_REVALIDATE_SECONDS, tags: ["ceb-player-name-index"] },
);

const buildIndex = async (): Promise<CebDbNameIndex> => {
  const entries = await readPlayerNameEntriesCached();

  const linksById = new Map<number, CebPlayerLink>();
  const keysById = new Map<number, Set<string>>();
  const idsByKey = new Map<string, Set<number>>();

  for (const entry of entries) {
    linksById.set(entry.id, {
      id: entry.id,
      slug: entry.slug,
      db: entry.names[0] ?? entry.slug,
      kind: "db",
    });

    const keys = new Set<string>();
    for (const name of entry.names) {
      const strict = normalizeCebName(name);
      if (strict) keys.add(strict);
      const loose = normalizeCebNameLoose(name);
      if (loose) keys.add(loose);
    }
    keysById.set(entry.id, keys);

    for (const key of keys) {
      const ids = idsByKey.get(key);
      if (ids) ids.add(entry.id);
      else idsByKey.set(key, new Set([entry.id]));
    }
  }

  const byName = new Map<string, CebPlayerLink | null>();
  for (const [key, ids] of idsByKey) {
    // Διφορούμενο όνομα (δύο καρτέλες) → null: η γραμμή δεν παίρνει ΠΟΤΕ σύνδεσμο.
    byName.set(key, ids.size === 1 ? linksById.get(Array.from(ids)[0]) ?? null : null);
  }

  return { byName, namesById: keysById };
};

let memo: Promise<CebDbNameIndex> | null = null;

/**
 * Το ευρετήριο ονομάτων (μία φορά ανά process· η ίδια η λήψη είναι cached). Επιστρέφει
 * `null` — χωρίς σφάλμα — όταν η βάση δεν είναι διαθέσιμη: τότε οι πίνακες δουλεύουν
 * μόνο με τους curated συνδέσμους, όπως πριν.
 */
export const readCebDbNameIndex = async (): Promise<CebDbNameIndex | null> => {
  try {
    if (!memo) {
      const pending = buildIndex();
      pending.catch(() => {
        if (memo === pending) memo = null; // αποτυχία ≠ μόνιμη κατάσταση
      });
      memo = pending;
    }
    return await memo;
  } catch {
    return null;
  }
};

/**
 * Οι σύνδεσμοι που προσθέτει η βάση σε μία λίστα: για κάθε γραμμή που το όνομά της
 * ανήκει σε ΕΝΑΝ παίκτη της βάσης, ένας σύνδεσμος keyed με `db-<id>` (ποτέ με θέση).
 *
 * - Οι curated σύνδεσμοι της λίστας έχουν προτεραιότητα (αν το όνομα καλύπτεται ήδη,
 *   δεν προστίθεται δεύτερος).
 * - Γραμμές-ομοσπονδίες (οι λίστες εθνικών ομάδων: η γραμμή είναι χώρα, όχι άνθρωπος)
 *   δεν παίρνουν σύνδεσμο.
 */
export const buildCebDbPlayerLinks = async (
  rows: Array<{ name: string }>,
  curated: CebPlayerLinks | undefined,
  federationNameKeys: Iterable<string> = [],
): Promise<CebPlayerLinks> => {
  const index = await readCebDbNameIndex();
  if (!index || !Array.isArray(rows) || rows.length === 0) return {};

  const covered = new Set<string>();
  for (const link of Object.values(curated ?? {})) {
    const key = normalizeCebName(link?.db);
    if (key) covered.add(key);
  }

  const federationKeys = new Set<string>();
  for (const name of federationNameKeys) {
    const key = normalizeCebName(name);
    if (key) federationKeys.add(key);
  }

  const extra: CebPlayerLinks = {};
  for (const row of rows) {
    const name = String(row?.name ?? "");
    const strictKey = normalizeCebName(name);
    if (!strictKey) continue;

    // Οι λίστες εθνικών ομάδων: γραμμή = ομοσπονδία/χώρα → ΠΟΤΕ σύνδεσμος παίκτη.
    if (federationKeys.has(strictKey)) continue;
    if (covered.has(strictKey)) continue; // (a) το curated αρχείο έχει προτεραιότητα

    // (b) το ευρετήριο της βάσης, με αυστηρή ισότητα και μοναδικότητα.
    const looseKey = normalizeCebNameLoose(name);
    let hit: CebPlayerLink | null | undefined;
    if (index.byName.has(strictKey)) hit = index.byName.get(strictKey);
    else if (looseKey && looseKey !== strictKey && index.byName.has(looseKey)) {
      hit = index.byName.get(looseKey);
    }
    if (!hit) continue; // άγνωστο ή διφορούμενο όνομα

    const key = cebDbLinkKey(hit.id);
    if (!extra[key]) extra[key] = { id: hit.id, slug: hit.slug, db: name, kind: "db" };
  }

  return extra;
};
