import { notFound } from "next/navigation";
import { getServerEnv } from "@/lib/serverEnv";

const IS_PRODUCTION = (getServerEnv("NODE_ENV") || process.env.NODE_ENV) === "production";
const PRIMARY_STRAPI_URL =
  getServerEnv("STRAPI_API_URL") ||
  (IS_PRODUCTION ? "http://127.0.0.1:1337" : getServerEnv("NEXT_PUBLIC_STRAPI_URL")) ||
  "http://localhost:1337";
const FALLBACK_STRAPI_URL =
  getServerEnv("NEXT_PUBLIC_STRAPI_URL") || (IS_PRODUCTION ? "https://app.billiardtoday.com" : undefined);
const STRAPI_URLS = Array.from(new Set([PRIMARY_STRAPI_URL, FALLBACK_STRAPI_URL].filter(Boolean))) as string[];
const STRAPI_API_TOKEN = getServerEnv("STRAPI_API_TOKEN");
const STRAPI_FETCH_TIMEOUT_MS = Math.max(1000, Number(getServerEnv("STRAPI_FETCH_TIMEOUT_MS") || 7000));

const FEDERATION_SLUG_ALIASES: Record<string, string> = {
  "confederation europeenne de billard": "ceb",
  "confederation europeene de billard": "ceb",
  "confédération européenne de billard": "ceb",
  "confédération européene de billard": "ceb",
  "union mondiale de billard": "union-mondiale-de-billard",
};

type Club = {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  timezone?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  federation?: {
    id: number;
    documentId: string;
    slug?: string;
    name: string;
    country?: string | null;
  } | null;
};

type FederationChild = {
  id: number;
  documentId: string;
  slug?: string;
  name: string;
  country?: string | null;
  level?: string | null;
};

type Federation = {
  id: number;
  documentId: string;
  slug: string;
  name: string;
  country?: string | null;
  level?: string | null;
  acronym?: string | null;
  office?: string | null;
  address?: string | null;
  addressLine2?: string | null;
  addressLine3?: string | null;
  postalCode?: string | null;
  city?: string | null;
  website?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  mobilePhone?: string | null;
  fax?: string | null;
  googleMapsUrl?: string | null;
  contactPerson?: string | null;
  president?: string | null;
  sportsDirector?: string | null;
  youthDirector?: string | null;
  logo?: {
    id?: number;
    url?: string | null;
    name?: string | null;
  } | null;
  parent?: {
    id: number;
    documentId: string;
    slug?: string;
    name: string;
  } | null;
  clubs?: Club[];
  children?: FederationChild[];
  clubCount?: number;
  federationCount?: number;
};

type StrapiRelation<T> = { data?: T[] | T | null } | T[] | T | null | undefined;

const buildHeaders = (): HeadersInit =>
  STRAPI_API_TOKEN ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` } : {};

const readString = (value: unknown): string | null => {
  const cleaned = String(value ?? "").trim();
  return cleaned || null;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const unwrapEntity = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const attributes =
    typeof record.attributes === "object" && record.attributes !== null
      ? (record.attributes as Record<string, unknown>)
      : {};

  return {
    ...attributes,
    ...record,
  };
};

const resolveRelationValue = (value: unknown): unknown => {
  if (!value || typeof value !== "object") return value;
  if ("data" in (value as Record<string, unknown>)) {
    return (value as { data?: unknown }).data;
  }
  return value;
};

const toRelationArray = <T = unknown>(relation: StrapiRelation<T>): T[] => {
  if (!relation) return [];
  if (Array.isArray(relation)) return relation;
  if (typeof relation === "object" && relation !== null && "data" in (relation as Record<string, unknown>)) {
    const data = (relation as { data?: T[] | T | null }).data;
    if (!data) return [];
    return Array.isArray(data) ? data : [data];
  }
  return [relation as T];
};

const buildFederationSlug = (entity: Record<string, unknown>) => {
  const slug = readString(entity.slug);
  if (slug) return slug;

  const name = readString(entity.name);
  if (!name) return null;

  const alias = FEDERATION_SLUG_ALIASES[name.trim().toLocaleLowerCase("fr")];
  if (alias) return alias;

  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const mapFederationRelation = (value: unknown): Federation["parent"] => {
  const entity = unwrapEntity(resolveRelationValue(value));
  const name = readString(entity?.name);
  const documentId = readString(entity?.documentId);
  if (!entity || !name || !documentId) return null;

  return {
    id: toNumber(entity.id) ?? 0,
    documentId,
    slug: readString(entity.slug) || undefined,
    name,
  };
};

const mapClub = (value: unknown): Club | null => {
  const entity = unwrapEntity(value);
  const name = readString(entity?.name);
  const slug = readString(entity?.slug);
  const documentId = readString(entity?.documentId);
  if (!entity || !name || !slug || !documentId) return null;

  const federationEntity = unwrapEntity(resolveRelationValue(entity.federation));
  const federationName = readString(federationEntity?.name);
  const federationDocumentId = readString(federationEntity?.documentId);

  return {
    id: toNumber(entity.id) ?? 0,
    documentId,
    name,
    slug,
    city: readString(entity.city),
    country: readString(entity.country),
    address: readString(entity.address),
    timezone: readString(entity.timezone),
    contactEmail: readString(entity.contactEmail),
    contactPhone: readString(entity.contactPhone),
    federation:
      federationEntity && federationName && federationDocumentId
        ? {
            id: toNumber(federationEntity.id) ?? 0,
            documentId: federationDocumentId,
            slug: readString(federationEntity.slug) || undefined,
            name: federationName,
            country: readString(federationEntity.country),
          }
        : null,
  };
};

const mapFederationChild = (value: unknown): FederationChild | null => {
  const entity = unwrapEntity(value);
  const name = readString(entity?.name);
  const documentId = readString(entity?.documentId);
  const slug = buildFederationSlug(entity || {});
  if (!entity || !name || !documentId || !slug) return null;

  return {
    id: toNumber(entity.id) ?? 0,
    documentId,
    slug,
    name,
    country: readString(entity.country),
    level: readString(entity.level),
  };
};

const mapFederation = (value: unknown): Federation | null => {
  const entity = unwrapEntity(value);
  const name = readString(entity?.name);
  const documentId = readString(entity?.documentId);
  const slug = buildFederationSlug(entity || {});
  if (!entity || !name || !documentId || !slug) return null;

  const clubs = toRelationArray(entity.clubs)
    .map(mapClub)
    .filter((club: Club | null): club is Club => Boolean(club));
  const children = toRelationArray(entity.children)
    .map(mapFederationChild)
    .filter((child: FederationChild | null): child is FederationChild => Boolean(child));
  const logoEntity = unwrapEntity(resolveRelationValue(entity.logo));

  return {
    id: toNumber(entity.id) ?? 0,
    documentId,
    slug,
    name,
    country: readString(entity.country),
    level: readString(entity.level),
    acronym: readString(entity.acronym),
    office: readString(entity.office),
    address: readString(entity.address),
    addressLine2: readString(entity.addressLine2),
    addressLine3: readString(entity.addressLine3),
    postalCode: readString(entity.postalCode),
    city: readString(entity.city),
    website: readString(entity.website),
    contactEmail: readString(entity.contactEmail),
    contactPhone: readString(entity.contactPhone),
    mobilePhone: readString(entity.mobilePhone),
    fax: readString(entity.fax),
    googleMapsUrl: readString(entity.googleMapsUrl),
    contactPerson: readString(entity.contactPerson),
    president: readString(entity.president),
    sportsDirector: readString(entity.sportsDirector),
    youthDirector: readString(entity.youthDirector),
    logo: logoEntity
      ? {
          id: toNumber(logoEntity.id) ?? undefined,
          url: readString(logoEntity.url),
          name: readString(logoEntity.name),
        }
      : null,
    parent: mapFederationRelation(entity.parent),
    clubs,
    children,
    clubCount: readString(entity.level) === "national" ? clubs.length : 0,
    federationCount: children.length,
  };
};

const fetchStrapiJson = async (path: string) => {
  let lastError: unknown = null;

  for (const baseUrl of STRAPI_URLS) {
    const url = `${baseUrl}${path}`;
    const doFetch = async (useAuth: boolean) =>
      fetch(url, {
        cache: "no-store",
        headers: useAuth ? buildHeaders() : {},
        signal: AbortSignal.timeout(STRAPI_FETCH_TIMEOUT_MS),
      });

    try {
      let res = await doFetch(Boolean(STRAPI_API_TOKEN));
      if (!res.ok && STRAPI_API_TOKEN && (res.status === 401 || res.status === 403)) {
        res = await doFetch(false);
      }

      if (!res.ok) {
        const error = new Error(`Strapi request failed: ${res.status} ${path}`);
        if (res.status >= 500 && baseUrl !== STRAPI_URLS[STRAPI_URLS.length - 1]) {
          lastError = error;
          continue;
        }
        throw error;
      }

      return res.json();
    } catch (error) {
      lastError = error;
      if (baseUrl === STRAPI_URLS[STRAPI_URLS.length - 1]) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Strapi request failed: ${path}`);
};

const fetchCollectionRows = async (path: string, baseParams: URLSearchParams, pageSize = 50) => {
  const rows: unknown[] = [];
  let page = 1;
  let pageCount: number | null = null;

  while (true) {
    const params = new URLSearchParams(baseParams);
    params.set("pagination[page]", String(page));
    params.set("pagination[pageSize]", String(pageSize));

    const json = await fetchStrapiJson(`${path}?${params.toString()}`);
    const pageRows = Array.isArray(json?.data) ? json.data : [];
    if (pageRows.length === 0) break;

    rows.push(...pageRows);

    const metaPageCount =
      (json as { meta?: { pagination?: { pageCount?: number } } } | null)?.meta?.pagination?.pageCount;
    if (typeof metaPageCount === "number" && Number.isFinite(metaPageCount) && metaPageCount > 0) {
      pageCount = metaPageCount;
    }

    if (pageCount !== null && page >= pageCount) break;
    if (pageRows.length < pageSize) break;

    page += 1;
  }

  return rows;
};

export async function getClubs(): Promise<Club[]> {
  const params = new URLSearchParams();
  params.set("sort[0]", "name:asc");
  params.set("fields[0]", "name");
  params.set("fields[1]", "slug");
  params.set("fields[2]", "city");
  params.set("fields[3]", "country");
  params.set("fields[4]", "contactEmail");
  params.set("fields[5]", "contactPhone");
  params.set("fields[6]", "documentId");
  params.set("populate[federation][fields][0]", "name");
  params.set("populate[federation][fields][1]", "country");
  params.set("populate[federation][fields][2]", "documentId");
  params.set("populate[federation][fields][3]", "slug");

  try {
    const rows = await fetchCollectionRows("/api/clubs", params, 50);
    return rows.map(mapClub).filter((club: Club | null): club is Club => Boolean(club));
  } catch (error) {
    console.error("[directory][getClubs]", error);
    return [];
  }
}

export async function getClubBySlug(slug: string): Promise<Club | null> {
  const params = new URLSearchParams();
  params.set("filters[slug][$eq]", slug);
  params.set("pagination[pageSize]", "1");
  params.set("fields[0]", "name");
  params.set("fields[1]", "slug");
  params.set("fields[2]", "city");
  params.set("fields[3]", "country");
  params.set("fields[4]", "address");
  params.set("fields[5]", "timezone");
  params.set("fields[6]", "contactEmail");
  params.set("fields[7]", "contactPhone");
  params.set("fields[8]", "documentId");
  params.set("populate[federation][fields][0]", "name");
  params.set("populate[federation][fields][1]", "country");
  params.set("populate[federation][fields][2]", "documentId");
  params.set("populate[federation][fields][3]", "slug");

  try {
    const json = await fetchStrapiJson(`/api/clubs?${params.toString()}`);
    const row = Array.isArray(json?.data) ? json.data[0] || null : null;
    return mapClub(row);
  } catch (error) {
    console.error("[directory][getClubBySlug]", error);
    return null;
  }
}

export async function getClubByIdentifier(identifier: string): Promise<Club | null> {
  const clean = String(identifier || "").trim();
  if (!clean) return null;

  const bySlug = await getClubBySlug(clean);
  if (bySlug) return bySlug;

  const params = new URLSearchParams();
  params.set("filters[documentId][$eq]", clean);
  params.set("pagination[pageSize]", "1");
  params.set("fields[0]", "name");
  params.set("fields[1]", "slug");
  params.set("fields[2]", "city");
  params.set("fields[3]", "country");
  params.set("fields[4]", "address");
  params.set("fields[5]", "timezone");
  params.set("fields[6]", "contactEmail");
  params.set("fields[7]", "contactPhone");
  params.set("fields[8]", "documentId");
  params.set("populate[federation][fields][0]", "name");
  params.set("populate[federation][fields][1]", "country");
  params.set("populate[federation][fields][2]", "documentId");
  params.set("populate[federation][fields][3]", "slug");

  try {
    const json = await fetchStrapiJson(`/api/clubs?${params.toString()}`);
    const row = Array.isArray(json?.data) ? json.data[0] || null : null;
    return mapClub(row);
  } catch (error) {
    console.error("[directory][getClubByIdentifier]", error);
    return null;
  }
}

export async function getFederations(): Promise<Federation[]> {
  const params = new URLSearchParams();
  params.set("sort[0]", "name:asc");
  params.set("populate[logo][fields][0]", "url");
  params.set("populate[logo][fields][1]", "name");
  params.set("populate[clubs][fields][0]", "name");
  params.set("populate[clubs][fields][1]", "slug");
  params.set("populate[clubs][fields][2]", "documentId");

  try {
    const rows = await fetchCollectionRows("/api/federations", params, 40);
    return rows.map(mapFederation).filter((row: Federation | null): row is Federation => Boolean(row));
  } catch (error) {
    console.error("[directory][getFederations]", error);
    return [];
  }
}

export async function getFederationBySlug(slug: string): Promise<Federation | null> {
  try {
    const all = await getFederations();
    return all.find((item) => item.slug === slug) || null;
  } catch (error) {
    console.error("[directory][getFederationBySlug]", error);
    return null;
  }
}

export async function getFederationByIdentifier(identifier: string): Promise<Federation | null> {
  const clean = String(identifier || "").trim();
  if (!clean) return null;

  const bySlug = await getFederationBySlug(clean);
  if (bySlug) return bySlug;

  try {
    const all = await getFederations();
    return all.find((item) => item.documentId === clean) || null;
  } catch (error) {
    console.error("[directory][getFederationByIdentifier]", error);
    return null;
  }
}

export async function requireClubBySlug(slug: string) {
  const club = await getClubBySlug(slug);
  if (!club) notFound();
  return club;
}

export async function requireClubByIdentifier(identifier: string) {
  const club = await getClubByIdentifier(identifier);
  if (!club) notFound();
  return club;
}

export async function requireFederationByIdentifier(identifier: string) {
  const federation = await getFederationByIdentifier(identifier);
  if (!federation) notFound();
  return federation;
}

export type { Club, Federation };
