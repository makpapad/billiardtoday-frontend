import type { LandingBenefitsContent } from "@/components/landing/content";

export function Benefits({ content }: { content: LandingBenefitsContent }) {
  return (
    <section id="benefits" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-slate-200 bg-slate-950 px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:px-8 sm:py-10">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
              {content.eyebrow}
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {content.title}
            </h2>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {content.items.map((benefit) => (
              <article
                key={benefit.value}
                className="rounded-[28px] border border-white/10 bg-white/5 p-6"
              >
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
                  {benefit.label}
                </div>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-white">{benefit.value}</h3>
                <p className="mt-3 text-base leading-7 text-slate-300">{benefit.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
