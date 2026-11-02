import { headers } from "next/headers";
import { SITE_URL } from "@/lib/socialMetadata";

/**
 * Ποια events βλέπει ΠΡΑΓΜΑΤΙΚΑ το κοινό — από το ίδιο endpoint που τροφοδοτεί τη
 * δημόσια λίστα (`/api/tournaments`).
 *
 * ΓΙΑΤΙ: το `bt_events` περιέχει και events που δεν έχουν δημόσια σελίδα (club-runtime /
 * τοπικές δοκιμές με `format_definition.setupMode = club_*`). Ο κανόνας απόκρυψης ζει στο
 * `isDraftTournament()` και τον εφαρμόζει το `/api/tournaments` — αλλά το sitemap διάβαζε
 * το Strapi απευθείας, οπότε δημοσίευε και 7 τέτοια URLs (3 από αυτά επιβεβαιωμένα 404
 * στις 02/11/2026). Ένα sitemap με URLs που δεν ανοίγουν είναι χειρότερο από μικρότερο sitemap.
 *
 * Επιστρέφει `null` όταν το self-fetch αποτύχει: ο caller ΔΕΝ φιλτράρει τίποτα (παλιά
 * συμπεριφορά) αντί να αδειάσει το sitemap από διοργανώσεις.
 */
const TOURNAMENTS_API_PAGE_SIZE = 100;
const TOURNAMENTS_API_MAX_PAGES = 60;
const TOURNAMENTS_API_TIMEOUT_MS = 5000;
const TOURNAMENTS_API_REVALIDATE_SECONDS = 300;

const resolveOrigin = async (): Promise<string> => {
  try {
    const headerList = await headers();
    const host = headerList.get("host");
    if (host) {
      const proto =
        headerList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // εκτός request scope (π.χ. build) — πέφτουμε στο SITE_URL
  }
  return SITE_URL;
};

export const fetchPublishedTournamentDocumentIds = async (): Promise<Set<string> | null> => {
  const origin = await resolveOrigin();
  const ids = new Set<string>();

  try {
    for (let page = 1; page <= TOURNAMENTS_API_MAX_PAGES; page += 1) {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(TOURNAMENTS_API_PAGE_SIZE),
      });
      const response = await fetch(`${origin}/api/tournaments?${params.toString()}`, {
        next: { revalidate: TOURNAMENTS_API_REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(TOURNAMENTS_API_TIMEOUT_MS),
      });
      if (!response.ok) return null;

      const payload = (await response.json().catch(() => null)) as
        | { data?: unknown[]; meta?: { pagination?: { pageCount?: number } } }
        | null;
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      if (rows.length === 0) break;

      for (const row of rows) {
        const documentId =
          row && typeof row === "object" ? String((row as { documentId?: unknown }).documentId ?? "") : "";
        if (documentId) ids.add(documentId);
      }

      const pageCount = Number(payload?.meta?.pagination?.pageCount);
      if (Number.isFinite(pageCount) && pageCount > 0 && page >= pageCount) break;
      if (rows.length < TOURNAMENTS_API_PAGE_SIZE) break;
    }
  } catch {
    return null;
  }

  return ids.size > 0 ? ids : null;
};
