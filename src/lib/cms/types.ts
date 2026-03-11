export type CmsMedia = {
  id?: number | string;
  documentId?: string | null;
  url: string;
  alternativeText?: string | null;
  width?: number | null;
  height?: number | null;
};

export type CmsNavChildLink = {
  label: string;
  url: string;
  openInNewTab: boolean;
};

export type CmsNavLink = {
  label: string;
  url: string;
  openInNewTab: boolean;
  children: CmsNavChildLink[];
};

export type CmsMenuOrientation = "horizontal" | "vertical";

export type CmsMenuDefinition = {
  key: string;
  name: string;
  orientation: CmsMenuOrientation;
  items: CmsNavLink[];
};

export type CmsHeaderAppearance = {
  variant: "glass" | "solid" | "minimal";
  navStyle: "pills" | "text" | "underline";
  showSiteTagline: boolean;
  backgroundColor?: string | null;
  textColor?: string | null;
  mutedTextColor?: string | null;
};

export type CmsFooterAppearance = {
  variant: "dark" | "soft" | "minimal";
  showSiteTagline: boolean;
  showContactEmail: boolean;
  showSocialLinks: boolean;
  backgroundColor?: string | null;
  textColor?: string | null;
  mutedTextColor?: string | null;
};

export type CmsLayoutNode = {
  type: string;
  props: Record<string, unknown>;
  children: CmsLayoutNode[];
};

export type CmsSocialLink = {
  platform: string;
  label?: string | null;
  url: string;
};

export type CmsSeo = {
  metaTitle: string;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  noIndex?: boolean;
  ogImage?: CmsMedia | null;
};

export type CmsSectionVisibility = "all" | "page-only" | "embed-only";

type CmsSectionVisibilityField = {
  visibility?: CmsSectionVisibility | null;
};

export type CmsSectionBackgroundStyle =
  | "transparent"
  | "surface"
  | "primary"
  | "accent"
  | "image"
  | "custom";

type CmsSectionAppearanceField = {
  backgroundStyle?: CmsSectionBackgroundStyle | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  backgroundImage?: CmsMedia | null;
  paddingY?: "sm" | "md" | "lg" | "xl" | null;
  marginTop?: "none" | "sm" | "md" | "lg" | "xl" | null;
  marginBottom?: "none" | "sm" | "md" | "lg" | "xl" | null;
  borderColor?: string | null;
  radius?: string | null;
  shadow?: "none" | "soft" | "medium" | "strong" | null;
  overlayStrength?: "none" | "light" | "medium" | "strong" | null;
};

type CmsMarketingLayoutField = {
  contentAlign?: "left" | "center" | null;
  contentWidth?: "narrow" | "standard" | "wide" | null;
  titleSize?: "md" | "lg" | "xl" | null;
  bodySize?: "sm" | "md" | "lg" | null;
  mobileContentAlign?: "left" | "center" | null;
  mobileContentWidth?: "narrow" | "standard" | "wide" | null;
  mobileTitleSize?: "md" | "lg" | "xl" | null;
  mobileBodySize?: "sm" | "md" | "lg" | null;
};

export type CmsHeroSection = CmsSectionVisibilityField & CmsSectionAppearanceField & CmsMarketingLayoutField & {
  __component: "cms.hero-section";
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  primaryCtaLabel?: string | null;
  primaryCtaUrl?: string | null;
  secondaryCtaLabel?: string | null;
  secondaryCtaUrl?: string | null;
  backgroundImage?: CmsMedia | null;
};

export type CmsCardSection = CmsSectionVisibilityField & CmsSectionAppearanceField & {
  __component: "cms.card-section";
  image?: CmsMedia | null;
  alt?: string | null;
  eyebrow?: string | null;
  title: string;
  content?: string | null;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
  theme?: "default" | "highlight" | null;
};

export type CmsLayoutGridCanvasSection = CmsSectionVisibilityField & CmsSectionAppearanceField & {
  __component: "cms.layout-grid-canvas-section";
  title?: string | null;
  columns?: "2" | "3" | "4" | null;
  gap?: "normal" | "wide" | null;
  cells: CmsSection[][];
};

export type CmsLayoutFlexCanvasSection = CmsSectionVisibilityField & CmsSectionAppearanceField & {
  __component: "cms.layout-flex-canvas-section";
  title?: string | null;
  direction?: "row" | "row-reverse" | "column" | null;
  justify?: "start" | "between" | "center" | null;
  align?: "start" | "center" | "stretch" | null;
  gap?: "normal" | "wide" | null;
  cells: CmsSection[][];
};

export type CmsSpacerSection = CmsSectionVisibilityField & CmsSectionAppearanceField & {
  __component: "cms.spacer-section";
  size?: "sm" | "md" | "lg" | "xl" | null;
};

export type CmsImageSection = CmsSectionVisibilityField & CmsSectionAppearanceField & {
  __component: "cms.image-section";
  image?: CmsMedia | null;
  alt?: string | null;
  caption?: string | null;
  layout?: "full" | "contained" | "full-bleed" | null;
};

export type CmsGalleryItem = {
  image?: CmsMedia | null;
  alt?: string | null;
  caption?: string | null;
};

export type CmsGallerySection = CmsSectionVisibilityField & CmsSectionAppearanceField & {
  __component: "cms.gallery-section";
  title?: string | null;
  subtitle?: string | null;
  layout?: "grid" | "mosaic" | null;
  items: CmsGalleryItem[];
};

export type CmsVideoEmbedSection = CmsSectionVisibilityField & CmsSectionAppearanceField & {
  __component: "cms.video-embed-section";
  title?: string | null;
  subtitle?: string | null;
  embedUrl: string;
  caption?: string | null;
  layout?: "contained" | "wide" | null;
};

export type CmsImageTextSplitSection = CmsSectionVisibilityField & CmsSectionAppearanceField & CmsMarketingLayoutField & {
  __component: "cms.image-text-split-section";
  eyebrow?: string | null;
  title: string;
  content: string;
  image?: CmsMedia | null;
  alt?: string | null;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
  imagePosition?: "left" | "right" | null;
};

export type CmsRichTextSection = CmsSectionVisibilityField & CmsSectionAppearanceField & CmsMarketingLayoutField & {
  __component: "cms.rich-text-section";
  title?: string | null;
  content: string;
};

export type CmsFeatureItem = {
  title: string;
  description?: string | null;
  iconName?: string | null;
};

export type CmsFeatureGridSection = CmsSectionVisibilityField & CmsSectionAppearanceField & CmsMarketingLayoutField & {
  __component: "cms.feature-grid-section";
  title?: string | null;
  subtitle?: string | null;
  items: CmsFeatureItem[];
};

export type CmsStatsItem = {
  value: string;
  label?: string | null;
  description?: string | null;
};

export type CmsStatsSection = CmsSectionVisibilityField & CmsSectionAppearanceField & {
  __component: "cms.stats-section";
  title?: string | null;
  subtitle?: string | null;
  layout?: "grid" | "band" | null;
  items: CmsStatsItem[];
};

export type CmsServiceCardItem = {
  title: string;
  description?: string | null;
  iconName?: string | null;
  linkLabel?: string | null;
  linkUrl?: string | null;
};

export type CmsServiceCardsSection = CmsSectionVisibilityField & CmsSectionAppearanceField & {
  __component: "cms.service-cards-section";
  title?: string | null;
  subtitle?: string | null;
  items: CmsServiceCardItem[];
};

export type CmsLogoStripItem = {
  image?: CmsMedia | null;
  name?: string | null;
  url?: string | null;
};

export type CmsLogoStripSection = CmsSectionVisibilityField & CmsSectionAppearanceField & {
  __component: "cms.logo-strip-section";
  title?: string | null;
  subtitle?: string | null;
  style?: "grid" | "pills" | null;
  items: CmsLogoStripItem[];
};

export type CmsTestimonialItem = {
  quote: string;
  name?: string | null;
  role?: string | null;
  company?: string | null;
};

export type CmsTestimonialsSection = CmsSectionVisibilityField & CmsSectionAppearanceField & {
  __component: "cms.testimonials-section";
  title?: string | null;
  subtitle?: string | null;
  layout?: "cards" | "featured" | null;
  items: CmsTestimonialItem[];
};

export type CmsPostListItem = {
  image?: CmsMedia | null;
  tag?: string | null;
  title: string;
  excerpt?: string | null;
  url?: string | null;
};

export type CmsPostsListSection = CmsSectionVisibilityField & CmsSectionAppearanceField & {
  __component: "cms.posts-list-section";
  title?: string | null;
  subtitle?: string | null;
  columns?: "2" | "3" | null;
  items: CmsPostListItem[];
};

export type CmsTournamentListSection = CmsSectionVisibilityField & CmsSectionAppearanceField & {
  __component: "cms.tournament-list-section";
  title?: string | null;
  subtitle?: string | null;
  layout?: "table" | "cards" | null;
  itemsPerPage?: number | null;
  showSeasonFilter?: boolean | null;
  showDate?: boolean | null;
  showStatus?: boolean | null;
  showResultsLink?: boolean | null;
  emptyStateText?: string | null;
};

export type CmsCtaBannerSection = CmsSectionVisibilityField & CmsSectionAppearanceField & CmsMarketingLayoutField & {
  __component: "cms.cta-banner";
  title: string;
  description?: string | null;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
  theme?: "primary" | "secondary" | null;
};

export type CmsFaqItem = {
  question: string;
  answer: string;
};

export type CmsFaqSection = CmsSectionVisibilityField & CmsSectionAppearanceField & {
  __component: "cms.faq-section";
  title?: string | null;
  items: CmsFaqItem[];
};

export type CmsSection =
  | CmsHeroSection
  | CmsCardSection
  | CmsLayoutGridCanvasSection
  | CmsLayoutFlexCanvasSection
  | CmsSpacerSection
  | CmsImageSection
  | CmsGallerySection
  | CmsVideoEmbedSection
  | CmsImageTextSplitSection
  | CmsRichTextSection
  | CmsFeatureGridSection
  | CmsStatsSection
  | CmsServiceCardsSection
  | CmsLogoStripSection
  | CmsTestimonialsSection
  | CmsPostsListSection
  | CmsTournamentListSection
  | CmsCtaBannerSection
  | CmsFaqSection;

export type CmsPage = {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  coverImage?: CmsMedia | null;
  pageType: "landing" | "standard" | "legal";
  layoutTree: CmsLayoutNode[];
  sections: CmsSection[];
  seo?: CmsSeo | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
};

export type CmsSiteSettings = {
  siteName: string;
  siteTagline?: string | null;
  logo?: CmsMedia | null;
  contactEmail?: string | null;
  menus: CmsMenuDefinition[];
  activeHeaderMenuKey?: string | null;
  activeFooterMenuKey?: string | null;
  stickyHeader: boolean;
  headerAppearance: CmsHeaderAppearance;
  footerAppearance: CmsFooterAppearance;
  headerLayout: CmsLayoutNode[];
  footerLayout: CmsLayoutNode[];
  headerLinks: CmsNavLink[];
  footerLinks: CmsNavLink[];
  socialLinks: CmsSocialLink[];
  defaultSeo?: CmsSeo | null;
};

export type CmsAppearance = {
  id: string;
  name: string;
  colorMode: "light" | "dark" | "system";
  tokens: {
    primary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    radius: string;
    headingFont: string;
    bodyFont: string;
    pageWidth: string;
  };
};
