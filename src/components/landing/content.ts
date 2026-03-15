import type {
  CmsCtaBannerSection,
  CmsFeatureGridSection,
  CmsHeroSection,
  CmsLogoStripSection,
  CmsPage,
  CmsPostsListSection,
  CmsServiceCardsSection,
  CmsSiteSettings,
  CmsStatsSection,
} from "@/lib/cms/types";
import {
  SITE_HEADER_NAV_ITEMS,
  SITE_HEADER_PRIMARY_CTA,
  SITE_HEADER_SECONDARY_CTA,
} from "@/components/site/siteHeaderConfig";

export type LandingNavItem = {
  label: string;
  href: string;
};

export type LandingHeaderContent = {
  siteName: string;
  siteTagline: string;
  nav: LandingNavItem[];
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
};

export type LandingHeroHighlight = {
  title: string;
  description: string;
};

export type LandingHeroContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
  showcaseLabel: string;
  showcaseTitle: string;
  showcaseStatus: string;
  liveScoreLabel: string;
  liveScoreValue: string;
  liveScoreStatus: string;
  playerALabel: string;
  playerAName: string;
  playerBLabel: string;
  playerBName: string;
  adTitle: string;
  adDescription: string;
  adMetric: string;
  stats: Array<{ value: string; label: string }>;
  highlights: LandingHeroHighlight[];
};

export type LandingTrustedClubsContent = {
  eyebrow: string;
  description: string;
  clubs: string[];
};

export type LandingFeaturesContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
  items: Array<{ title: string; description: string; iconName?: string | null }>;
};

export type LandingHowItWorksContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
  steps: Array<{ step: string; title: string; description: string }>;
};

export type LandingScreenshotsContent = {
  eyebrow: string;
  title: string;
  items: Array<{ title: string; description: string; tag?: string | null }>;
};

export type LandingBenefitsContent = {
  eyebrow: string;
  title: string;
  items: Array<{ value: string; label: string; description: string }>;
};

export type LandingCtaContent = {
  eyebrow: string;
  title: string;
  description: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
};

export type LandingFooterContent = {
  siteName: string;
  description: string;
  links: LandingNavItem[];
};

export type LandingPageContent = {
  header: LandingHeaderContent;
  hero: LandingHeroContent;
  trustedClubs: LandingTrustedClubsContent;
  features: LandingFeaturesContent;
  howItWorks: LandingHowItWorksContent;
  screenshots: LandingScreenshotsContent;
  benefits: LandingBenefitsContent;
  cta: LandingCtaContent;
  footer: LandingFooterContent;
};

const asText = (value: string | null | undefined, fallback: string) => {
  const clean = String(value || "").trim();
  return clean || fallback;
};

const getSection = <TSection extends { __component: string }>(
  page: CmsPage | null,
  component: TSection["__component"],
): TSection | null =>
  (page?.sections.find((section) => section.__component === component) as TSection | undefined) || null;

const buildDefaultContent = (settings: CmsSiteSettings): LandingPageContent => ({
  header: {
    siteName: settings.siteName || "BilliardToday",
    siteTagline: settings.siteTagline || "Digital scoreboards and tournaments",
    nav: SITE_HEADER_NAV_ITEMS,
    primaryCtaLabel: SITE_HEADER_PRIMARY_CTA.label,
    primaryCtaUrl: SITE_HEADER_PRIMARY_CTA.href,
    secondaryCtaLabel: SITE_HEADER_SECONDARY_CTA.label,
    secondaryCtaUrl: SITE_HEADER_SECONDARY_CTA.href,
  },
  hero: {
    eyebrow: "SaaS for billiard venues",
    title: "Turn every billiard screen into a live match and tournament control point.",
    subtitle:
      "BilliardToday helps clubs, academies and federations run digital scoreboards, manage tournaments, control devices remotely and schedule advertising from one platform.",
    primaryCtaLabel: "Request a demo",
    primaryCtaUrl: "#cta",
    secondaryCtaLabel: "Explore features",
    secondaryCtaUrl: "#features",
    showcaseLabel: "Control Center",
    showcaseTitle: "Live tables, matches and displays",
    showcaseStatus: "Connected",
    liveScoreLabel: "Table 03",
    liveScoreValue: "14 - 12",
    liveScoreStatus: "Live score",
    playerALabel: "Player A",
    playerAName: "Nikolaos P.",
    playerBLabel: "Player B",
    playerBName: "Giannis K.",
    adTitle: "Advertising playlist",
    adDescription: "Rotate sponsor content between live matches and tournament breaks.",
    adMetric: "Screen occupancy 92%",
    stats: [
      { value: "24/7", label: "Live scoreboard visibility" },
      { value: "1 hub", label: "Tournament and device control" },
      { value: "+Ads", label: "Monetize every screen" },
    ],
    highlights: [
      {
        title: "Large-screen scoreboards",
        description: "Display match score, table status and branding in real time.",
      },
      {
        title: "Tournament operations",
        description: "Manage players, draws, rounds and results from one admin flow.",
      },
      {
        title: "Remote control",
        description: "Update scoreboard devices without walking across the venue.",
      },
    ],
  },
  trustedClubs: {
    eyebrow: "Trusted by clubs, academies and federations",
    description:
      "Built for billiard operations that need a clean public display layer and a practical admin workflow behind it.",
    clubs: [
      "Athens Billiard Club",
      "Blue Cue Academy",
      "Hellenic Snooker League",
      "Piraeus Pool Center",
      "North Side Cue Hall",
      "Federation Events Hub",
    ],
  },
  features: {
    eyebrow: "Features",
    title: "One platform for venue displays, tournament staff and public match visibility.",
    subtitle:
      "The product combines operational control with a polished viewing experience, so venues can run matches and present them professionally at the same time.",
    items: [
      {
        title: "Live score on big screens",
        description:
          "Show match score, timers, tables and player names in a format optimized for venue displays.",
        iconName: "monitor",
      },
      {
        title: "Player and tournament management",
        description:
          "Organize registrations, brackets, rounds and standings without relying on disconnected tools.",
        iconName: "users",
      },
      {
        title: "Remote scoreboard control",
        description:
          "Push updates to connected scoreboard devices from the admin panel in real time.",
        iconName: "radio",
      },
      {
        title: "Advertising-ready screens",
        description:
          "Use idle moments, breaks and transitions to display sponsor messages and digital promotions.",
        iconName: "chart",
      },
    ],
  },
  howItWorks: {
    eyebrow: "How it works",
    title: "Designed for operational clarity, not dashboard clutter.",
    subtitle:
      "Clubs and federations can deploy the platform progressively, starting from displays and moving into full tournament coordination.",
    steps: [
      {
        step: "01",
        title: "Configure venue screens",
        description:
          "Register screens or scoreboard devices and assign them to tables, halls or event spaces.",
      },
      {
        step: "02",
        title: "Run tournaments from admin",
        description:
          "Create events, manage players, update matches and control what appears on each live display.",
      },
      {
        step: "03",
        title: "Broadcast scores and sponsor messages",
        description:
          "Keep spectators informed while rotating ads and branded content during the event flow.",
      },
    ],
  },
  screenshots: {
    eyebrow: "Screenshots",
    title: "Interfaces built for public screens and back-office control.",
    items: [
      {
        title: "Live venue display",
        description: "A scoreboard-first screen for TV panels and in-room displays.",
        tag: "Quarter Final",
      },
      {
        title: "Tournament command panel",
        description: "Control tables, matches and progress from a clean admin workspace.",
        tag: "Active event",
      },
      {
        title: "Sponsor rotation view",
        description: "Blend ads and match information without breaking the viewing flow.",
        tag: "Sponsor slot",
      },
    ],
  },
  benefits: {
    eyebrow: "Benefits",
    title: "Practical value for operators, players and commercial partners.",
    items: [
      {
        value: "Fewer manual updates",
        label: "Operations",
        description: "Staff can update match progress once and reflect it on venue screens instantly.",
      },
      {
        value: "Better spectator experience",
        label: "Audience",
        description:
          "Players and audiences can follow scores, rounds and announcements without confusion.",
      },
      {
        value: "New sponsor inventory",
        label: "Commercial",
        description:
          "Digital displays become monetizable surfaces for clubs, events and federation partners.",
      },
    ],
  },
  cta: {
    eyebrow: "Call to action",
    title: "Bring live scoreboards and tournament control into one production-ready workflow.",
    description:
      "BilliardToday is built for billiard rooms that want cleaner operations, better screen usage and a more professional event presentation.",
    primaryCtaLabel: "Contact sales",
    primaryCtaUrl: "mailto:hello@billiardtoday.com?subject=BilliardToday%20Demo",
    secondaryCtaLabel: "View live pages",
    secondaryCtaUrl: "/tournaments/live",
  },
  footer: {
    siteName: settings.siteName || "BilliardToday",
    description:
      "Digital scoreboard and tournament management platform for billiard clubs, academies and federations.",
    links: settings.footerLinks.length
      ? settings.footerLinks.map((link) => ({ label: link.label, href: link.url || "#" }))
      : [
          { label: "Tournaments", href: "/tournaments" },
          { label: "Players", href: "/players" },
          { label: "Rankings", href: "/rankings" },
          { label: "Clubs", href: "/clubs" },
        ],
  },
});

export const buildLandingPageContent = (
  settings: CmsSiteSettings,
  page: CmsPage | null,
): LandingPageContent => {
  const defaults = buildDefaultContent(settings);
  const hero = getSection<CmsHeroSection>(page, "cms.hero-section");
  const clubs = getSection<CmsLogoStripSection>(page, "cms.logo-strip-section");
  const features = getSection<CmsFeatureGridSection>(page, "cms.feature-grid-section");
  const howItWorks = getSection<CmsServiceCardsSection>(page, "cms.service-cards-section");
  const screenshots = getSection<CmsPostsListSection>(page, "cms.posts-list-section");
  const benefits = getSection<CmsStatsSection>(page, "cms.stats-section");
  const cta = getSection<CmsCtaBannerSection>(page, "cms.cta-banner");

  return {
    header: {
      siteName: settings.siteName || defaults.header.siteName,
      siteTagline: settings.siteTagline || defaults.header.siteTagline,
      nav: defaults.header.nav,
      primaryCtaLabel: asText(cta?.buttonLabel, defaults.header.primaryCtaLabel),
      primaryCtaUrl: asText(cta?.buttonUrl, defaults.header.primaryCtaUrl),
      secondaryCtaLabel: defaults.header.secondaryCtaLabel,
      secondaryCtaUrl: defaults.header.secondaryCtaUrl,
    },
    hero: {
      ...defaults.hero,
      eyebrow: asText(hero?.eyebrow, defaults.hero.eyebrow),
      title: asText(hero?.title, defaults.hero.title),
      subtitle: asText(hero?.subtitle, defaults.hero.subtitle),
      primaryCtaLabel: asText(hero?.primaryCtaLabel, defaults.hero.primaryCtaLabel),
      primaryCtaUrl: asText(hero?.primaryCtaUrl, defaults.hero.primaryCtaUrl),
      secondaryCtaLabel: asText(hero?.secondaryCtaLabel, defaults.hero.secondaryCtaLabel),
      secondaryCtaUrl: asText(hero?.secondaryCtaUrl, defaults.hero.secondaryCtaUrl),
    },
    trustedClubs: {
      eyebrow: asText(clubs?.title, defaults.trustedClubs.eyebrow),
      description: asText(clubs?.subtitle, defaults.trustedClubs.description),
      clubs:
        clubs?.items?.map((item) => asText(item.name, "")).filter(Boolean) ||
        defaults.trustedClubs.clubs,
    },
    features: {
      eyebrow: defaults.features.eyebrow,
      title: asText(features?.title, defaults.features.title),
      subtitle: asText(features?.subtitle, defaults.features.subtitle),
      items:
        features?.items?.map((item) => ({
          title: asText(item.title, ""),
          description: asText(item.description, ""),
          iconName: item.iconName,
        })) || defaults.features.items,
    },
    howItWorks: {
      eyebrow: defaults.howItWorks.eyebrow,
      title: asText(howItWorks?.title, defaults.howItWorks.title),
      subtitle: asText(howItWorks?.subtitle, defaults.howItWorks.subtitle),
      steps:
        howItWorks?.items?.map((item, index) => ({
          step: String(index + 1).padStart(2, "0"),
          title: asText(item.title, ""),
          description: asText(item.description, ""),
        })) || defaults.howItWorks.steps,
    },
    screenshots: {
      eyebrow: defaults.screenshots.eyebrow,
      title: asText(screenshots?.title, defaults.screenshots.title),
      items:
        screenshots?.items?.map((item) => ({
          title: asText(item.title, ""),
          description: asText(item.excerpt, ""),
          tag: item.tag,
        })) || defaults.screenshots.items,
    },
    benefits: {
      eyebrow: defaults.benefits.eyebrow,
      title: asText(benefits?.title, defaults.benefits.title),
      items:
        benefits?.items?.map((item) => ({
          value: asText(item.value, ""),
          label: asText(item.label, ""),
          description: asText(item.description, ""),
        })) || defaults.benefits.items,
    },
    cta: {
      eyebrow: defaults.cta.eyebrow,
      title: asText(cta?.title, defaults.cta.title),
      description: asText(cta?.description, defaults.cta.description),
      primaryCtaLabel: asText(cta?.buttonLabel, defaults.cta.primaryCtaLabel),
      primaryCtaUrl: asText(cta?.buttonUrl, defaults.cta.primaryCtaUrl),
      secondaryCtaLabel: defaults.cta.secondaryCtaLabel,
      secondaryCtaUrl: defaults.cta.secondaryCtaUrl,
    },
    footer: {
      siteName: settings.siteName || defaults.footer.siteName,
      description: asText(page?.summary, defaults.footer.description),
      links:
        settings.footerLinks.length > 0
          ? settings.footerLinks.map((link) => ({ label: link.label, href: link.url || "#" }))
          : defaults.footer.links,
    },
  };
};
