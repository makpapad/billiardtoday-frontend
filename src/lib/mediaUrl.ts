const DEFAULT_STRAPI_URL = "https://app.billiardtoday.com";

const trimTrailingSlash = (value: string) => value.trim().replace(/\/+$/, "");

const getMediaBaseUrl = () =>
  trimTrailingSlash(
    process.env.NEXT_PUBLIC_MEDIA_URL ||
      process.env.NEXT_PUBLIC_STRAPI_URL ||
      DEFAULT_STRAPI_URL,
  );

const getStrapiBaseUrl = () =>
  trimTrailingSlash(process.env.NEXT_PUBLIC_STRAPI_URL || DEFAULT_STRAPI_URL);

const isStrapiUploadHost = (hostname: string) => {
  const hosts = new Set(["app.billiardtoday.com"]);
  try {
    hosts.add(new URL(getStrapiBaseUrl()).hostname.toLowerCase());
  } catch {
    // Keep the default host list.
  }
  return hosts.has(hostname.toLowerCase());
};

export const resolveMediaUrl = (
  value: string | null | undefined,
  fallbackBaseUrl = getStrapiBaseUrl(),
) => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const mediaBaseUrl = getMediaBaseUrl();
  const fallbackBase = trimTrailingSlash(fallbackBaseUrl || getStrapiBaseUrl());

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (url.pathname.startsWith("/uploads/") && isStrapiUploadHost(url.hostname)) {
        return `${mediaBaseUrl}${url.pathname}${url.search}${url.hash}`;
      }
    } catch {
      return raw;
    }
    return raw;
  }

  const normalizedPath = raw.startsWith("/") ? raw : `/${raw}`;
  const baseUrl = normalizedPath.startsWith("/uploads/") ? mediaBaseUrl : fallbackBase;

  return `${baseUrl}${normalizedPath}`;
};
