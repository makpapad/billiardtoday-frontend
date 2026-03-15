import { BarChart3, MonitorPlay, Radio, UsersRound } from "lucide-react";
import type { LandingFeaturesContent } from "@/components/landing/content";

const iconMap = {
  monitor: MonitorPlay,
  users: UsersRound,
  radio: Radio,
  chart: BarChart3,
} as const;

export function Features({ content }: { content: LandingFeaturesContent }) {
  return (
    <section id="features" className="bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">
            {content.eyebrow}
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {content.title}
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">{content.subtitle}</p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {content.items.map((feature) => {
            const Icon =
              iconMap[(feature.iconName || "").toLowerCase() as keyof typeof iconMap] || MonitorPlay;
            return (
              <article
                key={feature.title}
                className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-700">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-xl font-semibold tracking-tight text-slate-950">
                  {feature.title}
                </h3>
                <p className="mt-3 text-base leading-7 text-slate-600">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
