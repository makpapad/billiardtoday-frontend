"use client";

import { PlusCircle, Play, TrendingUp } from "lucide-react";
import { useLandingT } from "./i18n";

export function HowItWorks() {
  const { t } = useLandingT();
  
  const steps = [
    {
      icon: PlusCircle,
      step: "01",
      title: t('howItWorks.step1.title'),
      description: t('howItWorks.step1.description'),
      color: "#00ff88",
    },
    {
      icon: Play,
      step: "02",
      title: t('howItWorks.step2.title'),
      description: t('howItWorks.step2.description'),
      color: "#00d9ff",
    },
    {
      icon: TrendingUp,
      step: "03",
      title: t('howItWorks.step3.title'),
      description: t('howItWorks.step3.description'),
      color: "#ffd600",
    },
  ];
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-gradient-to-b from-[#111827] to-[#0a0e1a] py-24 px-6">
      <div className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00ff88]/5 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <div className="mb-6 inline-block rounded-full border border-[#00d9ff]/30 bg-[#00d9ff]/10 px-4 py-1">
            <span className="uppercase tracking-wider text-[#00d9ff]">{t('howItWorks.badge')}</span>
          </div>

          <h2 className="mb-4 text-3xl font-extrabold leading-tight md:text-4xl">{t('howItWorks.title')}</h2>

          <p className="mx-auto max-w-2xl text-[#94a3b8]">
            {t('howItWorks.description')}
          </p>
        </div>

        <div className="relative grid gap-8 md:grid-cols-3">
          <div className="absolute left-0 right-0 top-20 hidden h-0.5 bg-gradient-to-r from-[#00ff88] via-[#00d9ff] to-[#ffd600] opacity-20 md:block" />

          {steps.map((step) => (
            <article key={step.step} className="relative">
              <div className="mb-6 flex items-center justify-center">
                <div
                  className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 bg-[#1a2235]"
                  style={{ borderColor: step.color }}
                >
                  <span className="tracking-wider" style={{ color: step.color }}>
                    {step.step}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-[#1e293b] bg-[#1a2235]/50 p-6 text-center backdrop-blur-sm">
                <div
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${step.color}20` }}
                >
                  <step.icon className="h-7 w-7" style={{ color: step.color }} />
                </div>

                <h3 className="mb-3 text-lg font-semibold">{step.title}</h3>

                <p className="text-[#94a3b8]">{step.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
