import { mapCmsPage } from "@/lib/cms/mappers";
import type { CmsPage, CmsTournamentRef } from "@/lib/cms/types";
import { getServerEnv } from "@/lib/serverEnv";

const IS_PRODUCTION = (getServerEnv("NODE_ENV") || process.env.NODE_ENV) === "production";
const STRAPI_URL =
  getServerEnv("STRAPI_API_URL") ||
  (IS_PRODUCTION ? "http://127.0.0.1:1337" : getServerEnv("NEXT_PUBLIC_STRAPI_URL")) ||
  "https://app.billiardtoday.com";
const STRAPI_API_TOKEN = getServerEnv("STRAPI_API_TOKEN");
const CMS_FETCH_TIMEOUT_MS = Number(getServerEnv("CMS_FETCH_TIMEOUT_MS") || 5000);
const CMS_FETCH_REVALIDATE_SECONDS = Math.max(
  0,
  Number(getServerEnv("CMS_FETCH_REVALIDATE_SECONDS") || 5),
);

export type NewsArticleSummary = {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  coverImage?: CmsPage["coverImage"];
  publishedAt?: string | null;
  updatedAt?: string | null;
  /** Το τουρνουά του άρθρου (σχέση `page.tournament`), όταν υπάρχει. */
  tournament?: CmsTournamentRef | null;
};

const buildHeaders = (): HeadersInit => {
  if (!STRAPI_API_TOKEN) return {};
  return {
    Authorization: `Bearer ${STRAPI_API_TOKEN}`,
  };
};

const fetchJson = async (path: string, revalidate = CMS_FETCH_REVALIDATE_SECONDS) => {
  const url = `${STRAPI_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const useNoStore = !IS_PRODUCTION || revalidate === 0;
  const doFetch = async (useAuth: boolean) =>
    fetch(url, {
      headers: useAuth ? buildHeaders() : {},
      cache: useNoStore ? "no-store" : undefined,
      next: useNoStore ? undefined : { revalidate },
      signal: AbortSignal.timeout(CMS_FETCH_TIMEOUT_MS),
    });

  let res = await doFetch(Boolean(STRAPI_API_TOKEN));
  if (!res.ok && STRAPI_API_TOKEN && (res.status === 401 || res.status === 403)) {
    res = await doFetch(false);
  }

  if (!res.ok) {
    throw new Error(`Strapi request failed: ${res.status} ${path}`);
  }

  return res.json();
};

const toSummary = (page: CmsPage): NewsArticleSummary => ({
  id: page.id,
  title: page.title,
  slug: page.slug,
  summary: page.summary,
  coverImage: page.coverImage,
  publishedAt: page.publishedAt,
  updatedAt: page.updatedAt,
  tournament: page.tournament ?? null,
});

/**
 * Κοινά πεδία για λίστες άρθρων. Το `showInNews` ζητείται πάντα και το φιλτράρουμε
 * στον κώδικα: τα άρθρα που γράφτηκαν πριν υπάρξει το πεδίο έχουν `null`, και ένα
 * `filters[showInNews][$ne]=false` στο Strapi θα τα έκρυβε ΟΛΑ (SQL: `NULL != false`
 * δεν είναι true).
 */
const applyArticleListParams = (params: URLSearchParams, pageSize: number) => {
  params.set("filters[pageType][$eq]", "article");
  params.set("pagination[page]", "1");
  params.set("pagination[pageSize]", String(Math.max(1, Math.min(pageSize, 200))));
  params.set("sort[0]", "publishedAt:desc");
  params.set("sort[1]", "updatedAt:desc");
  params.set("fields[0]", "title");
  params.set("fields[1]", "slug");
  params.set("fields[2]", "summary");
  params.set("fields[3]", "pageType");
  params.set("fields[4]", "publishedAt");
  params.set("fields[5]", "updatedAt");
  params.set("fields[6]", "showInNews");
  params.set("populate[coverImage][populate]", "*");
  params.set("populate[tournament][fields][0]", "title");
  params.set("populate[tournament][fields][1]", "slug");
};

const readArticleRows = (json: { data?: unknown[] }): CmsPage[] =>
  (Array.isArray(json?.data) ? json.data : [])
    .map((row: unknown) => mapCmsPage(row, STRAPI_URL))
    .filter((page: CmsPage | null): page is CmsPage => Boolean(page && page.pageType === "article"));

export const listNewsArticles = async (limit = 12): Promise<NewsArticleSummary[]> => {
  const params = new URLSearchParams();
  applyArticleListParams(params, limit);

  const json = await fetchJson(`/api/pages?${params.toString()}`);
  return readArticleRows(json)
    .filter((page) => page.showInNews !== false)
    .slice(0, Math.max(1, limit))
    .map(toSummary);
};

/**
 * Άρθρα που ανήκουν σε διοργάνωση (σχέση `page.tournament`) — η πηγή της σελίδας
 * αρχείου `/news/tournaments`. Έρχονται με το τουρνουά μαζί, ώστε η σελίδα να τα
 * ομαδοποιεί χωρίς δεύτερο query.
 */
export const listTournamentNewsArticles = async (
  limit = 200,
): Promise<NewsArticleSummary[]> => {
  const params = new URLSearchParams();
  applyArticleListParams(params, limit);

  const json = await fetchJson(`/api/pages?${params.toString()}`);
  return readArticleRows(json)
    .filter((page) => Boolean(page.tournament) && page.showInNews !== false)
    .slice(0, Math.max(1, limit))
    .map(toSummary);
};

/**
 * Άρθρα που αναφέρονται σε μία διοργάνωση.
 *
 * ΔΥΟ ΔΡΟΜΟΙ, ΕΝΩΜΕΝΟΙ:
 * 1. Η σχέση `page.tournament` — ό,τι διαλέγει ο χειριστής στο admin. Ο σωστός τρόπος.
 * 2. Το παλιό: το άρθρο αναφέρει `/tournaments/<slug>` μέσα στο κείμενό του. Μένει για
 *    τα άρθρα που γράφτηκαν πριν υπάρξει η σχέση, ώστε κανένα δεν χάνεται.
 *
 * Το `tournamentSlug` είναι το slug της εγγραφής `tournament` στο Strapi (μπορεί να έχει
 * τυχαία κατάληξη, π.χ. `…-mw0r7dtl`) και ΔΕΝ είναι το δημόσιο URL· το δημόσιο
 * (`…-pulderbos-2026`) δίνεται χωριστά ως `publicSlug` για τον έλεγχο στο κείμενο.
 */
export const findNewsArticlesForTournament = async (
  {
    tournamentSlug,
    publicSlug,
  }: { tournamentSlug?: string | null; publicSlug?: string | null },
  limit = 6,
): Promise<NewsArticleSummary[]> => {
  const cleanTournamentSlug = String(tournamentSlug || "").trim();
  const cleanPublicSlug = String(publicSlug || "").trim().replace(/^\/+/, "");
  if (!cleanTournamentSlug && !cleanPublicSlug) return [];

  const byRelation = (async (): Promise<NewsArticleSummary[]> => {
    if (!cleanTournamentSlug) return [];
    const params = new URLSearchParams();
    applyArticleListParams(params, 50);
    params.set("filters[tournament][slug][$eq]", cleanTournamentSlug);
    try {
      const json = await fetchJson(`/api/pages?${params.toString()}`);
      return readArticleRows(json).map(toSummary);
    } catch {
      return [];
    }
  })();

  const byBodyLink = (async (): Promise<NewsArticleSummary[]> => {
    if (!cleanPublicSlug) return [];
    const needle = `/tournaments/${cleanPublicSlug}`;
    const params = new URLSearchParams();
    applyArticleListParams(params, 200);
    params.set("fields[7]", "layoutTree");
    params.set("populate[sections][populate]", "*");
    try {
      const json = await fetchJson(`/api/pages?${params.toString()}`);
      return readArticleRows(json)
        .filter((page) => {
          const haystack = JSON.stringify([page.layoutTree ?? null, page.sections ?? null]);
          // Το slug μπορεί να εμφανιστεί και ως απόλυτο URL· το needle ταιριάζει και στις δύο.
          return haystack.includes(needle);
        })
        .map(toSummary);
    } catch {
      return [];
    }
  })();

  const [relationArticles, bodyArticles] = await Promise.all([byRelation, byBodyLink]);

  const merged = new Map<string, NewsArticleSummary>();
  for (const article of [...relationArticles, ...bodyArticles]) {
    if (!merged.has(article.id)) merged.set(article.id, article);
  }

  return [...merged.values()]
    .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")))
    .slice(0, Math.max(1, limit));
};

export const getNewsArticleBySlug = async (slug: string): Promise<CmsPage | null> => {
  const cleanSlug = String(slug || "").trim().replace(/^\/+/, "");
  if (!cleanSlug) return null;

  const params = new URLSearchParams();
  params.set("filters[slug][$eq]", cleanSlug);
  params.set("filters[pageType][$eq]", "article");
  params.set("pagination[page]", "1");
  params.set("pagination[pageSize]", "1");
  params.set("populate[sections][populate]", "*");
  params.set("populate[seo][populate]", "*");
  params.set("populate[coverImage][populate]", "*");
  params.set("populate[tournament][fields][0]", "title");
  params.set("populate[tournament][fields][1]", "slug");

  const json = await fetchJson(`/api/pages?${params.toString()}`);
  const row = Array.isArray(json?.data) ? json.data[0] : null;
  const page = row ? mapCmsPage(row, STRAPI_URL) : null;
  return page?.pageType === "article" ? page : null;
};
