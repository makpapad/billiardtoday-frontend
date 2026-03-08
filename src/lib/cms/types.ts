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
};

export type CmsFooterAppearance = {
  variant: "dark" | "soft" | "minimal";
  showSiteTagline: boolean;
  showContactEmail: boolean;
  showSocialLinks: boolean;
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

export type CmsHeroSection = {
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

export type CmsCardSection = {
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

export type CmsLayoutGridCanvasSection = {
  __component: "cms.layout-grid-canvas-section";
  title?: string | null;
  columns?: "2" | "3" | "4" | null;
  gap?: "normal" | "wide" | null;
  cells: CmsSection[][];
};

export type CmsLayoutFlexCanvasSection = {
  __component: "cms.layout-flex-canvas-section";
  title?: string | null;
  direction?: "row" | "row-reverse" | "column" | null;
  justify?: "start" | "between" | "center" | null;
  align?: "start" | "center" | "stretch" | null;
  gap?: "normal" | "wide" | null;
  cells: CmsSection[][];
};

export type CmsSpacerSection = {
  __component: "cms.spacer-section";
  size?: "sm" | "md" | "lg" | "xl" | null;
};

export type CmsImageSection = {
  __component: "cms.image-section";
  image?: CmsMedia | null;
  alt?: string | null;
  caption?: string | null;
  layout?: "full" | "contained" | null;
};

export type CmsGalleryItem = {
  image?: CmsMedia | null;
  alt?: string | null;
  caption?: string | null;
};

export type CmsGallerySection = {
  __component: "cms.gallery-section";
  title?: string | null;
  subtitle?: string | null;
  layout?: "grid" | "mosaic" | null;
  items: CmsGalleryItem[];
};

export type CmsVideoEmbedSection = {
  __component: "cms.video-embed-section";
  title?: string | null;
  subtitle?: string | null;
  embedUrl: string;
  caption?: string | null;
  layout?: "contained" | "wide" | null;
};

export type CmsImageTextSplitSection = {
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

export type CmsRichTextSection = {
  __component: "cms.rich-text-section";
  title?: string | null;
  content: string;
};

export type CmsFeatureItem = {
  title: string;
  description?: string | null;
  iconName?: string | null;
};

export type CmsFeatureGridSection = {
  __component: "cms.feature-grid-section";
  title?: string | null;
  subtitle?: string | null;
  items: CmsFeatureItem[];
};

export type CmsCtaBannerSection = {
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

export type CmsFaqSection = {
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
  | CmsCtaBannerSection
  | CmsFaqSection;

export type CmsPage = {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  coverImage?: CmsMedia | null;
  pageType: "landing" | "standard" | "legal";
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
  tokens: {
    primary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    radius: string;
    headingFont: string;
    bodyFont: string;
  };
};
