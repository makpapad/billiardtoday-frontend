import type {
  CmsCtaBannerSection,
  CmsFeatureGridSection,
  CmsHeroSection,
  CmsLogoStripSection,
  CmsPage,
  CmsPostsListSection,
  CmsServiceCardsSection,
  CmsSocialLink,
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
  panelDetails: Array<{ label: string; value: string }>;
  panelNoteLabel: string;
  panelNote: string;
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
  socialLinks: CmsSocialLink[];
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
    eyebrow: "Digital scoreboards and tournament pages",
    title: "Live scoreboards, tournament control and public billiard pages in one platform.",
    subtitle:
      "Billiard Today helps clubs, academies and federations manage live screens, tournament operations, public pages and sponsor rotations from one workflow.",
    primaryCtaLabel: "Contact us",
    primaryCtaUrl: "#cta",
    secondaryCtaLabel: "View live pages",
    secondaryCtaUrl: "/live",
    showcaseLabel: "Live control",
    showcaseTitle: "Scoreboards, tournament pages and venue displays",
    showcaseStatus: "Live",
    liveScoreLabel: "Table 03",
    liveScoreValue: "14 - 12",
    liveScoreStatus: "In progress",
    playerALabel: "Player A",
    playerAName: "Player A",
    playerBLabel: "Player B",
    playerBName: "Player B",
    adTitle: "Sponsor rotation",
    adDescription: "Schedule branded messages between matches, breaks and event updates.",
    adMetric: "Ad-ready screen slots",
    panelDetails: [
      { label: "Stage", value: "Quarter final" },
      { label: "Format", value: "Race to 40" },
      { label: "Overlay", value: "Ready" },
    ],
    panelNoteLabel: "Screen behavior",
    panelNote:
      "This public layout stays readable from distance and updates automatically as live match data changes.",
    stats: [
      { value: "Live", label: "Scoreboard screens" },
      { value: "1 hub", label: "Tournament control" },
      { value: "Ads", label: "Sponsor slots" },
    ],
    highlights: [
      {
        title: "Large-screen scoreboards",
        description: "Show scores, tables, rounds and venue branding on public-facing screens.",
      },
      {
        title: "Tournament operations",
        description: "Manage players, draws, rounds, standings and results from one workflow.",
      },
      {
        title: "Remote control",
        description: "Update connected screens and overlays without moving from table to table.",
      },
    ],
  },
  trustedClubs: {
    eyebrow: "Built for clubs, academies and federations",
    description:
      "From venue scoreboards to federation event pages, the platform is designed for public visibility and practical day-to-day control.",
    clubs: [
      "Club live scoreboards",
      "Academy practice rooms",
      "Federation event pages",
      "Public ranking pages",
      "Venue screen networks",
      "Sponsor-ready displays",
    ],
  },
  features: {
    eyebrow: "Platform",
    title: "One platform for venue screens, tournament staff and public billiard visibility.",
    subtitle:
      "The product combines operational control with a clear viewing experience, so venues can run events and present them professionally at the same time.",
    items: [
      {
        title: "Live scoreboard screens",
        description:
          "Show score, table status, players and match progress in a format made for venue screens.",
        iconName: "monitor",
      },
      {
        title: "Tournament and player management",
        description:
          "Organize registrations, draws, rounds and standings without relying on disconnected tools.",
        iconName: "users",
      },
      {
        title: "Remote screen control",
        description:
          "Push updates to connected scoreboards and public displays from the admin panel in real time.",
        iconName: "radio",
      },
      {
        title: "Sponsor and partner rotations",
        description:
          "Use breaks, idle moments and transitions to display sponsor messages and branded promotions.",
        iconName: "chart",
      },
    ],
  },
  howItWorks: {
    eyebrow: "How it works",
    title: "Designed for simple event operations, not dashboard clutter.",
    subtitle:
      "Clubs and federations can start with screens and grow into full event coordination without changing the front-end experience.",
    steps: [
      {
        step: "01",
        title: "Connect venue screens",
        description:
          "Register screens or scoreboard devices and assign them to tables, halls or event spaces.",
      },
      {
        step: "02",
        title: "Run the event",
        description:
          "Create events, manage players, update matches and control what appears on every live display.",
      },
      {
        step: "03",
        title: "Publish scores and sponsor content",
        description:
          "Keep spectators informed while rotating sponsor messages and event content during the live flow.",
      },
    ],
  },
  screenshots: {
    eyebrow: "Live screens",
    title: "Example layouts for public scoreboards, event control and sponsor-ready displays.",
    items: [
      {
        title: "Live scoreboard layout",
        description: "A scoreboard-first screen for venue monitors, TV panels and in-room displays.",
        tag: "Match view",
      },
      {
        title: "Tournament control view",
        description: "A compact command view for tables, players, rounds and event progress.",
        tag: "Event view",
      },
      {
        title: "Sponsor rotation layout",
        description: "A branded screen mode that keeps sponsor content visible without breaking the match flow.",
        tag: "Sponsor view",
      },
    ],
  },
  benefits: {
    eyebrow: "For clubs",
    title: "Practical value for operators, players and event partners.",
    items: [
      {
        value: "Less manual coordination",
        label: "Operations",
        description: "Staff update match progress once and the venue screens reflect it immediately.",
      },
      {
        value: "Clearer public visibility",
        label: "Audience",
        description:
          "Players and spectators can follow scores, rounds and announcements without confusion.",
      },
      {
        value: "More useful sponsor inventory",
        label: "Commercial",
        description:
          "Digital displays become usable sponsor surfaces for clubs, events and federation partners.",
      },
    ],
  },
  cta: {
    eyebrow: "Get started",
    title: "Use one workflow for live scoreboards, tournament control and sponsor-ready screens.",
    description:
      "Billiard Today is built for billiard venues that want cleaner operations, clearer public presentation and better use of every screen.",
    primaryCtaLabel: "Contact us",
    primaryCtaUrl: "mailto:hello@billiardtoday.com?subject=BilliardToday%20Demo",
    secondaryCtaLabel: "View live pages",
    secondaryCtaUrl: "/tournaments/live",
  },
  footer: {
    siteName: settings.siteName || "BilliardToday",
    description:
      "Live scoreboards, tournament pages and sponsor-ready display workflows for clubs, academies and federations.",
    links: settings.footerLinks.length
      ? settings.footerLinks.map((link) => ({ label: link.label, href: link.url || "#" }))
      : [
          { label: "Tournaments", href: "/tournaments" },
          { label: "Players", href: "/players" },
          { label: "Rankings", href: "/rankings" },
          { label: "Clubs", href: "/clubs" },
        ],
    socialLinks: settings.socialLinks,
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
      showcaseLabel: asText(hero?.showcaseLabel, defaults.hero.showcaseLabel),
      showcaseTitle: asText(hero?.showcaseTitle, defaults.hero.showcaseTitle),
      showcaseStatus: asText(hero?.showcaseStatus, defaults.hero.showcaseStatus),
      liveScoreLabel: asText(hero?.liveScoreLabel, defaults.hero.liveScoreLabel),
      liveScoreValue: asText(hero?.liveScoreValue, defaults.hero.liveScoreValue),
      liveScoreStatus: asText(hero?.liveScoreStatus, defaults.hero.liveScoreStatus),
      playerALabel: asText(hero?.playerALabel, defaults.hero.playerALabel),
      playerAName: asText(hero?.playerAName, defaults.hero.playerAName),
      playerBLabel: asText(hero?.playerBLabel, defaults.hero.playerBLabel),
      playerBName: asText(hero?.playerBName, defaults.hero.playerBName),
      adTitle: asText(hero?.adTitle, defaults.hero.adTitle),
      adDescription: asText(hero?.adDescription, defaults.hero.adDescription),
      adMetric: asText(hero?.adMetric, defaults.hero.adMetric),
      panelDetails: defaults.hero.panelDetails,
      panelNoteLabel: defaults.hero.panelNoteLabel,
      panelNote: defaults.hero.panelNote,
      primaryCtaLabel: asText(hero?.primaryCtaLabel, defaults.hero.primaryCtaLabel),
      primaryCtaUrl: asText(hero?.primaryCtaUrl, defaults.hero.primaryCtaUrl),
      secondaryCtaLabel: asText(hero?.secondaryCtaLabel, defaults.hero.secondaryCtaLabel),
      secondaryCtaUrl: asText(hero?.secondaryCtaUrl, defaults.hero.secondaryCtaUrl),
      stats:
        hero?.stats?.map((item) => ({
          value: asText(item.value, ""),
          label: asText(item.label, ""),
        })).filter((item) => item.value || item.label) || defaults.hero.stats,
      highlights:
        hero?.highlights?.map((item) => ({
          title: asText(item.title, ""),
          description: asText(item.description, ""),
        })).filter((item) => item.title || item.description) || defaults.hero.highlights,
    },
    trustedClubs: {
      eyebrow: asText(clubs?.eyebrow || clubs?.title, defaults.trustedClubs.eyebrow),
      description: asText(clubs?.subtitle, defaults.trustedClubs.description),
      clubs:
        clubs?.items?.map((item) => asText(item.name, "")).filter(Boolean) ||
        defaults.trustedClubs.clubs,
    },
    features: {
      eyebrow: asText(features?.eyebrow, defaults.features.eyebrow),
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
      eyebrow: asText(howItWorks?.eyebrow, defaults.howItWorks.eyebrow),
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
      eyebrow: asText(screenshots?.eyebrow, defaults.screenshots.eyebrow),
      title: asText(screenshots?.title, defaults.screenshots.title),
      items:
        screenshots?.items?.map((item) => ({
          title: asText(item.title, ""),
          description: asText(item.excerpt, ""),
          tag: item.tag,
        })) || defaults.screenshots.items,
    },
    benefits: {
      eyebrow: asText(benefits?.eyebrow, defaults.benefits.eyebrow),
      title: asText(benefits?.title, defaults.benefits.title),
      items:
        benefits?.items?.map((item) => ({
          value: asText(item.value, ""),
          label: asText(item.label, ""),
          description: asText(item.description, ""),
        })) || defaults.benefits.items,
    },
    cta: {
      eyebrow: asText(cta?.eyebrow, defaults.cta.eyebrow),
      title: asText(cta?.title, defaults.cta.title),
      description: asText(cta?.description, defaults.cta.description),
      primaryCtaLabel: asText(cta?.buttonLabel, defaults.cta.primaryCtaLabel),
      primaryCtaUrl: asText(cta?.buttonUrl, defaults.cta.primaryCtaUrl),
      secondaryCtaLabel: asText(cta?.secondaryButtonLabel, defaults.cta.secondaryCtaLabel),
      secondaryCtaUrl: asText(cta?.secondaryButtonUrl, defaults.cta.secondaryCtaUrl),
    },
    footer: {
      siteName: settings.siteName || defaults.footer.siteName,
      description: asText(settings.siteTagline, defaults.footer.description),
      links:
        settings.footerLinks.length > 0
          ? settings.footerLinks.map((link) => ({ label: link.label, href: link.url || "#" }))
          : defaults.footer.links,
      socialLinks:
        settings.socialLinks.length > 0
          ? settings.socialLinks
          : defaults.footer.socialLinks,
    },
  };
};
