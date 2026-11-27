import type { CSSProperties } from "react";
import type { CmsAppearance } from "@/lib/cms/types";

export type CmsContainerVariant = "page" | "content" | "text" | "full";

const FALLBACK_PAGE_WIDTH = "1280px";

export const getResolvedWidth = (pageWidth: string, variant: CmsContainerVariant) => {
  if (variant === "full") return "100%";
  if (variant === "text") return `min(${pageWidth}, 56rem)`;
  if (variant === "content") return `min(${pageWidth}, 64rem)`;
  return pageWidth;
};

export const getCmsPageWidth = (appearance?: CmsAppearance) =>
  appearance?.tokens.pageWidth || FALLBACK_PAGE_WIDTH;

/**
 * Πλάτος για τις ενσωματώσεις (iframe σε σελίδες συλλόγων/ομοσπονδιών).
 *
 * ΓΙΑΤΙ ΞΕΧΩΡΙΣΤΟ: η δημόσια σελίδα κρατά το πλάτος του theme (1280px), αλλά μέσα σε
 * iframe δεν υπάρχει μενού ή πλαϊνή στήλη — το πλαίσιο είναι ΟΛΟ το περιεχόμενο. Με
 * 1280 μένουν ~180px χαμένα δίπλα στους πίνακες. Εδώ παίρνουμε ό,τι παραπάνω δίνει το
 * theme (αν το ανεβάσουν σε 1440/1600) αλλιώς τουλάχιστον 1400px.
 */
const EMBED_MIN_PAGE_WIDTH_PX = 1400;

export const getCmsEmbedPageWidth = (appearance?: CmsAppearance) => {
  const configured = getCmsPageWidth(appearance);
  const parsed = Number.parseFloat(configured);
  if (!Number.isFinite(parsed)) return `${EMBED_MIN_PAGE_WIDTH_PX}px`; // «100%» κ.λπ.
  return `${Math.max(parsed, EMBED_MIN_PAGE_WIDTH_PX)}px`;
};

export const getCmsContainerStyle = (
  appearance: CmsAppearance,
  variant: CmsContainerVariant = "page",
): CSSProperties => ({
  width: "100%",
  maxWidth: getResolvedWidth(getCmsPageWidth(appearance), variant),
});

export const getCmsContainerMaxWidth = (
  appearance: CmsAppearance,
  variant: CmsContainerVariant = "page",
) => getResolvedWidth(getCmsPageWidth(appearance), variant);
