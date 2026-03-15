import type { LandingHowItWorksContent } from "@/components/landing/content";

export function HowItWorks({ content }: { content: LandingHowItWorksContent }) {
  return (
    <section id="how-it-works" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">
              {content.eyebrow}
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {content.title}
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">{content.subtitle}</p>
          </div>

          <div className="grid gap-4">
            {content.steps.map((item) => (
              <article
                key={item.step}
                className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)]"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-cyan-300">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-base leading-7 text-slate-600">{item.description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
