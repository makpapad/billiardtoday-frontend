export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://billiardtoday.com";

export type SocialImageMetadata = {
  url: string;
  secureUrl: string;
  width?: number;
  height?: number;
  alt?: string;
  type?: string;
};

export const DEFAULT_SOCIAL_IMAGE = {
  url: "/img/og/tournament-default.png",
  width: 1730,
  height: 909,
  alt: "Billiard Today",
  type: "image/png",
};

export const toAbsoluteUrl = (value: string | null | undefined) => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

const inferImageType = (url: string, fallback = "image/jpeg") => {
  const cleanUrl = url.split("?")[0]?.toLowerCase() || url.toLowerCase();
  if (cleanUrl.endsWith(".png")) return "image/png";
  if (cleanUrl.endsWith(".webp")) return "image/webp";
  if (cleanUrl.endsWith(".gif")) return "image/gif";
  return fallback;
};

export const buildOpenGraphImage = ({
  url,
  width,
  height,
  alt,
  type,
}: {
  url: string | null | undefined;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  type?: string | null;
}): SocialImageMetadata | null => {
  const absoluteUrl = toAbsoluteUrl(url);
  if (!absoluteUrl) return null;

  return {
    url: absoluteUrl,
    secureUrl: absoluteUrl,
    width: width || undefined,
    height: height || undefined,
    alt: alt || undefined,
    type: type || inferImageType(absoluteUrl),
  };
};

export const buildDefaultOpenGraphImage = (
  alt = DEFAULT_SOCIAL_IMAGE.alt,
): SocialImageMetadata =>
  buildOpenGraphImage({
    ...DEFAULT_SOCIAL_IMAGE,
    alt,
  })!;
