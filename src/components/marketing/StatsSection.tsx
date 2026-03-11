import type { CmsAppearance, CmsStatsSection } from "@/lib/cms/types";
import { getCmsContainerStyle } from "@/lib/cms/layout";
import { getCmsSectionPaddingClass, getCmsSectionSurfaceStyle } from "@/lib/cms/sectionStyles";

export function StatsSection({
  section,
  appearance,
}: {
  section: CmsStatsSection;
  appearance: CmsAppearance;
}) {
  const { tokens } = appearance;
  const isBand = section.layout === "band";
  const paddingClass = getCmsSectionPaddingClass(section.paddingY);

  return (
    <section className={`px-4 ${paddingClass} sm:px-6`} style={getCmsSectionSurfaceStyle(section, appearance)}>
      <div
        className={`mx-auto ${isBand ? "rounded-[30px] px-6 py-8 sm:px-10" : ""}`}
        style={{
          ...getCmsContainerStyle(appearance, "page"),
          ...(isBand
            ? {
                background: `linear-gradient(135deg, ${tokens.primary}, ${tokens.accent})`,
                color: "#ffffff",
              }
            : {}),
        }}
      >
        {section.title ? (
          <h2
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
            style={{ fontFamily: tokens.headingFont }}
          >
            {section.title}
          </h2>
        ) : null}
        {section.subtitle ? (
          <p className={`mt-3 max-w-3xl text-base leading-8 ${isBand ? "text-white/85" : "text-slate-600"}`}>
            {section.subtitle}
          </p>
        ) : null}
        <div className={`mt-8 grid gap-4 ${section.items.length >= 4 ? "md:grid-cols-2 xl:grid-cols-4" : section.items.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {section.items.map((item, index) => (
            <article
              key={`${item.value}-${index}`}
              className={`rounded-[24px] border px-5 py-6 ${isBand ? "border-white/12 bg-white/10" : "border-black/5 bg-white shadow-[0_16px_60px_rgba(15,23,42,0.06)]"}`}
            >
              <div
                className={`text-4xl font-semibold tracking-tight sm:text-5xl ${isBand ? "text-white" : "text-slate-950"}`}
                style={{ fontFamily: tokens.headingFont }}
              >
                {item.value}
              </div>
              {item.label ? (
                <div className={`mt-3 text-sm font-semibold uppercase tracking-[0.16em] ${isBand ? "text-white/78" : "text-slate-500"}`}>
                  {item.label}
                </div>
              ) : null}
              {item.description ? (
                <p className={`mt-3 text-sm leading-7 ${isBand ? "text-white/82" : "text-slate-600"}`}>
                  {item.description}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
