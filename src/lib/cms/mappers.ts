import type {
  CmsAppearance,
  CmsCardSection,
  CmsCtaBannerSection,
  CmsFooterAppearance,
  CmsFaqItem,
  CmsFaqSection,
  CmsFeatureGridSection,
  CmsFeatureItem,
  CmsTournamentListSection,
  CmsGallerySection,
  CmsHeaderAppearance,
  CmsHeroSection,
  CmsImageSection,
  CmsImageTextSplitSection,
  CmsLayoutFlexCanvasSection,
  CmsLayoutGridCanvasSection,
  CmsLayoutNode,
  CmsMedia,
  CmsMenuDefinition,
  CmsNavChildLink,
  CmsNavLink,
  CmsPage,
  CmsRichTextSection,
  CmsSeo,
  CmsSpacerSection,
  CmsVideoEmbedSection,
  CmsSiteSettings,
  CmsSocialLink,
  CmsSection,
} from "@/lib/cms/types";
import { sanitizeCmsHtml } from "@/lib/cms/sanitize";

const DEFAULT_APPEARANCE: CmsAppearance = {
  id: "strapi-default",
  name: "BilliardToday Default",
  colorMode: "light",
  tokens: {
    primary: "#0f766e",
    accent: "#f59e0b",
    background: "#f4efe6",
    surface: "#fffaf2",
    text: "#1f2937",
    radius: "24px",
    headingFont: '"Space Grotesk", sans-serif',
    bodyFont: '"Manrope", sans-serif',
    pageWidth: "1280px",
  },
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const readString = (value: unknown) => String(value || "").trim();

const readNullableString = (value: unknown) => readString(value) || null;

const readBoolean = (value: unknown) => Boolean(value);
const readSectionVisibility = (value: unknown) =>
  readString(value) === "page-only"
    ? "page-only"
    : readString(value) === "embed-only"
      ? "embed-only"
      : "all";

const toAbsoluteUrl = (value: string | null, strapiBaseUrl: string) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${strapiBaseUrl}${value.startsWith("/") ? value : `/${value}`}`;
};

const unwrapEntity = (value: unknown): Record<string, unknown> => {
  const root = asRecord(value);
  const data = asRecord(root.data);
  const attrs = asRecord(data.attributes);
  if (Object.keys(attrs).length > 0) {
    return {
      ...data,
      ...attrs,
    };
  }
  return root.data && typeof root.data === "object" ? data : root;
};

const mapMedia = (value: unknown, strapiBaseUrl: string): CmsMedia | null => {
  const source = unwrapEntity(value);
  const url = toAbsoluteUrl(readNullableString(source.url), strapiBaseUrl);
  if (!url) return null;

  return {
    id:
      typeof source.id === "number" || typeof source.id === "string"
        ? (source.id as number | string)
        : undefined,
    documentId: readNullableString(source.documentId),
    url,
    alternativeText: readNullableString(source.alternativeText),
    width:
      typeof source.width === "number" && Number.isFinite(source.width)
        ? source.width
        : null,
    height:
      typeof source.height === "number" && Number.isFinite(source.height)
        ? source.height
        : null,
  };
};

const mapSeo = (value: unknown, strapiBaseUrl: string): CmsSeo | null => {
  const seo = asRecord(value);
  const metaTitle = readString(seo.metaTitle);
  if (!metaTitle) return null;

  return {
    metaTitle,
    metaDescription: readNullableString(seo.metaDescription),
    canonicalUrl: readNullableString(seo.canonicalUrl),
    noIndex: readBoolean(seo.noIndex),
    ogImage: mapMedia(seo.ogImage, strapiBaseUrl),
  };
};

const mapNavChildLinks = (value: unknown): CmsNavChildLink[] =>
  Array.isArray(value)
    ? value
        .map((item) => {
          const source = asRecord(item);
          return {
            label: readString(source.label),
            url: readString(source.url),
            openInNewTab: readBoolean(source.openInNewTab),
          };
        })
        .filter((item) => item.label || item.url)
    : [];

const mapNavLinks = (value: unknown): CmsNavLink[] =>
  Array.isArray(value)
    ? value
        .map((item) => {
          const source = asRecord(item);
          return {
            label: readString(source.label),
            url: readString(source.url),
            openInNewTab: readBoolean(source.openInNewTab),
            children: mapNavChildLinks(source.children),
          };
        })
        .filter((item) => item.label || item.url || item.children.length > 0)
    : [];

const mapMenus = (value: unknown): CmsMenuDefinition[] =>
  Array.isArray(value)
    ? value
        .map((item, index) => {
          const source = asRecord(item);
          return {
            key: readString(source.key) || `menu-${index + 1}`,
            name: readString(source.name) || `Menu ${index + 1}`,
            orientation:
              readString(source.orientation) === "vertical"
                ? ("vertical" as const)
                : ("horizontal" as const),
            items: mapNavLinks(source.items),
          };
        })
        .filter((item) => item.key)
    : [];

const decodeLayoutStorageValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(decodeLayoutStorageValue);
  const source = asRecord(value);
  if (!Object.keys(source).length) return value;

  return Object.fromEntries(
    Object.entries(source).map(([key, entry]) => {
      if (key === "media") return ["image", decodeLayoutStorageValue(entry)];
      if (key === "backgroundMedia") return ["backgroundImage", decodeLayoutStorageValue(entry)];
      return [key, decodeLayoutStorageValue(entry)];
    }),
  );
};

const mapLayoutNodes = (value: unknown): CmsLayoutNode[] =>
  Array.isArray(value)
    ? value
        .map((entry) => {
          const item = asRecord(entry);
          const type = readString(item.type);
          if (!type) return null;
          return {
            type,
            props: asRecord(decodeLayoutStorageValue(item.props)),
            children: mapLayoutNodes(item.children),
          };
        })
        .filter((item): item is CmsLayoutNode => Boolean(item))
    : [];

const mapHeaderAppearance = (value: unknown): CmsHeaderAppearance => {
  const source = asRecord(value);
  return {
    variant:
      readString(source.variant) === "solid"
        ? "solid"
        : readString(source.variant) === "minimal"
          ? "minimal"
          : "glass",
    navStyle:
      readString(source.navStyle) === "text"
        ? "text"
        : readString(source.navStyle) === "underline"
          ? "underline"
          : "pills",
    showSiteTagline: source.showSiteTagline !== false,
  };
};

const mapFooterAppearance = (value: unknown): CmsFooterAppearance => {
  const source = asRecord(value);
  return {
    variant:
      readString(source.variant) === "soft"
        ? "soft"
        : readString(source.variant) === "minimal"
          ? "minimal"
          : "dark",
    showSiteTagline: source.showSiteTagline !== false,
    showContactEmail: source.showContactEmail !== false,
    showSocialLinks: source.showSocialLinks !== false,
  };
};

const mapSocialLinks = (value: unknown): CmsSocialLink[] =>
  Array.isArray(value)
    ? value
        .map((item) => {
          const source = asRecord(item);
          return {
            platform: readString(source.platform) || "other",
            label: readNullableString(source.label),
            url: readString(source.url),
          };
        })
        .filter((item) => item.label || item.url)
    : [];

const mapFeatureItems = (value: unknown): CmsFeatureItem[] =>
  Array.isArray(value)
    ? value
        .map((item) => {
          const source = asRecord(item);
          return {
            title: readString(source.title),
            description: readNullableString(source.description),
            iconName: readNullableString(source.iconName),
          };
        })
        .filter((item) => item.title)
    : [];

const mapFaqItems = (value: unknown): CmsFaqItem[] =>
  Array.isArray(value)
    ? value
        .map((item) => {
          const source = asRecord(item);
          return {
            question: readString(source.question),
            answer: sanitizeCmsHtml(readString(source.answer)),
          };
        })
        .filter((item) => item.question && item.answer)
    : [];

const mapNestedSections = (value: unknown, strapiBaseUrl: string): CmsSection[] =>
  Array.isArray(value)
    ? value
        .map((item) => mapSection(item, strapiBaseUrl))
        .filter((item): item is CmsSection => Boolean(item))
    : [];

const decodeCanvasStorageValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(decodeCanvasStorageValue);
  const source = asRecord(value);
  if (!Object.keys(source).length) return value;

  return Object.fromEntries(
    Object.entries(source).map(([key, entry]) => {
      if (key === "media") return ["image", decodeCanvasStorageValue(entry)];
      if (key === "backgroundMedia") return ["backgroundImage", decodeCanvasStorageValue(entry)];
      return [key, decodeCanvasStorageValue(entry)];
    }),
  );
};

const mapCanvasStoredNodes = (value: unknown, strapiBaseUrl: string): CmsSection[] =>
  Array.isArray(value)
    ? value
        .map((item) => {
          const source = asRecord(item);
          const type = readString(source.type);
          const props = asRecord(decodeCanvasStorageValue(source.props));
          if (!type) return null;
          return mapSection({ __component: type, ...props }, strapiBaseUrl);
        })
        .filter((item): item is CmsSection => Boolean(item))
    : [];

const mapGridCells = (value: unknown, strapiBaseUrl: string): CmsSection[][] =>
  Array.isArray(value)
    ? value.map((cell) => {
        const rows = Array.isArray(cell) ? cell : [];
        const hasStoredNodes = rows.some((entry) => readString(asRecord(entry).type));
        return hasStoredNodes
          ? mapCanvasStoredNodes(rows, strapiBaseUrl)
          : mapNestedSections(rows, strapiBaseUrl);
      })
    : [[], [], [], []];

const mapFlexCells = (value: unknown, strapiBaseUrl: string): CmsSection[][] =>
  Array.isArray(value)
    ? value.map((cell) => {
        const rows = Array.isArray(cell) ? cell : [];
        const hasStoredNodes = rows.some((entry) => readString(asRecord(entry).type));
        return hasStoredNodes
          ? mapCanvasStoredNodes(rows, strapiBaseUrl)
          : mapNestedSections(rows, strapiBaseUrl);
      })
    : [[], [], [], []];

const mapSection = (value: unknown, strapiBaseUrl: string): CmsSection | null => {
  const source = asRecord(value);
  const component = readString(source.__component);

  if (component === "cms.hero-section") {
    const section: CmsHeroSection = {
      __component: "cms.hero-section",
      eyebrow: readNullableString(source.eyebrow),
      title: readString(source.title),
      subtitle: readNullableString(source.subtitle),
      primaryCtaLabel: readNullableString(source.primaryCtaLabel),
      primaryCtaUrl: readNullableString(source.primaryCtaUrl),
      secondaryCtaLabel: readNullableString(source.secondaryCtaLabel),
      secondaryCtaUrl: readNullableString(source.secondaryCtaUrl),
      backgroundImage: mapMedia(source.backgroundImage, strapiBaseUrl),
      visibility: readSectionVisibility(source.visibility),
    };
    return section.title ? section : null;
  }

  if (component === "cms.card-section") {
    const section: CmsCardSection = {
      __component: "cms.card-section",
      image: mapMedia(source.image, strapiBaseUrl),
      alt: readNullableString(source.alt),
      eyebrow: readNullableString(source.eyebrow),
      title: readString(source.title),
      content: readNullableString(source.content),
      buttonLabel: readNullableString(source.buttonLabel),
      buttonUrl: readNullableString(source.buttonUrl),
      theme: readString(source.theme) === "highlight" ? "highlight" : "default",
      visibility: readSectionVisibility(source.visibility),
    };
    return section.title ? section : null;
  }

  if (component === "cms.layout-grid-canvas-section") {
    const section: CmsLayoutGridCanvasSection = {
      __component: "cms.layout-grid-canvas-section",
      title: readNullableString(source.title),
      columns: ["2", "3", "4"].includes(readString(source.columns))
        ? (readString(source.columns) as "2" | "3" | "4")
        : "3",
      gap: readString(source.gap) === "wide" ? "wide" : "normal",
      visibility: readSectionVisibility(source.visibility),
      cells: mapGridCells(source.cells, strapiBaseUrl),
    };
    return section;
  }

  if (component === "cms.layout-flex-canvas-section") {
    const section: CmsLayoutFlexCanvasSection = {
      __component: "cms.layout-flex-canvas-section",
      title: readNullableString(source.title),
      direction:
        readString(source.direction) === "row-reverse"
          ? "row-reverse"
          : readString(source.direction) === "column"
            ? "column"
            : "row",
      justify:
        readString(source.justify) === "center"
          ? "center"
          : readString(source.justify) === "start"
            ? "start"
            : "between",
      align:
        readString(source.align) === "start"
          ? "start"
          : readString(source.align) === "center"
            ? "center"
            : "stretch",
      gap: readString(source.gap) === "wide" ? "wide" : "normal",
      visibility: readSectionVisibility(source.visibility),
      cells: mapFlexCells(source.cells, strapiBaseUrl),
    };
    return section;
  }

  if (component === "cms.spacer-section") {
    const section: CmsSpacerSection = {
      __component: "cms.spacer-section",
      size: ["sm", "md", "lg", "xl"].includes(readString(source.size)) ? (readString(source.size) as "sm" | "md" | "lg" | "xl") : "md",
      visibility: readSectionVisibility(source.visibility),
    };
    return section;
  }

  if (component === "cms.rich-text-section") {
    const section: CmsRichTextSection = {
      __component: "cms.rich-text-section",
      title: readNullableString(source.title),
      content: sanitizeCmsHtml(readString(source.content)),
      visibility: readSectionVisibility(source.visibility),
    };
    return section.content ? section : null;
  }

  if (component === "cms.image-section") {
    const section: CmsImageSection = {
      __component: "cms.image-section",
      image: mapMedia(source.image, strapiBaseUrl),
      alt: readNullableString(source.alt),
      caption: readNullableString(source.caption),
      layout: readString(source.layout) === "full" ? "full" : "contained",
      visibility: readSectionVisibility(source.visibility),
    };
    return section.image ? section : null;
  }

  if (component === "cms.gallery-section") {
    const items = Array.isArray(source.items) ? source.items : [];
    const section: CmsGallerySection = {
      __component: "cms.gallery-section",
      title: readNullableString(source.title),
      subtitle: readNullableString(source.subtitle),
      layout: readString(source.layout) === "mosaic" ? "mosaic" : "grid",
      visibility: readSectionVisibility(source.visibility),
      items: items
        .map((item) => {
          const row = asRecord(item);
          return {
            image: mapMedia(row.image, strapiBaseUrl),
            alt: readNullableString(row.alt),
            caption: readNullableString(row.caption),
          };
        })
        .filter((item) => item.image),
    };
    return section.items.length > 0 || section.title ? section : null;
  }

  if (component === "cms.video-embed-section") {
    const section: CmsVideoEmbedSection = {
      __component: "cms.video-embed-section",
      title: readNullableString(source.title),
      subtitle: readNullableString(source.subtitle),
      embedUrl: readString(source.embedUrl),
      caption: readNullableString(source.caption),
      layout: readString(source.layout) === "wide" ? "wide" : "contained",
      visibility: readSectionVisibility(source.visibility),
    };
    return section.embedUrl ? section : null;
  }

  if (component === "cms.image-text-split-section") {
    const section: CmsImageTextSplitSection = {
      __component: "cms.image-text-split-section",
      eyebrow: readNullableString(source.eyebrow),
      title: readString(source.title),
      content: sanitizeCmsHtml(readString(source.content)),
      image: mapMedia(source.image, strapiBaseUrl),
      alt: readNullableString(source.alt),
      buttonLabel: readNullableString(source.buttonLabel),
      buttonUrl: readNullableString(source.buttonUrl),
      imagePosition: readString(source.imagePosition) === "left" ? "left" : "right",
      visibility: readSectionVisibility(source.visibility),
    };
    return section.title && section.content ? section : null;
  }

  if (component === "cms.feature-grid-section") {
    const section: CmsFeatureGridSection = {
      __component: "cms.feature-grid-section",
      title: readNullableString(source.title),
      subtitle: readNullableString(source.subtitle),
      visibility: readSectionVisibility(source.visibility),
      items: mapFeatureItems(source.items),
    };
    return section.items.length > 0 || section.title ? section : null;
  }

  if (component === "cms.tournament-list-section") {
    const rawItemsPerPage = Number(source.itemsPerPage);
    const section: CmsTournamentListSection = {
      __component: "cms.tournament-list-section",
      title: readNullableString(source.title),
      subtitle: readNullableString(source.subtitle),
      layout: readString(source.layout) === "cards" ? "cards" : "table",
      visibility: readSectionVisibility(source.visibility),
      itemsPerPage:
        Number.isFinite(rawItemsPerPage) && rawItemsPerPage > 0
          ? rawItemsPerPage
          : 10,
      showSeasonFilter: source.showSeasonFilter !== false,
      showDate: source.showDate !== false,
      showStatus: source.showStatus !== false,
      showResultsLink: source.showResultsLink !== false,
      emptyStateText:
        readNullableString(source.emptyStateText) || "No tournaments found.",
    };
    return section;
  }

  if (component === "cms.cta-banner") {
    const section: CmsCtaBannerSection = {
      __component: "cms.cta-banner",
      title: readString(source.title),
      description: readNullableString(source.description),
      buttonLabel: readNullableString(source.buttonLabel),
      buttonUrl: readNullableString(source.buttonUrl),
      theme:
        readString(source.theme) === "secondary" ? "secondary" : "primary",
      visibility: readSectionVisibility(source.visibility),
    };
    return section.title ? section : null;
  }

  if (component === "cms.faq-section") {
    const section: CmsFaqSection = {
      __component: "cms.faq-section",
      title: readNullableString(source.title),
      visibility: readSectionVisibility(source.visibility),
      items: mapFaqItems(source.items),
    };
    return section.items.length > 0 || section.title ? section : null;
  }

  return null;
};

export const mapCmsPage = (value: unknown, strapiBaseUrl: string): CmsPage | null => {
  const source = unwrapEntity(value);
  const id = readString(source.documentId) || readString(source.id);
  const title = readString(source.title);
  const slug = readString(source.slug);

  if (!id || !title || !slug) return null;

  return {
    id,
    title,
    slug,
    summary: readNullableString(source.summary),
    coverImage: mapMedia(source.coverImage, strapiBaseUrl),
    pageType:
      readString(source.pageType) === "landing"
        ? "landing"
        : readString(source.pageType) === "legal"
          ? "legal"
          : "standard",
    layoutTree: mapLayoutNodes(source.layoutTree),
    sections: Array.isArray(source.sections)
      ? source.sections
          .map((section) => mapSection(section, strapiBaseUrl))
          .filter((section): section is CmsSection => Boolean(section))
      : [],
    seo: mapSeo(source.seo, strapiBaseUrl),
    updatedAt: readNullableString(source.updatedAt),
    publishedAt: readNullableString(source.publishedAt),
  };
};

export const mapCmsSiteSettings = (
  value: unknown,
  strapiBaseUrl: string,
): CmsSiteSettings => {
  const source = unwrapEntity(value);
  const menus = mapMenus(source.menus);
  const activeHeaderMenuKey = readNullableString(source.activeHeaderMenuKey);
  const activeFooterMenuKey = readNullableString(source.activeFooterMenuKey);
  const fallbackHeaderLinks = mapNavLinks(source.headerLinks);
  const fallbackFooterLinks = mapNavLinks(source.footerLinks).map((item) => ({
    ...item,
    children: [],
  }));
  const resolvedHeaderLinks =
    menus.find((menu) => menu.key === activeHeaderMenuKey)?.items ||
    menus[0]?.items ||
    fallbackHeaderLinks;
  const resolvedFooterLinks =
    menus.find((menu) => menu.key === activeFooterMenuKey)?.items.map((item) => ({
      ...item,
      children: [],
    })) || fallbackFooterLinks;

  return {
    siteName: readString(source.siteName) || "BilliardToday",
    siteTagline: readNullableString(source.siteTagline),
    logo: mapMedia(source.logo, strapiBaseUrl),
    contactEmail: readNullableString(source.contactEmail),
    menus,
    activeHeaderMenuKey,
    activeFooterMenuKey,
    stickyHeader: source.stickyHeader !== false,
    headerAppearance: mapHeaderAppearance(source.headerAppearance),
    footerAppearance: mapFooterAppearance(source.footerAppearance),
    headerLayout: mapLayoutNodes(source.headerLayout),
    footerLayout: mapLayoutNodes(source.footerLayout),
    headerLinks: resolvedHeaderLinks,
    footerLinks: resolvedFooterLinks,
    socialLinks: mapSocialLinks(source.socialLinks),
    defaultSeo: mapSeo(source.defaultSeo, strapiBaseUrl),
  };
};

export const mapCmsAppearance = (value?: unknown): CmsAppearance => {
  const source = asRecord(value);
  const tokens = asRecord(source.tokens);

  return {
    id: readString(source.id) || DEFAULT_APPEARANCE.id,
    name: readString(source.name) || DEFAULT_APPEARANCE.name,
    colorMode:
      readString(source.colorMode) === "dark"
        ? "dark"
        : readString(source.colorMode) === "system"
          ? "system"
          : DEFAULT_APPEARANCE.colorMode,
    tokens: {
      primary: readString(tokens.primary) || DEFAULT_APPEARANCE.tokens.primary,
      accent: readString(tokens.accent) || DEFAULT_APPEARANCE.tokens.accent,
      background: readString(tokens.background) || DEFAULT_APPEARANCE.tokens.background,
      surface: readString(tokens.surface) || DEFAULT_APPEARANCE.tokens.surface,
      text: readString(tokens.text) || DEFAULT_APPEARANCE.tokens.text,
      radius: readString(tokens.radius) || DEFAULT_APPEARANCE.tokens.radius,
      headingFont: readString(tokens.headingFont) || DEFAULT_APPEARANCE.tokens.headingFont,
      bodyFont: readString(tokens.bodyFont) || DEFAULT_APPEARANCE.tokens.bodyFont,
      pageWidth: readString(tokens.pageWidth) || DEFAULT_APPEARANCE.tokens.pageWidth,
    },
  };
};
