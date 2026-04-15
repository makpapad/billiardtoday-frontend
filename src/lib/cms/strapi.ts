import { mapCmsAppearance, mapCmsPage, mapCmsSiteSettings } from "@/lib/cms/mappers";
import type { CmsAppearance, CmsNavLink, CmsPage, CmsSiteSettings } from "@/lib/cms/types";
import { getServerEnv } from "@/lib/serverEnv";

const IS_PRODUCTION = (getServerEnv("NODE_ENV") || process.env.NODE_ENV) === "production";
const STRAPI_URL =
  getServerEnv("STRAPI_API_URL") ||
  (IS_PRODUCTION ? "http://127.0.0.1:1337" : getServerEnv("NEXT_PUBLIC_STRAPI_URL")) ||
  "https://app.billiardtoday.com";
const CMS_ADMIN_URL =
  getServerEnv("CMS_ADMIN_URL") ||
  getServerEnv("NEXT_PUBLIC_CMS_ADMIN_URL") ||
  "";
const STRAPI_API_TOKEN = getServerEnv("STRAPI_API_TOKEN");
const IS_DEVELOPMENT = !IS_PRODUCTION;
const CMS_FETCH_TIMEOUT_MS = Number(getServerEnv("CMS_FETCH_TIMEOUT_MS") || 5000);
const CMS_FETCH_REVALIDATE_SECONDS = Math.max(
  0,
  Number(getServerEnv("CMS_FETCH_REVALIDATE_SECONDS") || 5),
);
const DEFAULT_GLOBAL_TAGLINE =
  "International billiard tournaments, rankings, results, clubs, federations, and players.";
const DEFAULT_SOCIAL_LINKS = [
  {
    platform: "facebook",
    label: "Facebook",
    url: "https://www.facebook.com/profile.php?id=100063661505276",
  },
] as const;
const DEFAULT_FOOTER_LINKS: CmsNavLink[] = [
  { label: "Tournaments", url: "/tournaments", openInNewTab: false, children: [] },
  { label: "Federations", url: "/federations", openInNewTab: false, children: [] },
  { label: "Players", url: "/players", openInNewTab: false, children: [] },
  { label: "Rankings", url: "/rankings", openInNewTab: false, children: [] },
];

const isLocalCmsAdminUrl = (url: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url.trim());

const isOptionalCmsAdminFailure = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const cause = (error as { cause?: { code?: string } }).cause;
  const message = String((error as { message?: string }).message || "");
  return (
    cause?.code === "ECONNREFUSED" ||
    cause?.code === "UND_ERR_CONNECT_TIMEOUT" ||
    message.toLowerCase().includes("fetch failed")
  );
};

const buildHeaders = (): HeadersInit => {
  if (!STRAPI_API_TOKEN) return {};
  return {
    Authorization: `Bearer ${STRAPI_API_TOKEN}`,
  };
};

const isHttpStatusError = (error: unknown, status: number) => {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: string }).message || "");
  return message.includes(`Strapi request failed: ${status} `);
};

const fetchJson = async (path: string, revalidate = CMS_FETCH_REVALIDATE_SECONDS) => {
  const url = `${STRAPI_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const useNoStore = IS_DEVELOPMENT || revalidate === 0;
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

const fetchCmsAdminJson = async (path: string, revalidate = 60) => {
  if (!CMS_ADMIN_URL) {
    throw new Error("CMS admin URL is not configured");
  }

  const url = `${CMS_ADMIN_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    cache: IS_DEVELOPMENT ? "no-store" : undefined,
    next: IS_DEVELOPMENT ? undefined : { revalidate },
    signal: AbortSignal.timeout(CMS_FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`CMS admin request failed: ${res.status} ${path}`);
  }

  return res.json();
};

const DEFAULT_SITE_SETTINGS: CmsSiteSettings = {
  siteName: "Billiard Today",
  siteTagline: DEFAULT_GLOBAL_TAGLINE,
  logo: null,
  contactEmail: null,
  menus: [
    {
      key: "primary-navigation",
      name: "Primary Navigation",
      orientation: "horizontal",
      items: [
        { label: "Tournaments", url: "/tournaments", openInNewTab: false, children: [] },
        { label: "Players", url: "/players", openInNewTab: false, children: [] },
        { label: "Clubs", url: "/clubs", openInNewTab: false, children: [] },
        { label: "Federations", url: "/federations", openInNewTab: false, children: [] },
      ],
    },
    {
      key: "footer-navigation",
      name: "Footer Navigation",
      orientation: "horizontal",
      items: [...DEFAULT_FOOTER_LINKS],
    },
  ],
  activeHeaderMenuKey: "primary-navigation",
  activeFooterMenuKey: "footer-navigation",
  stickyHeader: true,
  headerAppearance: {
    variant: "glass",
    navStyle: "pills",
    showSiteTagline: true,
  },
  footerAppearance: {
    variant: "dark",
    showSiteTagline: true,
    showContactEmail: true,
    showSocialLinks: true,
  },
  headerLayout: [],
  footerLayout: [],
  headerLinks: [
    { label: "Tournaments", url: "/tournaments", openInNewTab: false, children: [] },
    { label: "Players", url: "/players", openInNewTab: false, children: [] },
    { label: "Clubs", url: "/clubs", openInNewTab: false, children: [] },
    { label: "Federations", url: "/federations", openInNewTab: false, children: [] },
  ],
  footerLinks: [...DEFAULT_FOOTER_LINKS],
  socialLinks: [...DEFAULT_SOCIAL_LINKS],
  defaultSeo: {
    metaTitle: "Billiard Today",
    metaDescription:
      "Billiard tournaments, results, rankings, clubs, players, and CMS-managed content.",
    canonicalUrl: "/",
    noIndex: false,
    ogImage: null,
  },
};

export const getCmsAppearance = async (): Promise<CmsAppearance> => {
  if (!CMS_ADMIN_URL) {
    return mapCmsAppearance();
  }

  try {
    const json = await fetchCmsAdminJson("/api/cms/theme", 60);
    return mapCmsAppearance(json.data ?? json);
  } catch (error) {
    if (!(isLocalCmsAdminUrl(CMS_ADMIN_URL) && isOptionalCmsAdminFailure(error))) {
      console.warn("Falling back to default CMS appearance.", error);
    }
    return mapCmsAppearance();
  }
};

export const getCmsSiteSettings = async (): Promise<CmsSiteSettings> => {
  try {
    const params = new URLSearchParams();
    params.set("populate", "*");

    const json = await fetchJson(`/api/site-setting?${params.toString()}`);
    const mapped = mapCmsSiteSettings(json.data ?? json, STRAPI_URL);
    const normalizedTagline =
      !mapped.siteTagline ||
      mapped.siteTagline.trim() === "" ||
      mapped.siteTagline.trim() === "Greek billiard tournaments, rankings, results, and CMS-managed pages."
        ? DEFAULT_GLOBAL_TAGLINE
        : mapped.siteTagline;
    const normalizedFooterLinks =
      Array.isArray(mapped.footerLinks) && mapped.footerLinks.length > 0
        ? mapped.footerLinks
            .filter((link) => String(link?.url || "").trim() !== "/teams")
            .filter((link) => String(link?.label || "").trim().toLowerCase() !== "teams")
        : [];

    return {
      ...mapped,
      siteTagline: normalizedTagline,
      footerLinks:
        normalizedFooterLinks.length > 0
          ? normalizedFooterLinks.some(
              (link) => String(link?.url || "").trim() === "/players",
            )
            ? normalizedFooterLinks
            : [
                ...normalizedFooterLinks.slice(0, 2),
                DEFAULT_FOOTER_LINKS[2],
                ...normalizedFooterLinks.slice(2),
              ]
          : [...DEFAULT_FOOTER_LINKS],
      socialLinks:
        Array.isArray(mapped.socialLinks) && mapped.socialLinks.length > 0
          ? mapped.socialLinks
          : [...DEFAULT_SOCIAL_LINKS],
    };
  } catch (error) {
    if (isHttpStatusError(error, 404)) {
      return DEFAULT_SITE_SETTINGS;
    }
    console.warn("Falling back to default CMS site settings.", error);
    return DEFAULT_SITE_SETTINGS;
  }
};

export const getCmsPageBySlug = async (slug: string): Promise<CmsPage | null> => {
  const cleanSlug = String(slug || "").trim().replace(/^\/+/, "");
  if (!cleanSlug) return null;

  const params = new URLSearchParams();
  params.set("filters[slug][$eq]", cleanSlug);
  params.set("pagination[page]", "1");
  params.set("pagination[pageSize]", "1");
  params.set("populate[sections][populate]", "*");
  params.set("populate[seo][populate]", "*");
  params.set("populate[coverImage][populate]", "*");

  try {
    const json = await fetchJson(`/api/pages?${params.toString()}`);
    const row = Array.isArray(json?.data) ? json.data[0] : null;
    return row ? mapCmsPage(row, STRAPI_URL) : null;
  } catch (error) {
    console.warn(`Falling back to null CMS page for slug '${cleanSlug}'.`, error);
    return null;
  }
};
