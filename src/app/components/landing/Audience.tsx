"use client";

import { Building2, UserCircle, Users2 } from "lucide-react";
import { useLandingT } from "./i18n";

export function Audience() {
  const { t } = useLandingT();
  
  const audiences = [
    {
      icon: Building2,
      title: t('audience.clubs.title'),
      description: t('audience.clubs.description'),
      features: [
        t('audience.clubs.features.multiTournament'),
        t('audience.clubs.features.venuePromotion'),
        t('audience.clubs.features.autoBrackets'),
        t('audience.clubs.features.participationStats')
      ],
      color: "#00ff88",
    },
    {
      icon: Users2,
      title: t('audience.organizers.title'),
      description: t('audience.organizers.description'),
      features: [
        t('audience.organizers.features.centralManagement'),
        t('audience.organizers.features.liveScores'),
        t('audience.organizers.features.autoDraws'),
        t('audience.organizers.features.printableBrackets')
      ],
      color: "#00d9ff",
    },
    {
      icon: UserCircle,
      title: t('audience.players.title'),
      description: t('audience.players.description'),
      features: [
        t('audience.players.features.profileStats'),
        t('audience.players.features.tournamentRegistration'),
        t('audience.players.features.rankings'),
        t('audience.players.features.matchHistory')
      ],
      color: "#ffd600",
    },
  ];
  return (
    <section id="for-you" className="bg-[#0a0e1a] py-24 px-6 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <div className="mb-6 inline-block rounded-full border border-[#ff3366]/30 bg-[#ff3366]/10 px-4 py-1">
            <span className="uppercase tracking-wider text-[#ff3366]">{t('audience.badge')}</span>
          </div>

          <h2 className="mb-4 text-3xl font-extrabold leading-tight md:text-4xl">{t('audience.title')}</h2>

          <p className="mx-auto max-w-2xl text-[#94a3b8]">
            {t('audience.description')}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {audiences.map((audience) => (
            <article
              key={audience.title}
              className="rounded-2xl border border-[#1e293b] bg-gradient-to-b from-[#1a2235] to-[#111827] p-8 transition-all hover:border-[#334155]"
            >
              <div
                className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${audience.color}20` }}
              >
                <audience.icon className="h-8 w-8" style={{ color: audience.color }} />
              </div>

              <h3 className="mb-4 text-xl font-semibold">{audience.title}</h3>

              <p className="mb-6 text-[#94a3b8]">{audience.description}</p>

              <ul className="space-y-3">
                {audience.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-[#94a3b8]">
                    <span
                      className="mt-2 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: audience.color }}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
