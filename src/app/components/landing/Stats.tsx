"use client";

import { useLandingT } from "./i18n";

export function Stats() {
  const { t } = useLandingT();
  
  const stats = [
    { label: t('stats.activeTournaments'), value: "240+" },
    { label: t('stats.players'), value: "3.5k" },
    { label: t('stats.registeredMatches'), value: "12k" },
  ];
  return (
    <section className="bg-gradient-to-b from-[#060910] via-[#0b1020] to-[#0c1224] text-white">
      <div className="mx-auto max-w-5xl px-6 py-16 lg:py-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/5 backdrop-blur"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-extrabold leading-tight text-[#8ef3c2] sm:text-4xl">
                {item.value}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
