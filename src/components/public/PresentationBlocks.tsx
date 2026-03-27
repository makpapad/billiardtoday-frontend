import Link from "next/link";
import type { ReactNode } from "react";
import { getCountryFlagPath } from "@/lib/countryFlags";

type HeroProps = {
  eyebrow?: string | null;
  title: string;
  description?: string | null;
  actions?: Array<{ label: string; href: string; variant?: "primary" | "secondary" }>;
  meta?: string[];
  aside?: ReactNode;
};

type SectionProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
};

export function PresentationHero({ eyebrow, title, description, actions = [], meta = [], aside }: HeroProps) {
  return (
    <section className="overflow-hidden rounded-[36px] border border-black/5 bg-[linear-gradient(135deg,#081528_0%,#0f2f52_50%,#1d4ed8_100%)] text-white shadow-[0_28px_90px_rgba(15,23,42,0.16)]">
      <div className="grid gap-10 px-6 py-10 lg:grid-cols-[1.4fr_0.8fr] lg:px-10 lg:py-12">
        <div className="space-y-5">
          {eyebrow ? (
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">{eyebrow}</div>
          ) : null}
          <div className="space-y-4">
            <h1 className="max-w-5xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">{title}</h1>
            {description ? (
              <p className="max-w-3xl text-sm leading-7 text-white/78 sm:text-base">{description}</p>
            ) : null}
          </div>
          {actions.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {actions.map((action) => (
                <Link
                  key={`${action.label}-${action.href}`}
                  href={action.href}
                  className={
                    action.variant === "secondary"
                      ? "inline-flex rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                      : "inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                  }
                >
                  {action.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        {aside ? (
          <div>{aside}</div>
        ) : (
          <div className="grid gap-3 rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            {meta.map((item, index) => (
              <div key={`${item}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/25 p-4 text-sm text-white/85">
                {item}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, description, action }: SectionProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        {eyebrow ? <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">{eyebrow}</div> : null}
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h2>
        {description ? <p className="max-w-2xl text-sm leading-7 text-slate-600">{description}</p> : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function CountryFlag({ country, className = "h-4 w-6 rounded-sm object-cover" }: { country: string | null; className?: string }) {
  const path = getCountryFlagPath(country);
  if (!path) return null;
  return <img src={path} alt={country || ""} className={className} />;
}
