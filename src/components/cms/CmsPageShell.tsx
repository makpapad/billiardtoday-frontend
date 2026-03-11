import Link from "next/link";
import type { ReactNode } from "react";
import type { CmsAppearance, CmsSection, CmsSiteSettings } from "@/lib/cms/types";
import { CmsSectionRenderer } from "@/components/cms/CmsSectionRenderer";
import { getCmsContainerStyle, getCmsPageWidth } from "@/lib/cms/layout";

type Props = {
  appearance: CmsAppearance;
  settings: CmsSiteSettings;
  children: ReactNode;
  showChrome?: boolean;
};

const getSocialLabel = (platform: string) => {
  const clean = platform.trim().toLowerCase();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "Social";
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readString = (value: unknown) => String(value || "").trim();

const readBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const resolvePixelValue = (value: unknown, fallback: number) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return `${fallback}px`;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return `${trimmed}px`;
  return trimmed;
};

const resolveGapValue = (value?: string) =>
  value === "tight" ? "0.5rem" : value === "relaxed" ? "1.25rem" : "0.75rem";

const resolveTextSizeValue = (value?: string) =>
  value === "sm" ? "0.875rem" : value === "lg" ? "1.125rem" : "1rem";

const resolveShadowValue = (value?: string) =>
  value === "none"
    ? "none"
    : value === "medium"
      ? "0 20px 80px rgba(15,23,42,0.1)"
      : value === "strong"
        ? "0 28px 100px rgba(15,23,42,0.16)"
        : "0 16px 60px rgba(15,23,42,0.05)";

const resolveCellPaddingValue = (value?: string) =>
  value === "sm" ? "0.75rem" : value === "lg" ? "1.5rem" : "1rem";

const layoutPresetColumns: Record<string, string> = {
  single: "minmax(0,1fr)",
  halves: "repeat(2,minmax(0,1fr))",
  thirds: "repeat(3,minmax(0,1fr))",
  "sidebar-left": "minmax(220px,30%) minmax(0,1fr)",
  "sidebar-right": "minmax(0,1fr) minmax(220px,30%)",
  "20-60-20": "20% 60% 20%",
  "25-50-25": "25% 50% 25%",
};

const layoutPresetCellCount: Record<string, number> = {
  single: 1,
  halves: 2,
  thirds: 3,
  "sidebar-left": 2,
  "sidebar-right": 2,
  "20-60-20": 3,
  "25-50-25": 3,
};

export function CmsLayoutRenderer({
  nodes,
  settings,
  appearance,
  region,
  embedded = false,
}: {
  nodes: CmsSiteSettings["headerLayout"];
  settings: CmsSiteSettings;
  appearance: CmsAppearance;
  region: "header" | "footer" | "page";
  embedded?: boolean;
}) {
  const { tokens } = appearance;
  const headerMenu =
    settings.menus.find((menu) => menu.key === settings.activeHeaderMenuKey) || null;
  const footerMenu =
    settings.menus.find((menu) => menu.key === settings.activeFooterMenuKey) || null;

  const renderMenuItems = (menuKey?: string | null) => {
    const resolved =
      settings.menus.find((menu) => menu.key === menuKey) ||
      (region === "footer" ? footerMenu : headerMenu);
    return resolved?.items || [];
  };

  const mapNodeToSection = (
    node: CmsSiteSettings["headerLayout"][number],
  ): CmsSection | null => {
    const props = asRecord(node.props);

    if (
      [
        "cms.hero-section",
        "cms.card-section",
        "cms.layout-grid-canvas-section",
        "cms.layout-flex-canvas-section",
        "cms.spacer-section",
        "cms.image-section",
        "cms.gallery-section",
        "cms.video-embed-section",
        "cms.image-text-split-section",
        "cms.rich-text-section",
        "cms.feature-grid-section",
        "cms.tournament-list-section",
        "cms.cta-banner",
        "cms.faq-section",
      ].includes(node.type)
    ) {
      return {
        __component: node.type,
        ...props,
      } as CmsSection;
    }

    return null;
  };

  const renderNode = (node: CmsSiteSettings["headerLayout"][number], key: string): ReactNode => {
    const props = asRecord(node.props);
    const mappedSection = mapNodeToSection(node);

    if (mappedSection) {
      return (
        <CmsSectionRenderer
          key={key}
          section={mappedSection}
          appearance={appearance}
          index={Number(key.split("-").pop() || 0)}
          embedded={embedded}
        />
      );
    }

    if (node.type === "cms.logo-block") {
      const customLogo = asRecord(props.image);
      const customLogoUrl = readString(customLogo.url);
      const customLogoAlt = readString(customLogo.alternativeText) || settings.siteName;
      const showWordmark = readBoolean(props.showWordmark, true);
      const showTagline = readBoolean(props.showTagline, false);
      const align = readString(props.align) || "left";
      const size = readString(props.size) || "md";
      const customWidth = readString(props.customWidth);
      const titleSize = size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-2xl";
      const badgeSize = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-24 w-24" : "h-16 w-16";
      const logoImageStyle =
        size === "sm"
          ? { width: resolvePixelValue(customWidth, 96), maxHeight: "32px" }
          : size === "lg"
            ? { width: resolvePixelValue(customWidth, 240), maxHeight: "96px" }
            : { width: resolvePixelValue(customWidth, 160), maxHeight: "64px" };
      const alignClass =
        align === "center" ? "items-center text-center" : align === "right" ? "items-end text-right" : "items-start text-left";

      return (
        <div key={key} className={`flex flex-col gap-2 ${alignClass}`}>
          <Link href="/" className="flex items-center gap-3">
            {customLogoUrl ? (
              <img src={customLogoUrl} alt={customLogoAlt} className="shrink-0 object-contain" style={logoImageStyle} />
            ) : settings.logo?.url ? (
              <img src={settings.logo.url} alt={settings.logo.alternativeText || settings.siteName} className="shrink-0 object-contain" style={logoImageStyle} />
            ) : (
              <div className={`flex ${badgeSize} shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white`} style={{ background: tokens.primary }}>
                BT
              </div>
            )}
            {showWordmark ? (
              <div>
                <div className={`${titleSize} font-semibold tracking-tight`} style={{ fontFamily: tokens.headingFont }}>
                  {settings.siteName}
                </div>
                {showTagline && settings.siteTagline ? (
                  <div className="text-xs opacity-70">{settings.siteTagline}</div>
                ) : null}
              </div>
            ) : null}
          </Link>
        </div>
      );
    }

    if (node.type === "cms.menu-block") {
      const menuItems = renderMenuItems(readString(props.menuKey) || null);
      const orientation = readString(props.orientation) === "vertical" ? "vertical" : "horizontal";
      const style = readString(props.style) || (region === "header" ? settings.headerAppearance.navStyle : "pills");
      const align = readString(props.align) || "left";
      const wrapperBackgroundColor = readString(props.wrapperBackgroundColor);
      const itemBackgroundColor = readString(props.itemBackgroundColor);
      const itemBorderColor = readString(props.itemBorderColor);
      const textColor = readString(props.textColor);
      const gap = readString(props.gap) || "normal";
      const itemRadius = readString(props.itemRadius);
      const textSize = readString(props.textSize) || "md";
      const wrapperClass =
        orientation === "vertical"
          ? "flex flex-col gap-2 rounded-2xl p-2"
          : `flex flex-wrap gap-3 rounded-2xl p-2 ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"}`;
      const linkClass =
        style === "text"
          ? "text-sm font-medium"
          : style === "underline"
            ? "border-b-2 border-transparent pb-1 text-sm font-medium hover:border-current"
            : region === "footer"
              ? "rounded-full border border-white/10 px-4 py-2 text-sm transition hover:border-white/30"
              : "rounded-full border border-black/10 px-4 py-2 text-sm font-medium";

      return (
        <nav key={key} className={wrapperClass} style={{ background: wrapperBackgroundColor || undefined, gap: resolveGapValue(gap) }}>
          {menuItems.map((item) => (
            <Link
              key={`${item.label}-${item.url}`}
              href={item.url || "#"}
              target={item.openInNewTab ? "_blank" : undefined}
              rel={item.openInNewTab ? "noreferrer" : undefined}
              className={linkClass}
              style={{
                color: textColor || undefined,
                background: style === "pills" ? itemBackgroundColor || undefined : undefined,
                borderColor: itemBorderColor || undefined,
                borderRadius: style === "pills" ? resolvePixelValue(itemRadius, 999) : undefined,
                fontSize: resolveTextSizeValue(textSize),
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      );
    }

    if (node.type === "cms.button-group-block") {
      const orientation = readString(props.orientation) === "vertical" ? "vertical" : "horizontal";
      const align = readString(props.align) || "left";
      const items = Array.isArray(props.items)
        ? props.items.map((item) => asRecord(item))
        : [];
      const wrapperClass =
        orientation === "vertical"
          ? "flex flex-col items-start gap-3"
          : `flex flex-wrap gap-3 ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"}`;

      return (
        <div key={key} className={wrapperClass}>
          {items.map((item, index) => {
            const label = readString(item.label) || `Button ${index + 1}`;
            const url = readString(item.url) || "#";
            const variant = readString(item.variant) === "secondary" ? "secondary" : "primary";
            const className =
              variant === "secondary"
                ? "inline-flex rounded-full border border-black/10 px-5 py-2.5 text-sm font-semibold transition hover:bg-slate-50"
                : "inline-flex rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90";

            return (
              <Link
                key={`${label}-${url}-${index}`}
                href={url}
                className={className}
                style={
                  variant === "secondary"
                    ? { color: tokens.text }
                    : { background: tokens.primary }
                }
              >
                {label}
              </Link>
            );
          })}
        </div>
      );
    }

    if (node.type === "cms.button-block") {
      const label = readString(props.label) || "Button";
      const url = readString(props.url) || "#";
      const variant = readString(props.variant) === "secondary" ? "secondary" : "primary";
      const align = readString(props.align) || "left";
      const size = readString(props.size) || "md";
      const backgroundColor = readString(props.backgroundColor);
      const textColor = readString(props.textColor);
      const borderColor = readString(props.borderColor);
      const radius = readString(props.radius);
      const widthMode = readString(props.widthMode) || "auto";
      const wrapperClass =
        `${align === "center" ? "flex justify-center" : align === "right" ? "flex justify-end" : "flex justify-start"} ${widthMode === "full" ? "w-full" : ""}`;
      const sizeClass =
        size === "sm"
          ? "px-4 py-2 text-sm"
          : size === "lg"
            ? "px-7 py-3.5 text-base"
            : "px-5 py-2.5 text-sm";
      const className =
        variant === "secondary"
          ? `inline-flex rounded-full border border-black/10 font-semibold transition hover:bg-slate-50 ${sizeClass}`
          : `inline-flex rounded-full font-semibold text-white transition hover:opacity-90 ${sizeClass}`;

      return (
        <div key={key} className={wrapperClass}>
          <Link
            href={url}
            className={className}
            style={{
              width: widthMode === "full" ? "100%" : undefined,
              justifyContent: widthMode === "full" ? "center" : undefined,
              background: backgroundColor || (variant === "secondary" ? "#ffffff" : tokens.primary),
              color: textColor || (variant === "secondary" ? tokens.text : "#ffffff"),
              border: `1px solid ${borderColor || (variant === "secondary" ? "rgba(15,23,42,0.12)" : "transparent")}`,
              borderRadius: resolvePixelValue(radius, 999),
            }}
          >
            {label}
          </Link>
        </div>
      );
    }

    if (node.type === "cms.social-links-block") {
      const orientation = readString(props.orientation) === "vertical" ? "vertical" : "horizontal";
      const showLabels = readBoolean(props.showLabels, true);
      const align = readString(props.align) || "left";
      const wrapperClass =
        orientation === "vertical"
          ? "flex flex-col gap-2"
          : `flex flex-wrap gap-3 ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"}`;

      return (
        <div key={key} className={wrapperClass}>
          {settings.socialLinks.map((item) => (
            <a key={`${item.platform}-${item.url}`} href={item.url} target="_blank" rel="noreferrer" className={region === "footer" ? "rounded-full border border-white/10 px-4 py-2 text-sm transition hover:border-white/30" : "rounded-full border border-black/10 px-4 py-2 text-sm"}>
              {showLabels ? item.label || getSocialLabel(item.platform) : getSocialLabel(item.platform).slice(0, 2)}
            </a>
          ))}
        </div>
      );
    }

    if (node.type === "cms.contact-info-block") {
      const label = readString(props.label) || "Contact";
      const showEmail = readBoolean(props.showEmail, true);
      const align = readString(props.align) || "left";
      const alignClass =
        align === "center" ? "items-center text-center" : align === "right" ? "items-end text-right" : "items-start text-left";

      return (
        <div key={key} className={`flex flex-col gap-2 ${alignClass}`}>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-60">{label}</div>
          {showEmail && settings.contactEmail ? (
            <a href={`mailto:${settings.contactEmail}`} className="text-sm">
              {settings.contactEmail}
            </a>
          ) : null}
        </div>
      );
    }

    if (node.type === "cms.layout-section") {
      const preset = readString(props.layoutPreset) || "thirds";
      const gridColumns = readString(props.gridColumns);
      const gap = readString(props.gap) === "wide" ? "1.5rem" : "1rem";
      const customTemplate = readString(props.customTemplate);
      const padding =
        readString(props.padding) === "none"
          ? "0"
          : readString(props.padding) === "sm"
            ? "0.75rem"
            : readString(props.padding) === "lg"
            ? "1.5rem"
            : "1rem";
      const backgroundColor = readString(props.backgroundColor);
      const textColor = readString(props.textColor);
      const borderColor = readString(props.borderColor);
      const borderRadius = Number(readString(props.borderRadius)) || 24;
      const cellBackgroundColor = readString(props.cellBackgroundColor);
      const cellBorderColor = readString(props.cellBorderColor);
      const cellRadius = readString(props.cellRadius);
      const cellPadding = readString(props.cellPadding) || "md";
      const shadow = readString(props.shadow) || "soft";
      const cellCount = Math.max(1, Math.min(4, Number(gridColumns) || layoutPresetCellCount[preset] || 3));
      const cells = [props.cell1, props.cell2, props.cell3, props.cell4].slice(0, cellCount);

      return (
        <div
          key={key}
          className="grid"
          style={{
            gridTemplateColumns: customTemplate || layoutPresetColumns[preset] || layoutPresetColumns.thirds,
            gap,
            padding,
            background: backgroundColor || undefined,
            color: textColor || undefined,
            border: `1px solid ${borderColor || "transparent"}`,
            borderRadius: `${borderRadius}px`,
            boxShadow: resolveShadowValue(shadow),
          }}
        >
          {cells.map((cell, index) => {
            const entries = Array.isArray(cell) ? (cell as CmsSiteSettings["headerLayout"]) : [];
            return (
              <div
                key={`${key}-cell-${index + 1}`}
                className="min-w-0"
                style={{
                  background: cellBackgroundColor || undefined,
                  border: `1px solid ${cellBorderColor || "transparent"}`,
                  borderRadius: resolvePixelValue(cellRadius, 20),
                  padding: resolveCellPaddingValue(cellPadding),
                }}
              >
                {entries.map((child, childIndex) => renderNode(child, `${key}-child-${index + 1}-${childIndex}`))}
              </div>
            );
          })}
        </div>
      );
    }

    return null;
  };

  return <>{nodes.map((node, index) => renderNode(node, `${region}-${index}`))}</>;
}

export function CmsPageShell({ appearance, settings, children, showChrome = true }: Props) {
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
    settings.headerAppearance.textColor || (settings.headerAppearance.variant === "solid" ? "text-white" : "text-slate-900");
  const headerMutedClass =
    settings.headerAppearance.mutedTextColor || (settings.headerAppearance.variant === "solid" ? "text-white/70" : "text-slate-500");
  const footerMutedClass =
    settings.footerAppearance.textColor || (settings.footerAppearance.variant === "dark" ? "text-slate-300" : "text-slate-600");
  const footerLabelClass =
    settings.footerAppearance.mutedTextColor || (settings.footerAppearance.variant === "dark" ? "text-slate-400" : "text-slate-500");
  const footerChipClass =
    settings.footerAppearance.variant === "dark"
      ? "rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-white/30 hover:text-white"
      : "rounded-full border border-black/10 px-4 py-2 text-sm text-slate-700 transition hover:border-black/20 hover:text-slate-950";
  const hasHeaderLayout = settings.headerLayout.length > 0;
  const hasFooterLayout = settings.footerLayout.length > 0;

  return (
    <div
      className="min-h-screen"
      style={
        {
          ["--bt-page-width" as string]: getCmsPageWidth(appearance),
          background: `radial-gradient(circle at top, ${tokens.accent}22, transparent 28%), linear-gradient(180deg, ${tokens.background}, #ffffff 80%)`,
          color: tokens.text,
          fontFamily: tokens.bodyFont,
        } as React.CSSProperties
      }
    >
      {showChrome ? (
      <header
        className={`${settings.stickyHeader ? "sticky top-0" : ""} ${headerClass} z-20`}
        style={{
          background: settings.headerAppearance.backgroundColor || undefined,
          color: settings.headerAppearance.textColor || undefined,
        }}
      >
        <div className="mx-auto px-4 py-4 sm:px-6" style={getCmsContainerStyle(appearance, "page")}>
          {hasHeaderLayout ? (
            <CmsLayoutRenderer
              nodes={settings.headerLayout}
              settings={settings}
              appearance={appearance}
              region="header"
            />
          ) : (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
          )}
        </div>
      </header>
      ) : null}

      <main>{children}</main>

      {showChrome ? (
      <footer
        className={footerClass}
        style={{
          background: settings.footerAppearance.backgroundColor || undefined,
          color: settings.footerAppearance.textColor || undefined,
        }}
      >
        <div className="mx-auto px-4 py-12 sm:px-6" style={getCmsContainerStyle(appearance, "page")}>
          {hasFooterLayout ? (
            <CmsLayoutRenderer
              nodes={settings.footerLayout}
              settings={settings}
              appearance={appearance}
              region="footer"
            />
          ) : (
            <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr]">
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
          )}
        </div>
      </footer>
      ) : null}
    </div>
  );
}
