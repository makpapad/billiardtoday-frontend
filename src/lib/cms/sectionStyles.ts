import type { CSSProperties } from "react";
import type { CmsAppearance, CmsSection } from "@/lib/cms/types";

export const getCmsSectionPaddingClass = (paddingY?: string | null) =>
  paddingY === "sm"
    ? "py-5 sm:py-6"
    : paddingY === "lg"
      ? "py-12 sm:py-14"
      : paddingY === "xl"
        ? "py-16 sm:py-20"
        : "py-8 sm:py-10";

const resolveSectionSpacingValue = (value?: string | null) =>
  value === "sm"
    ? "1rem"
    : value === "md"
      ? "2rem"
      : value === "lg"
        ? "4rem"
        : value === "xl"
          ? "5rem"
          : undefined;

const resolveShadowValue = (value?: string | null) =>
  value === "none"
    ? "none"
    : value === "medium"
      ? "0 20px 80px rgba(15,23,42,0.1)"
      : value === "strong"
        ? "0 28px 100px rgba(15,23,42,0.16)"
        : "0 16px 60px rgba(15,23,42,0.05)";

const resolveRadiusValue = (value?: string | null) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return undefined;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return `${trimmed}px`;
  return trimmed;
};

const resolveOverlay = (value?: string | null) =>
  value === "none"
    ? null
    : value === "light"
      ? "rgba(15,23,42,0.08), rgba(15,23,42,0.18)"
      : value === "strong"
        ? "rgba(15,23,42,0.28), rgba(15,23,42,0.46)"
        : "rgba(15,23,42,0.18), rgba(15,23,42,0.32)";

export const getCmsSectionSurfaceStyle = (
  section: CmsSection,
  appearance: CmsAppearance,
): CSSProperties => {
  const { tokens } = appearance;
  const background =
    section.backgroundStyle === "surface"
      ? tokens.surface
      : section.backgroundStyle === "primary"
        ? tokens.primary
        : section.backgroundStyle === "accent"
          ? tokens.accent
          : section.backgroundStyle === "custom" && section.backgroundColor
            ? section.backgroundColor
            : undefined;

  const imageLayer =
    section.backgroundImage?.url && section.backgroundStyle === "image"
      ? (() => {
          const overlay = resolveOverlay(section.overlayStrength);
          return overlay
            ? `linear-gradient(180deg, ${overlay}), url(${section.backgroundImage.url}) center/cover`
            : `url(${section.backgroundImage.url}) center/cover`;
        })()
      : undefined;

  return {
    background: imageLayer || background,
    color: section.textColor || undefined,
    marginTop: resolveSectionSpacingValue(section.marginTop),
    marginBottom: resolveSectionSpacingValue(section.marginBottom),
    border: section.borderColor ? `1px solid ${section.borderColor}` : undefined,
    borderRadius: resolveRadiusValue(section.radius),
    boxShadow: resolveShadowValue(section.shadow),
  };
};
