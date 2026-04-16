"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type SiteHeaderNavItem = {
  label: string;
  href: string;
  children?: SiteHeaderNavItem[];
  iconSrc?: string;
  iconAlt?: string;
  iconClassName?: string;
};

type SiteHeaderProps = {
  siteName: string;
  navItems: SiteHeaderNavItem[];
  primaryCta?: SiteHeaderNavItem | null;
  secondaryCta?: SiteHeaderNavItem | null;
  sticky?: boolean;
};

export function SiteHeader({
  siteName,
  navItems,
  primaryCta,
  secondaryCta,
  sticky = true,
}: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header
        className={`${sticky ? "sticky top-0" : ""} z-30 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
            <img
              src="/logo-billiardtoday.png"
              alt={`${siteName} logo`}
              className="h-14 w-auto object-contain sm:h-16"
            />
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              item.children && item.children.length > 0 ? (
                <div key={`${item.label}-${item.href}`} className="group relative">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition hover:text-white"
                  >
                    {item.label}
                    <span className="text-xs text-slate-500">+</span>
                  </button>
                  <div className="absolute left-0 top-full h-3 w-56" aria-hidden="true" />
                  <div className="pointer-events-none absolute left-0 top-full hidden min-w-56 pt-3 group-hover:block group-focus-within:block">
                    <div className="pointer-events-auto rounded-[24px] border border-white/10 bg-slate-900/95 p-2 shadow-[0_18px_60px_rgba(15,23,42,0.32)] backdrop-blur-xl">
                      {item.children.map((child) => (
                        <Link
                          key={`${child.label}-${child.href}`}
                          href={child.href}
                          className="block rounded-2xl px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  key={`${item.label}-${item.href}`}
                  href={item.href}
                  className="text-sm font-medium text-slate-300 transition hover:text-white"
                  aria-label={item.iconAlt || item.label}
                  title={item.label}
                >
                  {item.iconSrc ? (
                    <span className="inline-flex items-center">
                      <img
                        src={item.iconSrc}
                        alt={item.iconAlt || item.label}
                        className={item.iconClassName || "h-10 w-auto object-contain"}
                      />
                    </span>
                  ) : (
                    item.label
                  )}
                </Link>
              )
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {secondaryCta ? (
              <Link
                href={secondaryCta.href}
                className="hidden rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:text-white sm:inline-flex"
              >
                {secondaryCta.label}
              </Link>
            ) : null}
            {primaryCta ? (
              <Link
                href={primaryCta.href}
                className="hidden rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_12px_30px_rgba(34,211,238,0.28)] transition hover:bg-cyan-300 md:inline-flex"
              >
                {primaryCta.label}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/10 md:hidden"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              <span className="relative block h-4 w-5">
                <span
                  className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition ${mobileMenuOpen ? "translate-y-[7px] rotate-45" : ""}`}
                />
                <span
                  className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current transition ${mobileMenuOpen ? "opacity-0" : "opacity-100"}`}
                />
                <span
                  className={`absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-current transition ${mobileMenuOpen ? "-translate-y-[7px] -rotate-45" : ""}`}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/72 backdrop-blur-sm"
            aria-label="Close menu overlay"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute inset-x-3 top-20 rounded-[28px] border border-slate-200/80 bg-white/95 p-5 text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.22)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Navigation</div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600"
              >
                Close
              </button>
            </div>

            <nav className="max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                {navItems.map((item) => (
                  <div key={`mobile-${item.label}-${item.href}`} className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-2">
                    {item.children && item.children.length > 0 ? (
                      <>
                        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {item.label}
                        </div>
                        <div className="space-y-1">
                          {item.children.map((child) => (
                            <Link
                              key={`mobile-${child.label}-${child.href}`}
                              href={child.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className="block rounded-2xl px-3 py-3 text-sm font-medium text-slate-800 transition hover:bg-white hover:text-slate-950"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-800 transition hover:bg-white hover:text-slate-950"
                      >
                        {item.iconSrc ? (
                          <img
                            src={item.iconSrc}
                            alt={item.iconAlt || item.label}
                            className={item.iconClassName || "h-9 w-auto object-contain"}
                          />
                        ) : null}
                        <span>{item.label}</span>
                      </Link>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3">
                {secondaryCta ? (
                  <Link
                    href={secondaryCta.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-white"
                  >
                    {secondaryCta.label}
                  </Link>
                ) : null}
                {primaryCta ? (
                  <Link
                    href={primaryCta.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_12px_30px_rgba(34,211,238,0.28)] transition hover:bg-cyan-300"
                  >
                    {primaryCta.label}
                  </Link>
                ) : null}
              </div>
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
