import Link from "next/link";
import type { ReactNode } from "react";
import type { CmsAppearance, CmsSiteSettings } from "@/lib/cms/types";

type Props = {
  appearance: CmsAppearance;
  settings: CmsSiteSettings;
  children: ReactNode;
};

const getSocialLabel = (platform: string) => {
  const clean = platform.trim().toLowerCase();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "Social";
};

export function CmsPageShell({ appearance, settings, children }: Props) {
  const { tokens } = appearance;
  const headerMenu =
    settings.menus.find((menu) => menu.key === settings.activeHeaderMenuKey) || null;
  const footerMenu =
    settings.menus.find((menu) => menu.key === settings.activeFooterMenuKey) || null;
  const headerClass =
    settings.headerAppearance.variant === "solid"
      ? "border-b border-black/10 bg-slate-950 text-white"
      : settings.headerAppearance.variant === "minimal"
        ? "border-b border-transparent bg-transparent"
        : "border-b border-black/5 bg-white/75 backdrop-blur-xl";
  const footerClass =
    settings.footerAppearance.variant === "soft"
      ? "border-t border-black/5 bg-[#f5efe6] text-slate-800"
      : settings.footerAppearance.variant === "minimal"
        ? "border-t border-black/5 bg-transparent text-slate-700"
        : "border-t border-black/5 bg-slate-950 text-slate-100";
  const headerLinkClass =
    settings.headerAppearance.navStyle === "text"
      ? "text-sm font-medium"
      : settings.headerAppearance.navStyle === "underline"
        ? "border-b-2 border-transparent pb-1 text-sm font-medium hover:border-current"
        : "rounded-full border border-black/10 px-4 py-2 text-sm font-medium";
  const headerTextClass =
    settings.headerAppearance.variant === "solid" ? "text-white" : "text-slate-900";
  const headerMutedClass =
    settings.headerAppearance.variant === "solid" ? "text-white/70" : "text-slate-500";
  const footerMutedClass =
    settings.footerAppearance.variant === "dark" ? "text-slate-300" : "text-slate-600";
  const footerLabelClass =
    settings.footerAppearance.variant === "dark" ? "text-slate-400" : "text-slate-500";
  const footerChipClass =
    settings.footerAppearance.variant === "dark"
      ? "rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-white/30 hover:text-white"
      : "rounded-full border border-black/10 px-4 py-2 text-sm text-slate-700 transition hover:border-black/20 hover:text-slate-950";

  return (
    <div
      className="min-h-screen"
      style={
        {
          background: `radial-gradient(circle at top, ${tokens.accent}22, transparent 28%), linear-gradient(180deg, ${tokens.background}, #ffffff 80%)`,
          color: tokens.text,
          fontFamily: tokens.bodyFont,
        } as React.CSSProperties
      }
    >
      <header
        className={`${settings.stickyHeader ? "sticky top-0" : ""} ${headerClass} z-20`}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold"
              style={{ background: tokens.primary, color: "#ffffff" }}
            >
              BT
            </div>
            <div>
              <div
                className={`text-lg font-semibold tracking-tight ${headerTextClass}`}
                style={{ fontFamily: tokens.headingFont }}
              >
                {settings.siteName}
              </div>
              {settings.headerAppearance.showSiteTagline && settings.siteTagline ? (
                <div className={`text-xs ${headerMutedClass}`}>{settings.siteTagline}</div>
              ) : null}
            </div>
          </Link>

          <nav
            className={`flex ${
              headerMenu?.orientation === "vertical"
                ? "flex-col items-end gap-2"
                : "flex-wrap items-center gap-3 sm:gap-5"
            }`}
          >
            {settings.headerLinks.map((link) => (
              <div key={`${link.label}-${link.url}`} className="group relative">
                <Link
                  href={link.url || "#"}
                  target={link.openInNewTab ? "_blank" : undefined}
                  rel={link.openInNewTab ? "noreferrer" : undefined}
                  className={`${headerLinkClass} ${settings.headerAppearance.variant === "solid" ? "text-white hover:text-white/85" : "text-slate-700 hover:text-slate-950"} transition ${settings.headerAppearance.navStyle === "pills" ? "hover:border-black/20" : ""}`}
                >
                  {link.label}
                </Link>
                {link.children.length > 0 ? (
                  <div className="pointer-events-none absolute left-0 top-full hidden min-w-56 pt-3 group-hover:block">
                    <div
                      className="pointer-events-auto rounded-3xl border border-black/5 bg-white p-3 shadow-[0_18px_60px_rgba(15,23,42,0.12)]"
                      style={{ borderRadius: tokens.radius }}
                    >
                      {link.children.map((child) => (
                        <Link
                          key={`${child.label}-${child.url}`}
                          href={child.url || "#"}
                          target={child.openInNewTab ? "_blank" : undefined}
                          rel={child.openInNewTab ? "noreferrer" : undefined}
                          className="block rounded-2xl px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className={footerClass}>
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-4">
            <div
              className="text-2xl font-semibold tracking-tight"
              style={{ fontFamily: tokens.headingFont }}
            >
              {settings.siteName}
            </div>
            {settings.footerAppearance.showSiteTagline && settings.siteTagline ? (
              <p className={`max-w-xl text-sm ${footerMutedClass}`}>{settings.siteTagline}</p>
            ) : null}
            {settings.footerAppearance.showContactEmail && settings.contactEmail ? (
              <a
                href={`mailto:${settings.contactEmail}`}
                className={footerChipClass}
              >
                {settings.contactEmail}
              </a>
            ) : null}
          </div>

          <div>
            <div className={`mb-4 text-xs font-semibold uppercase tracking-[0.2em] ${footerLabelClass}`}>
              Explore
            </div>
            <div
              className={`${
                footerMenu?.orientation === "vertical"
                  ? "space-y-3"
                  : "flex flex-wrap gap-3"
              }`}
            >
              {settings.footerLinks.map((link) => (
                <Link
                  key={`${link.label}-${link.url}`}
                  href={link.url || "#"}
                  target={link.openInNewTab ? "_blank" : undefined}
                  rel={link.openInNewTab ? "noreferrer" : undefined}
                  className={`text-sm transition ${
                    footerMenu?.orientation === "vertical"
                      ? `${footerMutedClass} block`
                      : footerChipClass
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className={`mb-4 text-xs font-semibold uppercase tracking-[0.2em] ${footerLabelClass}`}>
              Social
            </div>
            {settings.footerAppearance.showSocialLinks ? (
              <div className="flex flex-wrap gap-3">
                {settings.socialLinks.map((link) => (
                  <a
                    key={`${link.platform}-${link.url}`}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className={footerChipClass}
                  >
                    {link.label || getSocialLabel(link.platform)}
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-sm opacity-70">Hidden</div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
