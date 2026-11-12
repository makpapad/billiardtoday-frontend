import { normalizeTournamentGameType } from "@/lib/gameTypes";
import { isDraftTournament } from "@/lib/tournamentPublication";

/**
 * Η λίστα τουρνουά ως ΚΑΘΑΡΗ συνάρτηση, ώστε να τη χρησιμοποιούν και το δημόσιο
 * API (`/api/tournaments`) και το server-rendered `/tournaments`.
 *
 * ΓΙΑΤΙ: η σελίδα /tournaments ζωγραφιζόταν μόνο client-side από το API. Ο crawler
 * έβλεπε «No tournaments found» και κανέναν σύνδεσμο προς τα 400+ τουρνουά — τα
 * μόνα URL που γνώριζε η Google ήταν όσα έβρισκε στο sitemap, χωρίς εσωτερικά links.
 */
export type TournamentListPagination = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
};

export type TournamentListPayload = {
  data: any[];
  meta: { pagination: TournamentListPagination };
};

const STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

// Strapi paginates BEFORE the draft/club-runtime filter below, so its page/total
// numbers can never be handed to the public list. We scan the (bounded) event set,
// drop drafts locally and paginate the published rows ourselves.
const EVENTS_SCAN_PAGE_SIZE = 500;
const EVENTS_SCAN_MAX_ROWS = 5000;
const MAX_PUBLIC_PAGE_SIZE = 100;

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * ΗΜΕΡΟΜΗΝΙΑ ΣΤΟ SMART SEARCH — «12/11», «12/11/2026», «2026-11-12», «12/11-14/11».
 *
 * Πριν από αυτό το «12/11» έσπαγε σε «12» και «11» και ψαχνόταν ως λέξη στον τίτλο, δηλαδή
 * δεν έβρισκε τίποτα. Εδώ η ημερομηνία βγαίνει από το κείμενο ΠΡΙΝ το σπάσιμο και γίνεται
 * φίλτρο «το τουρνουά παίζεται εκείνη τη μέρα» (αρχή ≤ μέρα ≤ τέλος).
 *
 * Χωρίς έτος («12/11») ψάχνουμε στο τρέχον και στο προηγούμενο έτος — οι σεζόν του μπιλιάρδου
 * ξεκινούν το φθινόπωρο, άρα μια ημερομηνία μπορεί να ανήκει σε δύο χρονιές.
 */
type DateWindow = { from: string; to: string };

const pad2 = (value: number): string => String(value).padStart(2, '0');

const toIsoDay = (year: number, month: number, day: number): string | null => {
  if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
};

const parseDay = (raw: string, fallbackYear: number | null): { year: number | null; month: number; day: number } | null => {
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    return toIsoDay(year, month, day) ? { year, month, day } : null;
  }
  const dmy = raw.match(/^(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?$/);
  if (!dmy) return null;
  const day = Number(dmy[1]);
  const month = Number(dmy[2]);
  const yearPart = dmy[3] ? Number(dmy[3]) : fallbackYear;
  const year = yearPart !== null && yearPart < 100 ? 2000 + yearPart : yearPart;
  if (year !== null && !toIsoDay(year, month, day)) return null;
  if (year === null && (month < 1 || month > 12 || day < 1 || day > 31)) return null;
  return { year, month, day };
};

export const extractDateSearch = (
  input: string | null,
): { windows: DateWindow[]; rest: string } | null => {
  if (!input) return null;
  const text = input.trim();
  if (!text) return null;

  // 1) ΔΙΑΣΤΗΜΑ: «12/11-14/11», «12/11/2026 - 14/11/2026», «2026-11-12..2026-11-14»
  const range = text.match(
    /(\d{1,2}[\/.]\d{1,2}(?:[\/.]\d{2,4})?|\d{4}-\d{1,2}-\d{1,2})\s*(?:-|–|έως|to|\.\.)\s*(\d{1,2}[\/.]\d{1,2}(?:[\/.]\d{2,4})?|\d{4}-\d{1,2}-\d{1,2})/i,
  );
  if (range) {
    const left = parseDay(range[1], null);
    const right = parseDay(range[2], null);
    const fromYear = left?.year ?? right?.year ?? null;
    const start = left ? (left.year === null ? { ...left, year: fromYear } : left) : null;
    const end = right ? (right.year === null ? { ...right, year: fromYear } : right) : null;
    if (start && end) {
      const years = start.year !== null ? [start.year] : defaultYears();
      const windows: DateWindow[] = [];
      for (const year of years) {
        const from = toIsoDay(year, start.month, start.day);
        const to = toIsoDay(year, end.month, end.day);
        if (from && to) windows.push({ from, to });
      }
      if (windows.length) return { windows, rest: text.replace(range[0], ' ').trim() };
    }
  }

  // 2) ΜΙΑ ΜΕΡΑ: «12/11», «12.11.2026», «2026-11-12»
  const single = text.match(/(\d{1,2}[\/.]\d{1,2}(?:[\/.]\d{2,4})?|\d{4}-\d{1,2}-\d{1,2})/);
  if (single) {
    const day = parseDay(single[1], null);
    if (day) {
      const years = day.year !== null ? [day.year] : defaultYears();
      const windows: DateWindow[] = [];
      for (const year of years) {
        const iso = toIsoDay(year, day.month, day.day);
        if (iso) windows.push({ from: iso, to: iso });
      }
      if (windows.length) return { windows, rest: text.replace(single[0], ' ').trim() };
    }
  }

  return null;
};

/** Έτη για ημερομηνία χωρίς έτος: φέτος και πέρυσι (οι σεζόν ξεκινούν το φθινόπωρο). */
const defaultYears = (): number[] => {
  const now = new Date().getFullYear();
  return [now, now - 1];
};

/** Γράφει τα όρια ημερομηνίας στο query του Strapi (επικάλυψη με το διάστημα του τουρνουά). */
export const applyDateSearch = (
  params: URLSearchParams,
  andIndex: number,
  windows: DateWindow[],
): number => {
  if (windows.length === 0) return andIndex;
  windows.forEach((window, index) => {
    params.set(`filters[$and][${andIndex}][$or][${index}][start_date][$lte]`, `${window.to}T23:59:59`);
    params.set(`filters[$and][${andIndex}][$or][${index}][end_date][$gte]`, `${window.from}T00:00:00`);
  });
  return andIndex + 1;
};

function tokenizeSearch(input: string | null): string[] {
  if (!input) return [];
  return input
    .toLowerCase()
    .replace(/[_/\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

function normalizeToken(token: string): string {
  if (
    ["cusion", "cusions", "cishion", "cishions", "cushions"].includes(token)
  ) {
    return "cushion";
  }
  if (["sesion", "session"].includes(token)) {
    return "season";
  }
  if (token === "3c") {
    return "3-cushion";
  }
  return token;
}

function facetsPayload(items: any[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = normalizeTournamentGameType(item?.game_type);
    if (!label) continue;
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  const data = [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => left.value.localeCompare(right.value, "en"));

  return {
    data,
    meta: {
      pagination: {
        page: 1,
        pageSize: data.length,
        pageCount: 1,
        total: data.length,
      },
    },
  };
}

function emptyPayload(page: number, pageSize: number) {
  return {
    data: [],
    meta: {
      pagination: {
        page,
        pageSize,
        pageCount: 0,
        total: 0,
      },
    },
  };
}

function readDateYear(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.getFullYear();
  const match = value.match(/\b(\d{4})\b/);
  return match ? Number(match[1]) : null;
}

function normalizeEventItem(item: any) {
  return {
    ...item,
    source: "bt_event",
    canOpen: true,
  };
}

function normalizeClubTournamentItem(item: any) {
  const startDate = item?.startDate ?? item?.start_date ?? null;
  const endDate = item?.endDate ?? item?.end_date ?? null;

  return {
    id: `club-tournament:${item?.documentId ?? item?.id}`,
    documentId: item?.documentId ?? String(item?.id ?? ""),
    source: "club_tournament",
    canOpen: true,
    title: item?.title ?? "Club tournament",
    game_type: item?.game_type ?? null,
    season: readDateYear(startDate),
    start_date: startDate,
    end_date: endDate,
    tournament: item?.slug
      ? {
          slug: item.slug,
          documentId: item?.documentId ?? null,
        }
      : null,
  };
}

function sortTournamentItems(left: any, right: any) {
  const leftDate = left?.start_date ? new Date(left.start_date).getTime() : 0;
  const rightDate = right?.start_date
    ? new Date(right.start_date).getTime()
    : 0;
  if (rightDate !== leftDate) return rightDate - leftDate;
  return String(left?.title ?? "").localeCompare(String(right?.title ?? ""));
}

export async function getTournamentList(
  searchParams: URLSearchParams,
): Promise<TournamentListPayload> {
  try {
    const page = toPositiveInt(searchParams.get("page"), 1);
    const pageSize = Math.min(
      MAX_PUBLIC_PAGE_SIZE,
      toPositiveInt(searchParams.get("pageSize"), 20),
    );
    const season = searchParams.get("season");
    const search = searchParams.get("q")?.trim() ?? null;
    const clubSlug = searchParams.get("clubSlug");
    const federationId = searchParams.get("federationId");
    const gameType = searchParams.get("gameType")?.trim() || null;
    const wantsGameTypeFacets = searchParams.get("facets") === "gameType";

    if (clubSlug && !federationId) {
      const pageSizeForMerge = 500;
      // Η ημερομηνία βγαίνει από το κείμενο πριν το σπάσιμο σε λέξεις («12/11 master»).
      const dateSearch = extractDateSearch(search);
      const searchTokens = tokenizeSearch(dateSearch?.rest ?? search).map(normalizeToken);

      const eventParams = new URLSearchParams();
      eventParams.set("pagination[page]", "1");
      eventParams.set("pagination[pageSize]", String(pageSizeForMerge));
      eventParams.set("sort[0]", "start_date:desc");
      eventParams.set("fields[0]", "title");
      eventParams.set("fields[1]", "season");
      eventParams.set("fields[2]", "start_date");
      eventParams.set("fields[3]", "end_date");
      eventParams.set("fields[4]", "documentId");
      eventParams.set("fields[5]", "game_type");
      eventParams.set("populate[tournament][fields][0]", "slug");
      eventParams.set("populate[tournament][fields][1]", "format_definition");
      eventParams.set("filters[tournament][club][slug][$eq]", clubSlug);

      let eventAndIndex = 0;
      for (const token of searchTokens) {
        if (token === "season") continue;
        if (/^\d{4}$/.test(token)) {
          eventParams.set(
            `filters[$and][${eventAndIndex}][season][$eq]`,
            token,
          );
          eventAndIndex++;
          continue;
        }
        eventParams.set(
          `filters[$and][${eventAndIndex}][$or][0][title][$containsi]`,
          token,
        );
        eventParams.set(
          `filters[$and][${eventAndIndex}][$or][1][game_type][$containsi]`,
          token,
        );
        eventAndIndex++;
      }
      // Ημερομηνία και στο πρώτο σκέλος (events του συλλόγου).
      eventAndIndex = applyDateSearch(eventParams, eventAndIndex, dateSearch?.windows ?? []);
      if (season) {
        eventParams.set("filters[season][$eq]", season);
      }

      const tournamentParams = new URLSearchParams();
      tournamentParams.set("pagination[page]", "1");
      tournamentParams.set("pagination[pageSize]", String(pageSizeForMerge));
      tournamentParams.set("sort[0]", "startDate:desc");
      tournamentParams.set("fields[0]", "title");
      tournamentParams.set("fields[1]", "slug");
      tournamentParams.set("fields[2]", "documentId");
      tournamentParams.set("fields[3]", "startDate");
      tournamentParams.set("fields[4]", "endDate");
      tournamentParams.set("fields[5]", "game_type");
      tournamentParams.set("fields[6]", "format_definition");
      tournamentParams.set("filters[club][slug][$eq]", clubSlug);
      tournamentParams.set("populate[bt_event][fields][0]", "documentId");

      let tournamentAndIndex = 0;
      for (const token of searchTokens) {
        if (token === "season" || /^\d{4}$/.test(token)) continue;
        tournamentParams.set(
          `filters[$and][${tournamentAndIndex}][$or][0][title][$containsi]`,
          token,
        );
        tournamentParams.set(
          `filters[$and][${tournamentAndIndex}][$or][1][game_type][$containsi]`,
          token,
        );
        tournamentAndIndex++;
      }
      tournamentAndIndex = applyDateSearch(tournamentParams, tournamentAndIndex, dateSearch?.windows ?? []);

      const fetchFromStrapi = async (path: string, useAuth: boolean) => {
        const headers: HeadersInit = {};
        if (useAuth && STRAPI_API_TOKEN) {
          headers.Authorization = `Bearer ${STRAPI_API_TOKEN}`;
        }
        return fetch(`${STRAPI_URL}/api/${path}`, {
          cache: "no-store",
          headers,
        });
      };

      const fetchCollection = async (path: string) => {
        let res = await fetchFromStrapi(path, Boolean(STRAPI_API_TOKEN)).catch(
          () => null,
        );
        if ((!res || !res.ok) && STRAPI_API_TOKEN) {
          res = await fetchFromStrapi(path, false).catch(() => null);
        }
        if (!res?.ok) return [];
        const json = await res.json().catch(() => null);
        return Array.isArray(json?.data) ? json.data : [];
      };

      const [eventRows, tournamentRows] = await Promise.all([
        fetchCollection(`bt-events?${eventParams.toString()}`),
        fetchCollection(`tournaments?${tournamentParams.toString()}`),
      ]);
      const localRows = tournamentRows
        .filter((item: any) => !isDraftTournament(item))
        .filter((item: any) => !item?.bt_event?.documentId)
        .map(normalizeClubTournamentItem)
        .filter((item: any) => !season || String(item.season ?? "") === season);
      const merged = [
        ...eventRows.filter((item: any) => !isDraftTournament(item)).map(normalizeEventItem),
        ...localRows,
      ].sort(
        sortTournamentItems,
      );
      if (wantsGameTypeFacets) return facetsPayload(merged);

      const scoped = gameType
        ? merged.filter(
            (item: any) => normalizeTournamentGameType(item?.game_type) === gameType,
          )
        : merged;
      const total = scoped.length;
      const pageCount = Math.max(1, Math.ceil(total / pageSize));
      const start = (page - 1) * pageSize;
      const data = scoped.slice(start, start + pageSize);

      return {
        data,
        meta: {
          pagination: {
            page,
            pageSize,
            pageCount,
            total,
          },
        },
      };
    }

    const queryParams = new URLSearchParams();
    queryParams.set("sort[0]", "start_date:desc");
    queryParams.set("fields[0]", "title");
    queryParams.set("fields[1]", "season");
    queryParams.set("fields[2]", "start_date");
    queryParams.set("fields[3]", "end_date");
    queryParams.set("fields[4]", "documentId");
    queryParams.set("fields[5]", "game_type");
    queryParams.set("populate[tournament][fields][0]", "slug");
    queryParams.set("populate[tournament][fields][1]", "format_definition");

    if (season) {
      queryParams.set("filters[season][$eq]", season);
    }
    const dateSearch = extractDateSearch(search);
    const searchTokens = tokenizeSearch(dateSearch?.rest ?? search).map(normalizeToken);
    let andIndex = 0;
    for (const token of searchTokens) {
      // keyword only, ignore as filter token
      if (token === "season") continue;

      // "2026 3 cushion" => season + text filters
      if (/^\d{4}$/.test(token)) {
        queryParams.set(`filters[$and][${andIndex}][season][$eq]`, token);
        andIndex++;
        continue;
      }

      queryParams.set(
        `filters[$and][${andIndex}][$or][0][title][$containsi]`,
        token,
      );
      queryParams.set(
        `filters[$and][${andIndex}][$or][1][game_type][$containsi]`,
        token,
      );
      andIndex++;
    }
    // «12/11» ή «12/11-14/11»: μόνο τουρνουά που παίζονται μέσα σε αυτό το διάστημα.
    andIndex = applyDateSearch(queryParams, andIndex, dateSearch?.windows ?? []);
    if (clubSlug) {
      queryParams.set("filters[tournament][club][slug][$eq]", clubSlug);
    }
    if (federationId) {
      queryParams.set(
        "filters[tournament][organizer_federation][documentId][$eq]",
        federationId,
      );
    }

    const fetchEventsPage = async (
      upstreamPage: number,
    ): Promise<{ rows: any[]; pageCount: number } | null> => {
      const params = new URLSearchParams(queryParams);
      params.set("pagination[page]", String(upstreamPage));
      params.set("pagination[pageSize]", String(EVENTS_SCAN_PAGE_SIZE));
      const query = params.toString();

      const fetchFromStrapi = async (useAuth: boolean) => {
        const headers: HeadersInit = {};
        if (useAuth && STRAPI_API_TOKEN) {
          headers.Authorization = `Bearer ${STRAPI_API_TOKEN}`;
        }
        return fetch(`${STRAPI_URL}/api/bt-events?${query}`, {
          cache: "no-store",
          headers,
        });
      };

      let res: Response;
      try {
        res = await fetchFromStrapi(Boolean(STRAPI_API_TOKEN));
      } catch (error) {
        console.error("[tournaments][GET] upstream unavailable:", error);
        return null;
      }

      if (!res.ok && STRAPI_API_TOKEN) {
        try {
          const retry = await fetchFromStrapi(false);
          if (retry.ok) {
            res = retry;
          } else {
            const retryText = await retry.text().catch(() => "");
            console.error(
              "[tournaments][GET] retry failed:",
              retry.status,
              retryText,
            );
            return null;
          }
        } catch (error) {
          console.error("[tournaments][GET] retry upstream unavailable:", error);
          return null;
        }
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[tournaments][GET] Error response:", res.status, text);
        return null;
      }

      const json = await res.json().catch(() => null);
      if (!json || !Array.isArray(json.data)) return null;

      const upstreamPageCount = Number(json?.meta?.pagination?.pageCount);
      return {
        rows: json.data,
        pageCount:
          Number.isFinite(upstreamPageCount) && upstreamPageCount > 0
            ? upstreamPageCount
            : 1,
      };
    };

    const publishedEvents: any[] = [];
    let upstreamPage = 1;
    let upstreamPageCount = 1;

    while (
      upstreamPage <= upstreamPageCount &&
      publishedEvents.length < EVENTS_SCAN_MAX_ROWS
    ) {
      const result = await fetchEventsPage(upstreamPage);
      if (!result) {
        return emptyPayload(page, pageSize);
      }

      publishedEvents.push(
        ...result.rows.filter((item: any) => !isDraftTournament(item)),
      );
      upstreamPageCount = result.pageCount;
      if (result.rows.length === 0) break;
      upstreamPage += 1;
    }

    if (wantsGameTypeFacets) return facetsPayload(publishedEvents);

    const scopedEvents = gameType
      ? publishedEvents.filter(
          (item: any) => normalizeTournamentGameType(item?.game_type) === gameType,
        )
      : publishedEvents;
    const total = scopedEvents.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;

    return {
      data: scopedEvents.slice(start, start + pageSize),
      meta: {
        pagination: {
          page,
          pageSize,
          pageCount,
          total,
        },
      },
    };
  } catch (error) {
    console.error("[tournaments][getTournamentList]", error);
    const page = toPositiveInt(searchParams.get("page"), 1);
    const pageSize = toPositiveInt(searchParams.get("pageSize"), 10);
    return emptyPayload(page, pageSize);
  }
}
