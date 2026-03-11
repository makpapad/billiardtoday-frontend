import type { CSSProperties } from "react";
import Link from "next/link";
import { LogoStripSection } from "@/components/marketing/LogoStripSection";
import { PostsListSection } from "@/components/marketing/PostsListSection";
import { ServiceCardsSection } from "@/components/marketing/ServiceCardsSection";
import { StatsSection } from "@/components/marketing/StatsSection";
import { TestimonialsSection } from "@/components/marketing/TestimonialsSection";
import { TournamentListSection } from "@/components/tournaments/TournamentListSection";
import { getCmsContainerMaxWidth, getCmsContainerStyle } from "@/lib/cms/layout";
import { getCmsSectionPaddingClass, getCmsSectionSurfaceStyle } from "@/lib/cms/sectionStyles";
import type { CmsAppearance, CmsSection } from "@/lib/cms/types";

const shouldRenderSection = (section: CmsSection, embedded: boolean) => {
  if (section.visibility === "embed-only") return embedded;
  if (section.visibility === "page-only") return !embedded;
  return true;
};

const resolveContentContainer = (appearance: CmsAppearance, value?: string | null) =>
  getCmsContainerStyle(
    appearance,
    value === "narrow" ? "text" : value === "wide" ? "page" : "content",
  );

const resolveContentVariant = (value?: string | null) =>
  value === "narrow" ? "text" : value === "wide" ? "page" : "content";

const resolveResponsiveContentContainer = (
  appearance: CmsAppearance,
  desktopValue?: string | null,
  mobileValue?: string | null,
): { className: string; style: CSSProperties } => {
  const desktopMaxWidth = getCmsContainerMaxWidth(appearance, resolveContentVariant(desktopValue));
  if (!mobileValue) {
    return {
      className: "mx-auto w-full",
      style: { width: "100%", maxWidth: desktopMaxWidth },
    };
  }

  const mobileMaxWidth = getCmsContainerMaxWidth(appearance, resolveContentVariant(mobileValue));
  return {
    className: "mx-auto w-full max-w-[var(--cms-mobile-max-width)] md:max-w-[var(--cms-desktop-max-width)]",
    style: {
      width: "100%",
      "--cms-mobile-max-width": mobileMaxWidth,
      "--cms-desktop-max-width": desktopMaxWidth,
    } as CSSProperties,
  };
};

const resolveContentAlignClass = (value?: string | null) =>
  value === "center" ? "items-center text-center" : "items-start text-left";

const resolveResponsiveContentAlignClass = (desktopValue?: string | null, mobileValue?: string | null) => {
  const desktopClass = desktopValue === "center" ? "md:items-center md:text-center" : "md:items-start md:text-left";
  if (!mobileValue) return resolveContentAlignClass(desktopValue);
  return `${mobileValue === "center" ? "items-center text-center" : "items-start text-left"} ${desktopClass}`;
};

const resolveResponsiveTextAlignClass = (desktopValue?: string | null, mobileValue?: string | null) => {
  const desktopClass = desktopValue === "center" ? "md:text-center" : "md:text-left";
  if (!mobileValue) return desktopValue === "center" ? "text-center" : "text-left";
  return `${mobileValue === "center" ? "text-center" : "text-left"} ${desktopClass}`;
};

const resolveResponsiveJustifyClass = (desktopValue?: string | null, mobileValue?: string | null) => {
  const desktopClass = desktopValue === "center" ? "md:justify-center" : "md:justify-start";
  if (!mobileValue) return desktopValue === "center" ? "justify-center" : "justify-start";
  return `${mobileValue === "center" ? "justify-center" : "justify-start"} ${desktopClass}`;
};

const resolveResponsiveCtaLayoutClass = (desktopValue?: string | null, mobileValue?: string | null) => {
  const desktopClass =
    desktopValue === "center"
      ? "md:items-center md:text-center"
      : "md:flex-row md:items-center md:justify-between md:text-left";
  if (!mobileValue) {
    return desktopValue === "center" ? "items-center text-center" : "items-start text-left";
  }
  return `${mobileValue === "center" ? "items-center text-center" : "items-start text-left"} ${desktopClass}`;
};

const resolveBodyTextClass = (value?: string | null) =>
  value === "sm"
    ? "text-sm leading-7"
    : value === "lg"
      ? "text-lg leading-9"
      : "text-base leading-8";

const resolveResponsiveBodyTextClass = (desktopValue?: string | null, mobileValue?: string | null) => {
  const desktopClass =
    desktopValue === "sm"
      ? "md:text-sm md:leading-7"
      : desktopValue === "lg"
        ? "md:text-lg md:leading-9"
        : "md:text-base md:leading-8";
  if (!mobileValue) return resolveBodyTextClass(desktopValue);
  return `${resolveBodyTextClass(mobileValue)} ${desktopClass}`;
};

const resolveSectionTitleClass = (value?: string | null) =>
  value === "md"
    ? "text-2xl sm:text-3xl"
    : value === "xl"
      ? "text-4xl sm:text-5xl"
      : "text-3xl sm:text-4xl";

const resolveResponsiveSectionTitleClass = (desktopValue?: string | null, mobileValue?: string | null) => {
  const desktopClass =
    desktopValue === "md"
      ? "md:text-3xl"
      : desktopValue === "xl"
        ? "md:text-5xl"
        : "md:text-4xl";
  if (!mobileValue) {
    return desktopValue === "md"
      ? "text-2xl md:text-3xl"
      : desktopValue === "xl"
        ? "text-4xl md:text-5xl"
        : "text-3xl md:text-4xl";
  }
  return `${mobileValue === "md" ? "text-2xl" : mobileValue === "xl" ? "text-4xl" : "text-3xl"} ${desktopClass}`;
};

const resolveHeroTitleClass = (value?: string | null) =>
  value === "md"
    ? "text-4xl sm:text-5xl"
    : value === "xl"
      ? "text-5xl sm:text-6xl lg:text-7xl"
      : "text-4xl sm:text-5xl lg:text-6xl";

const resolveResponsiveHeroTitleClass = (desktopValue?: string | null, mobileValue?: string | null) => {
  const desktopClass =
    desktopValue === "md"
      ? "md:text-5xl lg:text-6xl"
      : desktopValue === "xl"
        ? "md:text-6xl lg:text-7xl"
        : "md:text-5xl lg:text-6xl";
  if (!mobileValue) {
    return desktopValue === "md"
      ? "text-3xl md:text-5xl lg:text-6xl"
      : desktopValue === "xl"
        ? "text-4xl md:text-6xl lg:text-7xl"
        : "text-4xl md:text-5xl lg:text-6xl";
  }
  return `${mobileValue === "md" ? "text-3xl" : mobileValue === "xl" ? "text-4xl" : "text-4xl"} ${desktopClass}`;
};

type Props = {
  section: CmsSection;
  appearance: CmsAppearance;
  index: number;
  embedded?: boolean;
};

export function CmsSectionRenderer({ section, appearance, index, embedded = false }: Props) {
  const { tokens } = appearance;
  const sectionPaddingClass = getCmsSectionPaddingClass(section.paddingY);
  const sectionSurfaceStyle = getCmsSectionSurfaceStyle(section, appearance);

  if (!shouldRenderSection(section, embedded)) {
    return null;
  }

  if (section.__component === "cms.layout-grid-canvas-section") {
    const gridClass =
      section.columns === "2"
        ? "md:grid-cols-2"
        : section.columns === "4"
          ? "md:grid-cols-2 xl:grid-cols-4"
          : "md:grid-cols-2 xl:grid-cols-3";
    const gapClass = section.gap === "wide" ? "gap-6" : "gap-4";
    const visibleCells =
      section.columns === "2" ? section.cells.slice(0, 2) : section.columns === "4" ? section.cells.slice(0, 4) : section.cells.slice(0, 3);

    return (
      <section className={`px-4 ${sectionPaddingClass} sm:px-6`} style={sectionSurfaceStyle}>
        <div className="mx-auto" style={getCmsContainerStyle(appearance, "page")}>
          {section.title ? <h2 className="mb-6 text-3xl font-semibold tracking-tight sm:text-4xl" style={{ fontFamily: tokens.headingFont }}>{section.title}</h2> : null}
          <div className={`grid ${gridClass} ${gapClass}`}>
            {visibleCells.map((cell, cellIndex) => (
              <div key={`grid-canvas-${index}-${cellIndex}`} className="space-y-4">
                {cell.length ? cell.map((child, childIndex) => (
                  <CmsSectionRenderer key={`grid-canvas-child-${index}-${cellIndex}-${childIndex}`} section={child} appearance={appearance} index={childIndex} embedded={embedded} />
                )) : <div className="min-h-[120px] rounded-[22px] border border-dashed border-slate-300 bg-white/70 px-5 py-8 text-sm text-slate-400">Empty cell</div>}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (section.__component === "cms.card-section") {
    const isHighlight = section.theme === "highlight";

    return (
      <section className={`px-4 ${sectionPaddingClass} sm:px-6`} style={sectionSurfaceStyle}>
        <article className="mx-auto h-full max-w-5xl rounded-[24px] border border-black/5 p-5 shadow-[0_16px_60px_rgba(15,23,42,0.06)]" style={{ background: isHighlight ? `linear-gradient(180deg, ${tokens.surface}, #ffffff)` : "#ffffff" }}>
          {section.image?.url ? <div className="mb-4 overflow-hidden rounded-2xl bg-slate-100"><img src={section.image.url} alt={section.alt || section.image.alternativeText || "Card image"} className="h-44 w-full object-cover" /></div> : null}
          <div className="space-y-3">
            {section.eyebrow ? <div className="inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ background: `${tokens.accent}22`, color: tokens.primary }}>{section.eyebrow}</div> : null}
            <h3 className="text-xl font-semibold tracking-tight text-slate-950" style={{ fontFamily: tokens.headingFont }}>{section.title}</h3>
            {section.content ? <p className="text-sm leading-7 text-slate-600">{section.content}</p> : null}
            {section.buttonLabel && section.buttonUrl ? <Link href={section.buttonUrl} className="inline-flex rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90" style={{ background: tokens.primary }}>{section.buttonLabel}</Link> : null}
          </div>
        </article>
      </section>
    );
  }

  if (section.__component === "cms.hero-section") {
    const heroContainer = resolveResponsiveContentContainer(
      appearance,
      section.contentWidth,
      section.mobileContentWidth,
    );
    return (
      <section className={`px-4 ${sectionPaddingClass} sm:px-6`} style={sectionSurfaceStyle}>
        <div className={`${heroContainer.className} grid gap-10 overflow-hidden border border-black/5 px-6 py-10 shadow-[0_24px_90px_rgba(15,23,42,0.12)] sm:px-10 sm:py-14 lg:grid-cols-[1.15fr_0.85fr]`} style={{ ...heroContainer.style, borderRadius: tokens.radius, background: `linear-gradient(135deg, ${tokens.surface}, #ffffff)` }}>
          <div className={`flex flex-col gap-6 ${resolveResponsiveContentAlignClass(section.contentAlign, section.mobileContentAlign)}`}>
            {section.eyebrow ? <div className="inline-flex rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]" style={{ background: `${tokens.accent}22`, color: tokens.primary }}>{section.eyebrow}</div> : null}
            <div className="space-y-4">
              <h1 className={`max-w-4xl font-semibold tracking-tight ${resolveResponsiveHeroTitleClass(section.titleSize, section.mobileTitleSize)}`} style={{ fontFamily: tokens.headingFont }}>{section.title}</h1>
              {section.subtitle ? <p className={`max-w-2xl text-slate-600 ${resolveResponsiveBodyTextClass(section.bodySize, section.mobileBodySize)}`}>{section.subtitle}</p> : null}
            </div>
            <div className={`flex flex-wrap gap-3 ${resolveResponsiveJustifyClass(section.contentAlign, section.mobileContentAlign)}`}>
              {section.primaryCtaLabel && section.primaryCtaUrl ? <Link href={section.primaryCtaUrl} className="rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90" style={{ background: tokens.primary }}>{section.primaryCtaLabel}</Link> : null}
              {section.secondaryCtaLabel && section.secondaryCtaUrl ? <Link href={section.secondaryCtaUrl} className="rounded-full border px-6 py-3 text-sm font-semibold transition hover:bg-slate-50" style={{ borderColor: `${tokens.primary}33`, color: tokens.text }}>{section.secondaryCtaLabel}</Link> : null}
            </div>
          </div>
          <div className="relative min-h-[280px]">
            <div className="absolute inset-0" style={{ borderRadius: tokens.radius, background: section.backgroundImage?.url ? `linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.28)), url(${section.backgroundImage.url}) center/cover` : `linear-gradient(135deg, ${tokens.primary}, ${tokens.accent})` }} />
            <div className="absolute inset-5 rounded-[inherit] border border-white/20" />
            <div className="absolute bottom-5 left-5 max-w-xs rounded-3xl bg-white/88 p-5 backdrop-blur">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Live CMS</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950" style={{ fontFamily: tokens.headingFont }}>Structured content and public data in one flow.</div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (section.__component === "cms.layout-flex-canvas-section") {
    const directionClass = section.direction === "row-reverse" ? "lg:flex-row-reverse" : section.direction === "column" ? "flex-col" : "lg:flex-row";
    const justifyClass = section.justify === "center" ? "lg:justify-center" : section.justify === "start" ? "lg:justify-start" : "lg:justify-between";
    const alignClass = section.align === "start" ? "lg:items-start" : section.align === "center" ? "lg:items-center" : "lg:items-stretch";
    const gapClass = section.gap === "wide" ? "gap-6" : "gap-4";
    const visibleCells = section.cells.slice(0, 4);

    return (
      <section className={`px-4 ${sectionPaddingClass} sm:px-6`} style={sectionSurfaceStyle}>
        <div className="mx-auto" style={getCmsContainerStyle(appearance, "page")}>
          {section.title ? <h2 className="mb-6 text-3xl font-semibold tracking-tight sm:text-4xl" style={{ fontFamily: tokens.headingFont }}>{section.title}</h2> : null}
          <div className={`flex ${gapClass} ${directionClass} ${justifyClass} ${alignClass}`}>
            {visibleCells.map((cell, cellIndex) => (
              <div key={`flex-canvas-${index}-${cellIndex}`} className="min-w-0 flex-1 space-y-4">
                {cell.length ? cell.map((child, childIndex) => (
                  <CmsSectionRenderer key={`flex-canvas-child-${index}-${cellIndex}-${childIndex}`} section={child} appearance={appearance} index={childIndex} embedded={embedded} />
                )) : <div className="min-h-[120px] rounded-[22px] border border-dashed border-slate-300 bg-white/70 px-5 py-8 text-sm text-slate-400">Empty slot</div>}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (section.__component === "cms.spacer-section") {
    const heightClass = section.size === "sm" ? "h-8" : section.size === "lg" ? "h-20" : section.size === "xl" ? "h-28" : "h-12";
    return <div className={`w-full ${heightClass}`} style={sectionSurfaceStyle} aria-hidden="true" />;
  }

  if (section.__component === "cms.rich-text-section") {
    const textContainer = resolveResponsiveContentContainer(
      appearance,
      section.contentWidth,
      section.mobileContentWidth,
    );
    return (
      <section className={`px-4 ${sectionPaddingClass} sm:px-6`} style={sectionSurfaceStyle}>
        <div className={`${textContainer.className} ${resolveResponsiveTextAlignClass(section.contentAlign, section.mobileContentAlign)}`} style={textContainer.style}>
          {section.title ? <h2 className={`mb-6 font-semibold tracking-tight ${resolveResponsiveSectionTitleClass(section.titleSize, section.mobileTitleSize)}`} style={{ fontFamily: tokens.headingFont }}>{section.title}</h2> : null}
          <div className={`cms-richtext prose prose-slate max-w-none prose-headings:font-semibold prose-a:no-underline ${resolveResponsiveBodyTextClass(section.bodySize, section.mobileBodySize)}`} dangerouslySetInnerHTML={{ __html: section.content }} />
        </div>
      </section>
    );
  }

  if (section.__component === "cms.image-section") {
    if (!section.image?.url) return null;
    const imageAlt = section.alt || section.image?.alternativeText || "CMS image";
    const isFull = section.layout === "full";
    const isFullBleed = section.layout === "full-bleed";
    return (
      <section className={isFull || isFullBleed ? sectionPaddingClass : `px-4 ${sectionPaddingClass} sm:px-6`} style={sectionSurfaceStyle}>
        <div className={isFullBleed ? "" : isFull ? "mx-auto" : "mx-auto"} style={isFullBleed ? undefined : isFull ? getCmsContainerStyle(appearance, "page") : getCmsContainerStyle(appearance, "content")}>
          <figure className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_18px_70px_rgba(15,23,42,0.08)]">
            <div className="bg-slate-100"><img src={section.image.url} alt={imageAlt} className={`w-full object-cover ${isFull || isFullBleed ? "max-h-[720px]" : "max-h-[560px]"}`} /></div>
            {section.caption ? <figcaption className="px-5 py-4 text-sm leading-7 text-slate-600">{section.caption}</figcaption> : null}
          </figure>
        </div>
      </section>
    );
  }

  if (section.__component === "cms.gallery-section") {
    const isMosaic = section.layout === "mosaic";
    return (
      <section className={`px-4 ${sectionPaddingClass} sm:px-6`} style={sectionSurfaceStyle}>
        <div className="mx-auto" style={getCmsContainerStyle(appearance, "page")}>
          {section.title ? <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ fontFamily: tokens.headingFont }}>{section.title}</h2> : null}
          {section.subtitle ? <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">{section.subtitle}</p> : null}
          <div className={`mt-8 grid gap-4 ${isMosaic ? "md:grid-cols-[1.15fr_0.85fr] xl:grid-cols-[1.25fr_0.75fr]" : "md:grid-cols-2 xl:grid-cols-3"}`}>
            {section.items.map((item, itemIndex) => item.image?.url ? (
              <figure key={`${item.image.url}-${itemIndex}`} className={`overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-[0_16px_60px_rgba(15,23,42,0.06)] ${isMosaic && itemIndex === 0 ? "md:row-span-2" : ""}`}>
                <div className="bg-slate-100"><img src={item.image.url} alt={item.alt || item.image.alternativeText || "Gallery image"} className={`w-full object-cover ${isMosaic && itemIndex === 0 ? "h-[520px]" : "h-[260px]"}`} /></div>
                {item.caption ? <figcaption className="px-4 py-3 text-sm leading-7 text-slate-600">{item.caption}</figcaption> : null}
              </figure>
            ) : null)}
          </div>
        </div>
      </section>
    );
  }

  if (section.__component === "cms.video-embed-section") {
    const isWide = section.layout === "wide";
    return (
      <section className={`px-4 ${sectionPaddingClass} sm:px-6`} style={sectionSurfaceStyle}>
        <div className="mx-auto" style={getCmsContainerStyle(appearance, isWide ? "page" : "content")}>
          {section.title ? <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ fontFamily: tokens.headingFont }}>{section.title}</h2> : null}
          {section.subtitle ? <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">{section.subtitle}</p> : null}
          <div className="mt-8 overflow-hidden rounded-[28px] border border-black/5 bg-slate-950 shadow-[0_18px_70px_rgba(15,23,42,0.12)]"><div className="relative aspect-video"><iframe src={section.embedUrl} title={section.title || "Embedded video"} className="absolute inset-0 h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div></div>
          {section.caption ? <div className="mt-3 text-sm leading-7 text-slate-600">{section.caption}</div> : null}
        </div>
      </section>
    );
  }

  if (section.__component === "cms.image-text-split-section") {
    const imageFirst = section.imagePosition === "left";
    const splitContainer = resolveResponsiveContentContainer(
      appearance,
      section.contentWidth,
      section.mobileContentWidth,
    );
    return (
      <section className={`px-4 ${sectionPaddingClass} sm:px-6`} style={sectionSurfaceStyle}>
        <div className={`${splitContainer.className} grid gap-8 lg:grid-cols-2 lg:items-center`} style={splitContainer.style}>
          <div className={imageFirst ? "lg:order-1" : "lg:order-2"}><div className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_18px_70px_rgba(15,23,42,0.08)]">{section.image?.url ? <img src={section.image.url} alt={section.alt || section.image.alternativeText || "Section image"} className="h-[420px] w-full object-cover" /> : <div className="flex h-[420px] items-center justify-center bg-slate-100 text-sm text-slate-500">Image not set</div>}</div></div>
          <div className={`space-y-5 ${resolveResponsiveContentAlignClass(section.contentAlign, section.mobileContentAlign)} ${imageFirst ? "lg:order-2" : "lg:order-1"}`}>
            {section.eyebrow ? <div className="inline-flex rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]" style={{ background: `${tokens.accent}22`, color: tokens.primary }}>{section.eyebrow}</div> : null}
            <h2 className={`${resolveResponsiveSectionTitleClass(section.titleSize, section.mobileTitleSize)} font-semibold tracking-tight`} style={{ fontFamily: tokens.headingFont }}>{section.title}</h2>
            <div className={`cms-richtext prose prose-slate max-w-none ${resolveResponsiveBodyTextClass(section.bodySize, section.mobileBodySize)}`} dangerouslySetInnerHTML={{ __html: section.content }} />
            {section.buttonLabel && section.buttonUrl ? <Link href={section.buttonUrl} className="inline-flex rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90" style={{ background: tokens.primary }}>{section.buttonLabel}</Link> : null}
          </div>
        </div>
      </section>
    );
  }

  if (section.__component === "cms.feature-grid-section") {
    const featureContainer = resolveResponsiveContentContainer(
      appearance,
      section.contentWidth,
      section.mobileContentWidth,
    );
    return (
      <section className={`px-4 ${sectionPaddingClass} sm:px-6`} style={sectionSurfaceStyle}>
        <div className={`${featureContainer.className} ${resolveResponsiveTextAlignClass(section.contentAlign, section.mobileContentAlign)}`} style={featureContainer.style}>
          {section.title ? <h2 className={`font-semibold tracking-tight ${resolveResponsiveSectionTitleClass(section.titleSize, section.mobileTitleSize)}`} style={{ fontFamily: tokens.headingFont }}>{section.title}</h2> : null}
          {section.subtitle ? <p className={`mt-3 max-w-3xl text-slate-600 ${resolveResponsiveBodyTextClass(section.bodySize, section.mobileBodySize)} ${(section.mobileContentAlign || section.contentAlign) === "center" ? "mx-auto" : ""}`}>{section.subtitle}</p> : null}
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {section.items.map((item) => (
              <article key={`${item.title}-${item.iconName || "item"}`} className="rounded-[24px] border border-black/5 bg-white p-6 shadow-[0_16px_60px_rgba(15,23,42,0.06)]">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-xs font-bold uppercase" style={{ background: `${tokens.primary}12`, color: tokens.primary }}>{(item.iconName || item.title).slice(0, 2)}</div>
                <h3 className="text-xl font-semibold tracking-tight" style={{ fontFamily: tokens.headingFont }}>{item.title}</h3>
                {item.description ? <p className={`mt-3 text-slate-600 ${resolveResponsiveBodyTextClass(section.bodySize, section.mobileBodySize)}`}>{item.description}</p> : null}
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (section.__component === "cms.stats-section") return <StatsSection section={section} appearance={appearance} />;
  if (section.__component === "cms.service-cards-section") return <ServiceCardsSection section={section} appearance={appearance} />;
  if (section.__component === "cms.logo-strip-section") return <LogoStripSection section={section} appearance={appearance} />;
  if (section.__component === "cms.testimonials-section") return <TestimonialsSection section={section} appearance={appearance} />;
  if (section.__component === "cms.posts-list-section") return <PostsListSection section={section} appearance={appearance} />;
  if (section.__component === "cms.tournament-list-section") return <TournamentListSection section={section} appearance={appearance} embedded={embedded} />;

  if (section.__component === "cms.cta-banner") {
    const isSecondary = section.theme === "secondary";
    const ctaContainer = resolveResponsiveContentContainer(
      appearance,
      section.contentWidth,
      section.mobileContentWidth,
    );
    return (
      <section className={`px-4 ${sectionPaddingClass} sm:px-6`} style={sectionSurfaceStyle}>
        <div className={`${ctaContainer.className} rounded-[28px] px-6 py-8 sm:px-10 sm:py-10`} style={{ ...ctaContainer.style, background: isSecondary ? `linear-gradient(135deg, ${tokens.surface}, #ffffff)` : `linear-gradient(135deg, ${tokens.primary}, ${tokens.accent})`, color: isSecondary ? tokens.text : "#ffffff" }}>
          <div className={`flex flex-col gap-6 ${resolveResponsiveCtaLayoutClass(section.contentAlign, section.mobileContentAlign)}`}>
            <div className={`max-w-3xl ${(section.mobileContentAlign || section.contentAlign) === "center" ? "mx-auto" : ""}`}>
              <h2 className={`${resolveResponsiveSectionTitleClass(section.titleSize, section.mobileTitleSize)} font-semibold tracking-tight`} style={{ fontFamily: tokens.headingFont }}>{section.title}</h2>
              {section.description ? <p className={`mt-3 opacity-90 ${resolveResponsiveBodyTextClass(section.bodySize, section.mobileBodySize)}`}>{section.description}</p> : null}
            </div>
            {section.buttonLabel && section.buttonUrl ? <Link href={section.buttonUrl} className="inline-flex rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-90" style={{ background: isSecondary ? tokens.primary : "#ffffff", color: isSecondary ? "#ffffff" : tokens.primary }}>{section.buttonLabel}</Link> : null}
          </div>
        </div>
      </section>
    );
  }

  if (section.__component === "cms.faq-section") {
    return (
      <section className={`px-4 ${sectionPaddingClass} sm:px-6`} style={sectionSurfaceStyle}>
        <div className="mx-auto" style={getCmsContainerStyle(appearance, "text")}>
          {section.title ? <h2 className="mb-8 text-3xl font-semibold tracking-tight sm:text-4xl" style={{ fontFamily: tokens.headingFont }}>{section.title}</h2> : null}
          <div className="space-y-4">
            {section.items.map((item, itemIndex) => (
              <details key={`${item.question}-${itemIndex}`} className="rounded-[22px] border border-black/5 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
                <summary className="cursor-pointer list-none text-lg font-semibold tracking-tight text-slate-950">{item.question}</summary>
                <div className="cms-richtext prose prose-slate mt-4 max-w-none text-sm" dangerouslySetInnerHTML={{ __html: item.answer }} />
              </details>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`px-4 ${sectionPaddingClass} sm:px-6`} style={sectionSurfaceStyle} data-section-index={index}>
      <div className="mx-auto rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-6 text-sm text-slate-500" style={getCmsContainerStyle(appearance, "text")}>
        Unsupported CMS section.
      </div>
    </section>
  );
}
