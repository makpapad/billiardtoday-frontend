import Link from "next/link";
import type { CmsAppearance, CmsServiceCardsSection } from "@/lib/cms/types";
import { getCmsContainerStyle } from "@/lib/cms/layout";
import { getCmsSectionPaddingClass, getCmsSectionSurfaceStyle } from "@/lib/cms/sectionStyles";

export function ServiceCardsSection({
  section,
  appearance,
}: {
  section: CmsServiceCardsSection;
  appearance: CmsAppearance;
}) {
  const { tokens } = appearance;
  const paddingClass = getCmsSectionPaddingClass(section.paddingY);

  return (
    <section className={`px-4 ${paddingClass} sm:px-6`} style={getCmsSectionSurfaceStyle(section, appearance)}>
      <div className="mx-auto" style={getCmsContainerStyle(appearance, "page")}>
        {section.title ? (
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ fontFamily: tokens.headingFont }}>
            {section.title}
          </h2>
        ) : null}
        {section.subtitle ? <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">{section.subtitle}</p> : null}
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {section.items.map((item, index) => (
            <article
              key={`${item.title}-${index}`}
              className="rounded-[26px] border border-black/5 bg-white p-6 shadow-[0_16px_60px_rgba(15,23,42,0.06)]"
            >
              <div
                className="inline-flex h-12 min-w-12 items-center justify-center rounded-2xl px-3 text-xs font-bold uppercase"
                style={{ background: `${tokens.primary}12`, color: tokens.primary }}
              >
                {(item.iconName || item.title).slice(0, 2)}
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-950" style={{ fontFamily: tokens.headingFont }}>
                {item.title}
              </h3>
              {item.description ? <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p> : null}
              {item.linkLabel && item.linkUrl ? (
                <Link href={item.linkUrl} className="mt-5 inline-flex text-sm font-semibold" style={{ color: tokens.primary }}>
                  {item.linkLabel}
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
