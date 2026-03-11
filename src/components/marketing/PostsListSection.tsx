import Link from "next/link";
import type { CmsAppearance, CmsPostsListSection } from "@/lib/cms/types";
import { getCmsContainerStyle } from "@/lib/cms/layout";
import { getCmsSectionPaddingClass, getCmsSectionSurfaceStyle } from "@/lib/cms/sectionStyles";

export function PostsListSection({
  section,
  appearance,
}: {
  section: CmsPostsListSection;
  appearance: CmsAppearance;
}) {
  const { tokens } = appearance;
  const columnsClass = section.columns === "2" ? "lg:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3";
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
        <div className={`mt-8 grid gap-5 ${columnsClass}`}>
          {section.items.map((item, index) => (
            <article key={`${item.title}-${index}`} className="overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-[0_16px_60px_rgba(15,23,42,0.06)]">
              {item.image?.url ? (
                <img src={item.image.url} alt={item.image.alternativeText || item.title} className="h-52 w-full object-cover" />
              ) : (
                <div className="h-52 w-full bg-slate-100" />
              )}
              <div className="p-6">
                {item.tag ? (
                  <div className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ background: `${tokens.accent}22`, color: tokens.primary }}>
                    {item.tag}
                  </div>
                ) : null}
                <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950" style={{ fontFamily: tokens.headingFont }}>
                  {item.title}
                </h3>
                {item.excerpt ? <p className="mt-3 text-sm leading-7 text-slate-600">{item.excerpt}</p> : null}
                {item.url ? (
                  <Link href={item.url} className="mt-5 inline-flex text-sm font-semibold" style={{ color: tokens.primary }}>
                    Read article
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
