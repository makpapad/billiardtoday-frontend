import Link from "next/link";
import type { CmsAppearance, CmsLogoStripSection } from "@/lib/cms/types";
import { getCmsContainerStyle } from "@/lib/cms/layout";
import { getCmsSectionPaddingClass, getCmsSectionSurfaceStyle } from "@/lib/cms/sectionStyles";

export function LogoStripSection({
  section,
  appearance,
}: {
  section: CmsLogoStripSection;
  appearance: CmsAppearance;
}) {
  const { tokens } = appearance;
  const pillStyle = section.style === "pills";
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
        <div className={`mt-8 grid gap-3 ${pillStyle ? "sm:grid-cols-2 xl:grid-cols-4" : "grid-cols-2 md:grid-cols-3 xl:grid-cols-6"}`}>
          {section.items.map((item, index) => {
            const content = (
              <div
                className={`flex min-h-[88px] items-center justify-center gap-3 rounded-[24px] border px-5 py-4 ${pillStyle ? "border-black/5 bg-white shadow-[0_14px_50px_rgba(15,23,42,0.05)]" : "border-black/5 bg-white/80"}`}
              >
                {item.image?.url ? (
                  <img
                    src={item.image.url}
                    alt={item.name || item.image.alternativeText || "Logo"}
                    className="max-h-10 w-auto max-w-[140px] object-contain"
                  />
                ) : null}
                {pillStyle && item.name ? <span className="text-sm font-semibold text-slate-700">{item.name}</span> : null}
              </div>
            );

            return item.url ? (
              <Link key={`${item.name || "logo"}-${index}`} href={item.url}>
                {content}
              </Link>
            ) : (
              <div key={`${item.name || "logo"}-${index}`}>{content}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
