import type { LandingCtaContent } from "@/components/landing/content";

export function CTA({ content }: { content: LandingCtaContent }) {
  return (
    <section id="cta" className="bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[32px] bg-gradient-to-br from-cyan-500 to-teal-400 px-6 py-10 text-slate-950 shadow-[0_24px_90px_rgba(13,148,136,0.24)] sm:px-10 sm:py-12">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-900/70">
              {content.eyebrow}
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {content.title}
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-900/80">{content.description}</p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={content.primaryCtaUrl}
              className="inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
            >
              {content.primaryCtaLabel}
            </a>
            <a
              href={content.secondaryCtaUrl}
              className="inline-flex rounded-full border border-slate-950/15 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white"
            >
              {content.secondaryCtaLabel}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
