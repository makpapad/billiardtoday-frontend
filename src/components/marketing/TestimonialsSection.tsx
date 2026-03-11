import type { CmsAppearance, CmsTestimonialsSection } from "@/lib/cms/types";
import { getCmsContainerStyle } from "@/lib/cms/layout";

export function TestimonialsSection({
  section,
  appearance,
}: {
  section: CmsTestimonialsSection;
  appearance: CmsAppearance;
}) {
  const { tokens } = appearance;
  const featured = section.layout === "featured";
  const [first, ...rest] = section.items;

  return (
    <section className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto" style={getCmsContainerStyle(appearance, "page")}>
        {section.title ? (
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ fontFamily: tokens.headingFont }}>
            {section.title}
          </h2>
        ) : null}
        {section.subtitle ? <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">{section.subtitle}</p> : null}
        {featured && first ? (
          <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-[30px] border border-black/5 bg-white px-7 py-8 shadow-[0_18px_70px_rgba(15,23,42,0.07)]">
              <div className="text-5xl leading-none" style={{ color: tokens.primary }}>"</div>
              <p className="mt-4 text-xl leading-9 text-slate-700">{first.quote}</p>
              <div className="mt-6">
                {first.name ? <div className="font-semibold text-slate-950">{first.name}</div> : null}
                {(first.role || first.company) ? <div className="text-sm text-slate-500">{[first.role, first.company].filter(Boolean).join(", ")}</div> : null}
              </div>
            </article>
            <div className="grid gap-4">
              {rest.map((item, index) => (
                <article key={`${item.name || "quote"}-${index}`} className="rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_14px_50px_rgba(15,23,42,0.05)]">
                  <p className="text-sm leading-7 text-slate-600">{item.quote}</p>
                  <div className="mt-4">
                    {item.name ? <div className="font-semibold text-slate-950">{item.name}</div> : null}
                    {(item.role || item.company) ? <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{[item.role, item.company].filter(Boolean).join(" • ")}</div> : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {section.items.map((item, index) => (
              <article key={`${item.name || "quote"}-${index}`} className="rounded-[26px] border border-black/5 bg-white p-6 shadow-[0_16px_60px_rgba(15,23,42,0.06)]">
                <div className="text-4xl leading-none" style={{ color: tokens.primary }}>"</div>
                <p className="mt-4 text-base leading-8 text-slate-700">{item.quote}</p>
                <div className="mt-6">
                  {item.name ? <div className="font-semibold text-slate-950">{item.name}</div> : null}
                  {(item.role || item.company) ? <div className="text-sm text-slate-500">{[item.role, item.company].filter(Boolean).join(", ")}</div> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
