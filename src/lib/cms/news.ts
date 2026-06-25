import { mapCmsPage } from "@/lib/cms/mappers";
import type { CmsPage } from "@/lib/cms/types";
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
});

export const listNewsArticles = async (limit = 12): Promise<NewsArticleSummary[]> => {
  const params = new URLSearchParams();
  params.set("filters[pageType][$eq]", "article");
  params.set("pagination[page]", "1");
  params.set("pagination[pageSize]", String(Math.max(1, Math.min(limit, 50))));
  params.set("sort[0]", "publishedAt:desc");
  params.set("sort[1]", "updatedAt:desc");
  params.set("fields[0]", "title");
  params.set("fields[1]", "slug");
  params.set("fields[2]", "summary");
  params.set("fields[3]", "pageType");
  params.set("fields[4]", "publishedAt");
  params.set("fields[5]", "updatedAt");
  params.set("populate[coverImage][populate]", "*");

  const json = await fetchJson(`/api/pages?${params.toString()}`);
  const rows = Array.isArray(json?.data) ? json.data : [];
  return rows
    .map((row: unknown) => mapCmsPage(row, STRAPI_URL))
    .filter((page: CmsPage | null): page is CmsPage => Boolean(page && page.pageType === "article"))
    .map(toSummary);
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

  const json = await fetchJson(`/api/pages?${params.toString()}`);
  const row = Array.isArray(json?.data) ? json.data[0] : null;
  const page = row ? mapCmsPage(row, STRAPI_URL) : null;
  return page?.pageType === "article" ? page : null;
};
