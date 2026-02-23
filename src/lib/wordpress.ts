export interface WpV2Page<TAcf> {
  id: number;
  slug: string;
  link: string;
  acf: TAcf;
}

export interface WpRenderedText {
  rendered: string;
}

export interface WordpressPageData {
  id: number;
  slug: string;
  link: string;
  title: string;
  contentHtml: string;
  acf: unknown;
}

export interface WordpressNavMenuItem {
  labelKey: string;
  href: string;
  newTab: boolean;
}

export interface WordpressLandingData {
  heroBackgroundImageUrl?: string;
  heroPrimaryCtaHref?: string;
  heroSecondaryCtaHref?: string;
  statsActiveTournamentsValue?: string;
  statsRegisteredPlayersValue?: string;
  statsCompletedMatchesValue?: string;
}

function getWordpressBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_WORDPRESS_URL;
  if (!raw) return null;

  const normalized = raw.trim().replace(/\/$/, "");
  return normalized.length > 0 ? normalized : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readOptionalString(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readOptionalBoolean(obj: Record<string, unknown>, key: string): boolean | undefined {
  const value = obj[key];
  return typeof value === "boolean" ? value : undefined;
}

function readOptionalArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function readRepeaterNavMenuFromAcf(acf: unknown): WordpressNavMenuItem[] {
  if (!isRecord(acf)) return [];

  const raw = readOptionalArray(acf["navigation_menu"]);
  if (!raw) return [];

  const items: WordpressNavMenuItem[] = [];

  for (const row of raw) {
    if (!isRecord(row)) continue;

    const labelKey = readOptionalString(row, "label_key");
    const href = readOptionalString(row, "href");
    const newTab = readOptionalBoolean(row, "new_tab") ?? false;

    if (!labelKey || !href) continue;
    items.push({ labelKey, href, newTab });
  }

  return items;
}

function readNavMenuItemsFromAcf(acf: unknown): WordpressNavMenuItem[] {
  if (!isRecord(acf)) return [];

  const items: WordpressNavMenuItem[] = [];

  for (let i = 1; i <= 8; i += 1) {
    const labelKey = readOptionalString(acf, `menu_item_${i}_label_key`);
    const href = readOptionalString(acf, `menu_item_${i}_href`);
    const newTab = readOptionalBoolean(acf, `menu_item_${i}_new_tab`) ?? false;

    if (!labelKey || !href) continue;
    items.push({ labelKey, href, newTab });
  }

  return items;
}

function readOptionsAcfFromResponse(json: unknown): unknown {
  if (!isRecord(json)) return undefined;
  if ("acf" in json) return json["acf"];
  return undefined;
}

export function mapLandingAcfToData(acf: unknown): WordpressLandingData {
  if (!isRecord(acf)) return {};

  const heroBackgroundImageUrl = readOptionalString(acf, "hero_background_image");
  const heroPrimaryCtaHref = readOptionalString(acf, "hero_primary_cta_href");
  const heroSecondaryCtaHref = readOptionalString(acf, "hero_secondary_cta_href");

  const statsActiveTournamentsValue = readOptionalString(acf, "stats_active_tournaments_value");
  const statsRegisteredPlayersValue = readOptionalString(acf, "stats_registered_players_value");
  const statsCompletedMatchesValue = readOptionalString(acf, "stats_completed_matches_value");

  return {
    heroBackgroundImageUrl,
    heroPrimaryCtaHref,
    heroSecondaryCtaHref,
    statsActiveTournamentsValue,
    statsRegisteredPlayersValue,
    statsCompletedMatchesValue,
  };
}

export async function fetchWordpressHomeLanding(): Promise<WordpressLandingData> {
  const baseUrl = getWordpressBaseUrl();
  if (!baseUrl) return {};

  try {
    const url = `${baseUrl}/wp-json/wp/v2/pages?slug=home`;
    const res = await fetch(url, {
      next: { revalidate: 60 },
    });

    if (!res.ok) return {};

    const data: unknown = await res.json();

    if (!Array.isArray(data) || data.length === 0) return {};
    const first = data[0];
    if (!isRecord(first)) return {};

    const acf = first["acf"];
    return mapLandingAcfToData(acf);
  } catch {
    return {};
  }
}

export async function fetchWordpressNavMenu(): Promise<WordpressNavMenuItem[]> {
  const baseUrl = getWordpressBaseUrl();
  if (!baseUrl) return [];

  // 1) Preferred: Custom endpoint exposing ACF Options (MU plugin)
  try {
    const optionsUrl = `${baseUrl}/wp-json/billiardtoday/v1/options`;
    const optionsRes = await fetch(optionsUrl, { next: { revalidate: 60 } });
    if (optionsRes.ok) {
      const optionsJson: unknown = await optionsRes.json();
      const optionsAcf = readOptionsAcfFromResponse(optionsJson);

      const repeaterItems = readRepeaterNavMenuFromAcf(optionsAcf);
      if (repeaterItems.length > 0) return repeaterItems;

      const legacyItems = readNavMenuItemsFromAcf(optionsAcf);
      if (legacyItems.length > 0) return legacyItems;
    }
  } catch {
    // Fallbacks below
  }

  // 2) Fallback: Home page ACF repeater (if you prefer keeping it there)
  try {
    const homeUrl = `${baseUrl}/wp-json/wp/v2/pages?slug=home`;
    const homeRes = await fetch(homeUrl, { next: { revalidate: 60 } });
    if (!homeRes.ok) return [];

    const homeData: unknown = await homeRes.json();
    if (!Array.isArray(homeData) || homeData.length === 0) return [];

    const first = homeData[0];
    if (!isRecord(first)) return [];

    const homeAcf = first["acf"];

    const homeRepeaterItems = readRepeaterNavMenuFromAcf(homeAcf);
    if (homeRepeaterItems.length > 0) return homeRepeaterItems;

    // 3) Last fallback: legacy fixed slots menu_item_1_* ... menu_item_8_*
    return readNavMenuItemsFromAcf(homeAcf);
  } catch {
    return [];
  }
}

export async function fetchWordpressPageBySlug(slug: string): Promise<WordpressPageData | null> {
  const baseUrl = getWordpressBaseUrl();
  if (!baseUrl) return null;

  try {
    const url = `${baseUrl}/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}`;
    const res = await fetch(url, {
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;

    const data: unknown = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const first = data[0];
    if (!isRecord(first)) return null;

    const id = first["id"];
    const wpSlug = first["slug"];
    const link = first["link"];
    const titleObj = first["title"];
    const contentObj = first["content"];

    if (typeof id !== "number" || typeof wpSlug !== "string" || typeof link !== "string") return null;

    const title = isRecord(titleObj) ? readOptionalString(titleObj, "rendered") ?? "" : "";
    const contentHtml = isRecord(contentObj) ? readOptionalString(contentObj, "rendered") ?? "" : "";

    const acf = first["acf"];

    return {
      id,
      slug: wpSlug,
      link,
      title,
      contentHtml,
      acf,
    };
  } catch {
    return null;
  }
}
