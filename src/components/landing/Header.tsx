import type { LandingHeaderContent } from "@/components/landing/content";
import { SiteHeader } from "@/components/site/SiteHeader";

export function Header({ content }: { content: LandingHeaderContent }) {
  return (
    <SiteHeader
      siteName={content.siteName}
      navItems={content.nav}
      primaryCta={{ label: content.primaryCtaLabel, href: content.primaryCtaUrl }}
      secondaryCta={{ label: content.secondaryCtaLabel, href: content.secondaryCtaUrl }}
      sticky
    />
  );
}
