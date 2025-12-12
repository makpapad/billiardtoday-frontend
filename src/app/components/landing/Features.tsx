"use client";

import { Trophy, Activity, BarChart3, Users, Timer, Award } from "lucide-react";
import { useLandingT } from "./i18n";

export function Features() {
  const { t } = useLandingT();
  
  const features = [
    {
      icon: Trophy,
      title: t('features.tournament.title'),
      description: t('features.tournament.description'),
      color: "#00ff88",
    },
    {
      icon: Activity,
      title: t('features.liveScores.title'),
      description: t('features.liveScores.description'),
      color: "#00d9ff",
    },
    {
      icon: BarChart3,
      title: t('features.stats.title'),
      description: t('features.stats.description'),
      color: "#ffd600",
    },
    {
      icon: Users,
      title: t('features.playerManagement.title'),
      description: t('features.playerManagement.description'),
      color: "#ff3366",
    },
    {
      icon: Timer,
      title: t('features.matchTimer.title'),
      description: t('features.matchTimer.description'),
      color: "#00ff88",
    },
    {
      icon: Award,
      title: t('features.rankings.title'),
      description: t('features.rankings.description'),
      color: "#00d9ff",
    },
  ];
  return (
    <section id="features" className="bg-[#111827] py-24 px-6 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <div className="mb-6 inline-block rounded-full border border-[#00ff88]/30 bg-[#00ff88]/10 px-4 py-1">
            <span className="uppercase tracking-wider text-[#00ff88]">{t('features.badge')}</span>
          </div>

          <h2 className="mb-4 text-3xl font-semibold leading-tight md:text-4xl">
            {t('features.title')}
          </h2>

          <p className="mx-auto max-w-2xl text-[#94a3b8]">
            {t('features.description')}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group rounded-xl border border-[#1e293b] bg-[#1a2235] p-6 transition duration-200 hover:scale-[1.02] hover:border-[#334155]"
            >
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${feature.color}20` }}
              >
                <feature.icon className="h-7 w-7" style={{ color: feature.color }} />
              </div>

              <h3 className="mb-3 text-lg font-semibold">{feature.title}</h3>

              <p className="text-[#94a3b8]">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
