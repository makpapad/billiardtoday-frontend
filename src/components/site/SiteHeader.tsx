import Link from "next/link";

export type SiteHeaderNavItem = {
  label: string;
  href: string;
  children?: SiteHeaderNavItem[];
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
  return (
    <header
      className={`${sticky ? "sticky top-0" : ""} z-30 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/logo-billiardtoday.png"
            alt={`${siteName} logo`}
            className="h-11 w-auto object-contain"
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
              >
                {item.label}
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
              className="inline-flex rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_12px_30px_rgba(34,211,238,0.28)] transition hover:bg-cyan-300"
            >
              {primaryCta.label}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
