"use client";

import { Target, Trophy, Users } from "lucide-react";
import { useLandingT } from "./i18n";
import { useWordpressLanding } from "./wordpressLanding";

export function Hero() {
  const { t } = useLandingT();
  const wordpressLanding = useWordpressLanding();

  const heroBackgroundImageUrl =
    wordpressLanding?.heroBackgroundImageUrl ??
    "https://images.unsplash.com/photo-1643818692075-5fc2933aa969?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiaWxsaWFyZHMlMjBwb29sJTIwdGFibGV8ZW58MXx8fHwxNzY1NTI2MDU0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

  const primaryCtaHref = wordpressLanding?.heroPrimaryCtaHref ?? "#";
  const secondaryCtaHref = wordpressLanding?.heroSecondaryCtaHref ?? "#";

  const activeTournamentsValue = wordpressLanding?.statsActiveTournamentsValue ?? "240+";
  const registeredPlayersValue = wordpressLanding?.statsRegisteredPlayersValue ?? "3,500+";
  const completedMatchesValue = wordpressLanding?.statsCompletedMatchesValue ?? "12,000+";

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          src={heroBackgroundImageUrl}
          alt={t('hero.backgroundAlt')}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e1a]/85 via-[#0a0e1a]/80 to-[#0a0e1a]" />
      </div>

      <div className="absolute inset-0 z-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-[#00ff88]/20 blur-xl animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-[#00d9ff]/20 blur-xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#00ff88]/30 bg-[#1a2235] px-4 py-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-[#00ff88]" />
          <span className="uppercase tracking-wider text-[#00ff88]">{t('hero.livePlatform')}</span>
        </div>

        <h1
          className="mb-6 text-white drop-shadow-[0_2px_20px_rgba(0,255,136,0.3)]"
          style={{ textShadow: "0 0 80px rgba(0,255,136,0.4), 0 0 40px rgba(0,217,255,0.3)" }}
        >
          {t('hero.title')}
          <br />
          {t('hero.subtitle')}
        </h1>

        <p className="mx-auto mb-12 max-w-2xl text-[#94a3b8]">
          {t('hero.description')}
        </p>

        <div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href={primaryCtaHref}
            className="group relative overflow-hidden rounded-lg border-2 border-[#00ff88] bg-[#00ff88] px-10 py-5 text-[#0a0e1a] transition-all hover:scale-110 hover:shadow-[0_0_60px_rgba(0,255,136,0.6)]"
          >
            <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
            <span className="relative z-10 uppercase tracking-wide">{t('hero.createTournament')}</span>
          </a>
          <a
            href={secondaryCtaHref}
            className="rounded-lg border-2 border-[#00d9ff] px-8 py-4 text-[#00d9ff] transition-all hover:bg-[#00d9ff]/10"
          >
            {t('hero.viewTournaments')}
          </a>
        </div>

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
          <div className="group relative rounded-xl border-2 border-[#00ff88]/30 bg-gradient-to-br from-[#1a2235] to-[#0f1520] p-6 shadow-[0_0_20px_rgba(0,255,136,0.15)] transition-all hover:border-[#00ff88]/60">
            <div className="absolute right-3 top-3 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00ff88]" />
              <span className="text-[10px] uppercase tracking-wider text-[#00ff88]">{t('hero.live')}</span>
            </div>
            <Trophy className="mx-auto mb-4 h-10 w-10 text-[#00ff88] drop-shadow-[0_0_8px_rgba(0,255,136,0.5)]" />
            <div className="mb-2 text-[#00ff88] tracking-tight">{activeTournamentsValue}</div>
            <div className="uppercase tracking-wide text-[#94a3b8]">{t('hero.activeTournaments')}</div>
          </div>
          <div className="group relative rounded-xl border-2 border-[#00d9ff]/30 bg-gradient-to-br from-[#1a2235] to-[#0f1520] p-6 shadow-[0_0_20px_rgba(0,217,255,0.15)] transition-all hover:border-[#00d9ff]/60">
            <div className="absolute right-3 top-3 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00d9ff]" style={{ animationDelay: "0.3s" }} />
              <span className="text-[10px] uppercase tracking-wider text-[#00d9ff]">{t('hero.live')}</span>
            </div>
            <Users className="mx-auto mb-4 h-10 w-10 text-[#00d9ff] drop-shadow-[0_0_8px_rgba(0,217,255,0.5)]" />
            <div className="mb-2 text-[#00d9ff] tracking-tight">{registeredPlayersValue}</div>
            <div className="uppercase tracking-wide text-[#94a3b8]">{t('hero.registeredPlayers')}</div>
          </div>
          <div className="group relative rounded-xl border-2 border-[#ffd600]/30 bg-gradient-to-br from-[#1a2235] to-[#0f1520] p-6 shadow-[0_0_20px_rgba(255,214,0,0.15)] transition-all hover:border-[#ffd600]/60">
            <div className="absolute right-3 top-3 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ffd600]" style={{ animationDelay: "0.6s" }} />
              <span className="text-[10px] uppercase tracking-wider text-[#ffd600]">{t('hero.live')}</span>
            </div>
            <Target className="mx-auto mb-4 h-10 w-10 text-[#ffd600] drop-shadow-[0_0_8px_rgba(255,214,0,0.5)]" />
            <div className="mb-2 text-[#ffd600] tracking-tight">{completedMatchesValue}</div>
            <div className="uppercase tracking-wide text-[#94a3b8]">{t('hero.completedMatches')}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
