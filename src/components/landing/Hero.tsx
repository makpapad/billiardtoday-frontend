import { ArrowRight, MonitorSmartphone, RadioTower, Trophy } from "lucide-react";
import type { LandingHeroContent } from "@/components/landing/content";

const icons = [MonitorSmartphone, Trophy, RadioTower];

export function Hero({ content }: { content: LandingHeroContent }) {
  return (
    <section className="border-b border-white/10 bg-slate-950 pb-20 pt-16 sm:pb-24 sm:pt-20">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
        <div className="space-y-8">
          <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
            {content.eyebrow}
          </div>

          <div className="space-y-5">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {content.title}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">{content.subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={content.primaryCtaUrl}
              className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_14px_35px_rgba(34,211,238,0.3)] transition hover:bg-cyan-300"
            >
              {content.primaryCtaLabel}
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href={content.secondaryCtaUrl}
              className="inline-flex rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
            >
              {content.secondaryCtaLabel}
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {content.stats.map((item) => (
              <div
                key={item.label}
                className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.22)]"
              >
                <div className="text-2xl font-semibold tracking-tight text-white">{item.value}</div>
                <div className="mt-2 text-sm leading-6 text-slate-400">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute left-8 top-0 h-32 w-32 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute bottom-10 right-0 h-40 w-40 rounded-full bg-teal-300/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-slate-900 shadow-[0_32px_120px_rgba(8,47,73,0.42)]">
            <div className="border-b border-white/10 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">{content.showcaseLabel}</div>
                  <div className="text-xs text-slate-400">{content.showcaseTitle}</div>
                </div>
                <a
                  href="https://admin.billiardtoday.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/15 hover:text-cyan-100"
                >
                  {content.showcaseStatus}
                </a>
              </div>
            </div>

            <div className="grid gap-4 p-6">
              <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[24px] border border-white/10 bg-slate-950 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{content.liveScoreLabel}</div>
                      <div className="mt-3 text-3xl font-semibold tracking-tight text-white">{content.liveScoreValue}</div>
                    </div>
                    <div className="rounded-2xl bg-cyan-400/15 px-3 py-2 text-xs font-medium text-cyan-200">
                      {content.liveScoreStatus}
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/5 p-4">
                      <div className="text-xs text-slate-500">{content.playerALabel}</div>
                      <div className="mt-2 text-lg font-semibold text-white">{content.playerAName}</div>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-4">
                      <div className="text-xs text-slate-500">{content.playerBLabel}</div>
                      <div className="mt-2 text-lg font-semibold text-white">{content.playerBName}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {content.highlights.map((item, index) => {
                    const Icon = icons[index] || MonitorSmartphone;
                    return (
                      <div
                        key={item.title}
                        className="rounded-[24px] border border-white/10 bg-white/5 p-4"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="mt-4 text-sm font-semibold text-white">{item.title}</div>
                        <div className="mt-2 text-sm leading-6 text-slate-400">{item.description}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-gradient-to-r from-cyan-400 to-teal-300 p-[1px]">
                <div className="rounded-[27px] bg-slate-950 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{content.adTitle}</div>
                      <div className="text-sm text-slate-400">{content.adDescription}</div>
                    </div>
                    <div className="rounded-full bg-white/5 px-3 py-2 text-xs text-cyan-100">
                      {content.adMetric}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
