import type { CSSProperties } from "react";
import type { CmsAppearance } from "@/lib/cms/types";

export type CmsContainerVariant = "page" | "content" | "text" | "full";

const FALLBACK_PAGE_WIDTH = "1280px";

const getResolvedWidth = (pageWidth: string, variant: CmsContainerVariant) => {
  if (variant === "full") return "100%";
  if (variant === "text") return `min(${pageWidth}, 56rem)`;
  if (variant === "content") return `min(${pageWidth}, 64rem)`;
  return pageWidth;
};

export const getCmsPageWidth = (appearance?: CmsAppearance) =>
  appearance?.tokens.pageWidth || FALLBACK_PAGE_WIDTH;

export const getCmsContainerStyle = (
  appearance: CmsAppearance,
  variant: CmsContainerVariant = "page",
): CSSProperties => ({
  width: "100%",
  maxWidth: getResolvedWidth(getCmsPageWidth(appearance), variant),
});
