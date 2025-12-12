"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useLandingT } from "./i18n";

export function FinalCTA() {
  const { t } = useLandingT();
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0a0e1a] to-[#111827] py-24 px-6 text-white">
      <div className="absolute inset-0">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-[#00ff88]/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-[#00d9ff]/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#00ff88]/30 bg-[#1a2235] px-4 py-2">
          <Sparkles className="h-4 w-4 text-[#00ff88]" />
          <span className="uppercase tracking-wider text-[#00ff88]">{t('finalCTA.badge')}</span>
        </div>

        <h2 className="mb-6 text-3xl font-semibold leading-tight md:text-4xl">
          {t('finalCTA.title')}
          <br />
          {t('finalCTA.subtitle')}
        </h2>

        <p className="mx-auto mb-12 max-w-2xl text-[#94a3b8]">
          {t('finalCTA.description')}
        </p>

        <div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button className="group flex items-center gap-2 rounded-lg bg-[#00ff88] px-8 py-4 font-semibold text-[#0a0e1a] transition-all hover:scale-105 hover:bg-[#00ff88]/90 hover:shadow-[0_0_30px_rgba(0,255,136,0.3)]">
            {t('finalCTA.createTournament')}
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
          <button className="rounded-lg border-2 border-[#00d9ff] px-8 py-4 font-semibold text-[#00d9ff] transition-all hover:bg-[#00d9ff]/10">
            {t('finalCTA.browseTournaments')}
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-[#64748b]">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00ff88]" />
            <span>{t('finalCTA.freeSignup')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00d9ff]" />
            <span>{t('finalCTA.noCreditCard')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ffd600]" />
            <span>{t('finalCTA.setup5Minutes')}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
