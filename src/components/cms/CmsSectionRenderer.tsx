import Link from "next/link";
import type { CmsAppearance, CmsSection } from "@/lib/cms/types";
import { TournamentListSection } from "@/components/tournaments/TournamentListSection";
import { getCmsContainerStyle } from "@/lib/cms/layout";

const shouldRenderSection = (section: CmsSection, embedded: boolean) => {
  if (section.visibility === "embed-only") return embedded;
  if (section.visibility === "page-only") return !embedded;
  return true;
};

type Props = {
  section: CmsSection;
  appearance: CmsAppearance;
  index: number;
  embedded?: boolean;
};

export function CmsSectionRenderer({ section, appearance, index, embedded = false }: Props) {
  const { tokens } = appearance;

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
      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto" style={getCmsContainerStyle(appearance, "page")}>
          {section.title ? (
            <h2
              className="mb-6 text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ fontFamily: tokens.headingFont }}
            >
              {section.title}
            </h2>
          ) : null}
          <div className={`grid ${gridClass} ${gapClass}`}>
            {visibleCells.map((cell, cellIndex) => (
              <div key={`grid-canvas-${index}-${cellIndex}`} className="space-y-4">
                {cell.length ? (
                  cell.map((child, childIndex) => (
                    <CmsSectionRenderer
                      key={`grid-canvas-child-${index}-${cellIndex}-${childIndex}`}
                      section={child}
                      appearance={appearance}
                      index={childIndex}
                      embedded={embedded}
                    />
                  ))
                ) : (
                  <div className="min-h-[120px] rounded-[22px] border border-dashed border-slate-300 bg-white/70 px-5 py-8 text-sm text-slate-400">
                    Empty cell
                  </div>
                )}
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
      <article
        className="h-full rounded-[24px] border border-black/5 p-5 shadow-[0_16px_60px_rgba(15,23,42,0.06)]"
        style={{
          background: isHighlight
            ? `linear-gradient(180deg, ${tokens.surface}, #ffffff)`
            : "#ffffff",
        }}
      >
        {section.image?.url ? (
          <div className="mb-4 overflow-hidden rounded-2xl bg-slate-100">
            <img
              src={section.image.url}
              alt={section.alt || section.image.alternativeText || "Card image"}
              className="h-44 w-full object-cover"
            />
          </div>
        ) : null}
        <div className="space-y-3">
          {section.eyebrow ? (
            <div
              className="inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ background: `${tokens.accent}22`, color: tokens.primary }}
            >
              {section.eyebrow}
            </div>
          ) : null}
          <h3
            className="text-xl font-semibold tracking-tight text-slate-950"
            style={{ fontFamily: tokens.headingFont }}
          >
            {section.title}
          </h3>
          {section.content ? (
            <p className="text-sm leading-7 text-slate-600">{section.content}</p>
          ) : null}
          {section.buttonLabel && section.buttonUrl ? (
            <Link
              href={section.buttonUrl}
              className="inline-flex rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: tokens.primary }}
            >
              {section.buttonLabel}
            </Link>
          ) : null}
        </div>
      </article>
    );
  }

  if (section.__component === "cms.hero-section") {
    return (
      <section className="px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-14">
        <div
          className="mx-auto grid gap-10 overflow-hidden border border-black/5 px-6 py-10 shadow-[0_24px_90px_rgba(15,23,42,0.12)] sm:px-10 sm:py-14 lg:grid-cols-[1.15fr_0.85fr]"
          style={{
            ...getCmsContainerStyle(appearance, "page"),
            borderRadius: tokens.radius,
            background: `linear-gradient(135deg, ${tokens.surface}, #ffffff)`,
          }}
        >
          <div className="space-y-6">
            {section.eyebrow ? (
              <div
                className="inline-flex rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]"
                style={{ background: `${tokens.accent}22`, color: tokens.primary }}
              >
                {section.eyebrow}
              </div>
            ) : null}
            <div className="space-y-4">
              <h1
                className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl"
                style={{ fontFamily: tokens.headingFont }}
              >
                {section.title}
              </h1>
              {section.subtitle ? (
                <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                  {section.subtitle}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              {section.primaryCtaLabel && section.primaryCtaUrl ? (
                <Link
                  href={section.primaryCtaUrl}
                  className="rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ background: tokens.primary }}
                >
                  {section.primaryCtaLabel}
                </Link>
              ) : null}
              {section.secondaryCtaLabel && section.secondaryCtaUrl ? (
                <Link
                  href={section.secondaryCtaUrl}
                  className="rounded-full border px-6 py-3 text-sm font-semibold transition hover:bg-slate-50"
                  style={{ borderColor: `${tokens.primary}33`, color: tokens.text }}
                >
                  {section.secondaryCtaLabel}
                </Link>
              ) : null}
            </div>
          </div>
          <div className="relative min-h-[280px]">
            <div
              className="absolute inset-0"
              style={{
                borderRadius: tokens.radius,
                background: section.backgroundImage?.url
                  ? `linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.28)), url(${section.backgroundImage.url}) center/cover`
                  : `linear-gradient(135deg, ${tokens.primary}, ${tokens.accent})`,
              }}
            />
            <div className="absolute inset-5 rounded-[inherit] border border-white/20" />
            <div className="absolute bottom-5 left-5 max-w-xs rounded-3xl bg-white/88 p-5 backdrop-blur">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Live CMS
              </div>
              <div
                className="mt-2 text-2xl font-semibold tracking-tight text-slate-950"
                style={{ fontFamily: tokens.headingFont }}
              >
                Structured content and public data in one flow.
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (section.__component === "cms.layout-flex-canvas-section") {
    const directionClass =
      section.direction === "row-reverse"
        ? "lg:flex-row-reverse"
        : section.direction === "column"
          ? "flex-col"
          : "lg:flex-row";
    const justifyClass =
      section.justify === "center"
        ? "lg:justify-center"
        : section.justify === "start"
          ? "lg:justify-start"
          : "lg:justify-between";
    const alignClass =
      section.align === "start"
        ? "lg:items-start"
        : section.align === "center"
          ? "lg:items-center"
          : "lg:items-stretch";
    const gapClass = section.gap === "wide" ? "gap-6" : "gap-4";
    const visibleCells = section.cells.slice(0, 4);

    return (
      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto" style={getCmsContainerStyle(appearance, "page")}>
          {section.title ? (
            <h2
              className="mb-6 text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ fontFamily: tokens.headingFont }}
            >
              {section.title}
            </h2>
          ) : null}
          <div className={`flex ${gapClass} ${directionClass} ${justifyClass} ${alignClass}`}>
            {visibleCells.map((cell, cellIndex) => (
              <div key={`flex-canvas-${index}-${cellIndex}`} className="min-w-0 flex-1 space-y-4">
                {cell.length ? (
                  cell.map((child, childIndex) => (
                    <CmsSectionRenderer
                      key={`flex-canvas-child-${index}-${cellIndex}-${childIndex}`}
                      section={child}
                      appearance={appearance}
                      index={childIndex}
                      embedded={embedded}
                    />
                  ))
                ) : (
                  <div className="min-h-[120px] rounded-[22px] border border-dashed border-slate-300 bg-white/70 px-5 py-8 text-sm text-slate-400">
                    Empty slot
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (section.__component === "cms.spacer-section") {
    const heightClass = section.size === "sm" ? "h-8" : section.size === "lg" ? "h-20" : section.size === "xl" ? "h-28" : "h-12";
    return <div className={`w-full ${heightClass}`} aria-hidden="true" />;
  }

  if (section.__component === "cms.rich-text-section") {
    return (
      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto" style={getCmsContainerStyle(appearance, "text")}>
          {section.title ? (
            <h2
              className="mb-6 text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ fontFamily: tokens.headingFont }}
            >
              {section.title}
            </h2>
          ) : null}
          <div
            className="cms-richtext prose prose-slate max-w-none prose-headings:font-semibold prose-a:no-underline"
            dangerouslySetInnerHTML={{ __html: section.content }}
          />
        </div>
      </section>
    );
  }

  if (section.__component === "cms.image-section") {
    if (!section.image?.url) {
      return null;
    }

    const imageAlt = section.alt || section.image?.alternativeText || "CMS image";
    const isFull = section.layout === "full";

    return (
      <section className={isFull ? "py-8 sm:py-10" : "px-4 py-8 sm:px-6 sm:py-10"}>
        <div className={isFull ? "" : "mx-auto"} style={isFull ? undefined : getCmsContainerStyle(appearance, "content")}>
          <figure className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_18px_70px_rgba(15,23,42,0.08)]">
            <div className="bg-slate-100">
              <img
                src={section.image.url}
                alt={imageAlt}
                className={`w-full object-cover ${isFull ? "max-h-[720px]" : "max-h-[560px]"}`}
              />
            </div>
            {section.caption ? (
              <figcaption className="px-5 py-4 text-sm leading-7 text-slate-600">
                {section.caption}
              </figcaption>
            ) : null}
          </figure>
        </div>
      </section>
    );
  }

  if (section.__component === "cms.gallery-section") {
    const isMosaic = section.layout === "mosaic";
    return (
      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto" style={getCmsContainerStyle(appearance, "page")}>
          {section.title ? (
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ fontFamily: tokens.headingFont }}>
              {section.title}
            </h2>
          ) : null}
          {section.subtitle ? (
            <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">{section.subtitle}</p>
          ) : null}
          <div className={`mt-8 grid gap-4 ${isMosaic ? "md:grid-cols-[1.15fr_0.85fr] xl:grid-cols-[1.25fr_0.75fr]" : "md:grid-cols-2 xl:grid-cols-3"}`}>
            {section.items.map((item, itemIndex) =>
              item.image?.url ? (
                <figure key={`${item.image.url}-${itemIndex}`} className={`overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-[0_16px_60px_rgba(15,23,42,0.06)] ${isMosaic && itemIndex === 0 ? "md:row-span-2" : ""}`}>
                  <div className="bg-slate-100">
                    <img
                      src={item.image.url}
                      alt={item.alt || item.image.alternativeText || "Gallery image"}
                      className={`w-full object-cover ${isMosaic && itemIndex === 0 ? "h-[520px]" : "h-[260px]"}`}
                    />
                  </div>
                  {item.caption ? <figcaption className="px-4 py-3 text-sm leading-7 text-slate-600">{item.caption}</figcaption> : null}
                </figure>
              ) : null,
            )}
          </div>
        </div>
      </section>
    );
  }

  if (section.__component === "cms.video-embed-section") {
    const isWide = section.layout === "wide";
    return (
      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto" style={getCmsContainerStyle(appearance, isWide ? "page" : "content")}>
          {section.title ? (
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ fontFamily: tokens.headingFont }}>
              {section.title}
            </h2>
          ) : null}
          {section.subtitle ? (
            <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">{section.subtitle}</p>
          ) : null}
          <div className="mt-8 overflow-hidden rounded-[28px] border border-black/5 bg-slate-950 shadow-[0_18px_70px_rgba(15,23,42,0.12)]">
            <div className="relative aspect-video">
              <iframe
                src={section.embedUrl}
                title={section.title || "Embedded video"}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
          {section.caption ? <div className="mt-3 text-sm leading-7 text-slate-600">{section.caption}</div> : null}
        </div>
      </section>
    );
  }

  if (section.__component === "cms.image-text-split-section") {
    const imageFirst = section.imagePosition === "left";
    return (
      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto grid gap-8 lg:grid-cols-2 lg:items-center" style={getCmsContainerStyle(appearance, "page")}>
          <div className={imageFirst ? "lg:order-1" : "lg:order-2"}>
            <div className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_18px_70px_rgba(15,23,42,0.08)]">
              {section.image?.url ? (
                <img
                  src={section.image.url}
                  alt={section.alt || section.image.alternativeText || "Section image"}
                  className="h-[420px] w-full object-cover"
                />
              ) : (
                <div className="flex h-[420px] items-center justify-center bg-slate-100 text-sm text-slate-500">Image not set</div>
              )}
            </div>
          </div>
          <div className={`space-y-5 ${imageFirst ? "lg:order-2" : "lg:order-1"}`}>
            {section.eyebrow ? (
              <div className="inline-flex rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]" style={{ background: `${tokens.accent}22`, color: tokens.primary }}>
                {section.eyebrow}
              </div>
            ) : null}
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ fontFamily: tokens.headingFont }}>
              {section.title}
            </h2>
            <div className="cms-richtext prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: section.content }} />
            {section.buttonLabel && section.buttonUrl ? (
              <Link
                href={section.buttonUrl}
                className="inline-flex rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ background: tokens.primary }}
              >
                {section.buttonLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (section.__component === "cms.feature-grid-section") {
    return (
      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto" style={getCmsContainerStyle(appearance, "page")}>
          {section.title ? (
            <h2
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ fontFamily: tokens.headingFont }}
            >
              {section.title}
            </h2>
          ) : null}
          {section.subtitle ? (
            <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
              {section.subtitle}
            </p>
          ) : null}
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {section.items.map((item) => (
              <article
                key={`${item.title}-${item.iconName || "item"}`}
                className="rounded-[24px] border border-black/5 bg-white p-6 shadow-[0_16px_60px_rgba(15,23,42,0.06)]"
              >
                <div
                  className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-xs font-bold uppercase"
                  style={{ background: `${tokens.primary}12`, color: tokens.primary }}
                >
                  {(item.iconName || item.title).slice(0, 2)}
                </div>
                <h3
                  className="text-xl font-semibold tracking-tight"
                  style={{ fontFamily: tokens.headingFont }}
                >
                  {item.title}
                </h3>
                {item.description ? (
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (section.__component === "cms.tournament-list-section") {
    return (
      <TournamentListSection
        section={section}
        appearance={appearance}
        embedded={embedded}
      />
    );
  }

  if (section.__component === "cms.cta-banner") {
    const isSecondary = section.theme === "secondary";
    return (
      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div
          className="mx-auto rounded-[28px] px-6 py-8 sm:px-10 sm:py-10"
          style={{
            ...getCmsContainerStyle(appearance, "page"),
            background: isSecondary
              ? `linear-gradient(135deg, ${tokens.surface}, #ffffff)`
              : `linear-gradient(135deg, ${tokens.primary}, ${tokens.accent})`,
            color: isSecondary ? tokens.text : "#ffffff",
          }}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <h2
                className="text-3xl font-semibold tracking-tight sm:text-4xl"
                style={{ fontFamily: tokens.headingFont }}
              >
                {section.title}
              </h2>
              {section.description ? (
                <p className="mt-3 text-base leading-8 opacity-90">{section.description}</p>
              ) : null}
            </div>
            {section.buttonLabel && section.buttonUrl ? (
              <Link
                href={section.buttonUrl}
                className="inline-flex rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-90"
                style={{
                  background: isSecondary ? tokens.primary : "#ffffff",
                  color: isSecondary ? "#ffffff" : tokens.primary,
                }}
              >
                {section.buttonLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (section.__component === "cms.faq-section") {
    return (
      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto" style={getCmsContainerStyle(appearance, "text")}>
          {section.title ? (
            <h2
              className="mb-8 text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ fontFamily: tokens.headingFont }}
            >
              {section.title}
            </h2>
          ) : null}
          <div className="space-y-4">
            {section.items.map((item, itemIndex) => (
              <details
                key={`${item.question}-${itemIndex}`}
                className="rounded-[22px] border border-black/5 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
              >
                <summary className="cursor-pointer list-none text-lg font-semibold tracking-tight text-slate-950">
                  {item.question}
                </summary>
                <div
                  className="cms-richtext prose prose-slate mt-4 max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: item.answer }}
                />
              </details>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-8 sm:px-6 sm:py-10" data-section-index={index}>
      <div className="mx-auto rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-6 text-sm text-slate-500" style={getCmsContainerStyle(appearance, "text")}>
        Unsupported CMS section.
      </div>
    </section>
  );
}
