import { notFound } from "next/navigation";
import { getServerEnv } from "@/lib/serverEnv";

const IS_PRODUCTION = (getServerEnv("NODE_ENV") || process.env.NODE_ENV) === "production";
const STRAPI_URL =
  getServerEnv("STRAPI_API_URL") ||
  (IS_PRODUCTION ? "http://127.0.0.1:1337" : getServerEnv("NEXT_PUBLIC_STRAPI_URL")) ||
  "http://localhost:1337";
const STRAPI_API_TOKEN = getServerEnv("STRAPI_API_TOKEN");

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
  children?: Array<{
    id: number;
    documentId: string;
    slug?: string;
    name: string;
    country?: string | null;
    level?: string | null;
  }>;
  clubCount?: number;
  federationCount?: number;
};

const buildHeaders = (): HeadersInit =>
  STRAPI_API_TOKEN ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` } : {};

const fetchStrapiJson = async (path: string) => {
  const url = `${STRAPI_URL}${path}`;
  const doFetch = async (useAuth: boolean) =>
    fetch(url, {
      cache: "no-store",
      headers: useAuth ? buildHeaders() : {},
    });

  let res = await doFetch(Boolean(STRAPI_API_TOKEN));
  if (!res.ok && STRAPI_API_TOKEN && (res.status === 401 || res.status === 403)) {
    res = await doFetch(false);
  }

  if (!res.ok) {
    throw new Error(`Strapi request failed: ${res.status} ${path}`);
  }

  return res.json();
};

export async function getClubs(): Promise<Club[]> {
  const params = new URLSearchParams();
  params.set("pagination[pageSize]", "100");
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

  const json = await fetchStrapiJson(`/api/clubs?${params.toString()}`);
  return Array.isArray(json?.data) ? json.data : [];
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

  const json = await fetchStrapiJson(`/api/clubs?${params.toString()}`);
  return Array.isArray(json?.data) ? json.data[0] || null : null;
}

export async function getClubByIdentifier(identifier: string): Promise<Club | null> {
  const clean = identifier.trim();
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

  const json = await fetchStrapiJson(`/api/clubs?${params.toString()}`);
  return Array.isArray(json?.data) ? json.data[0] || null : null;
}

export async function getFederations(): Promise<Federation[]> {
  const params = new URLSearchParams();
  params.set("pagination[pageSize]", "100");
  params.set("sort[0]", "name:asc");
  params.set("fields[0]", "name");
  params.set("fields[1]", "country");
  params.set("fields[2]", "documentId");
  params.set("fields[3]", "slug");
  params.set("fields[4]", "level");
  params.set("fields[5]", "acronym");
  params.set("fields[6]", "office");
  params.set("fields[7]", "address");
  params.set("fields[8]", "addressLine2");
  params.set("fields[9]", "addressLine3");
  params.set("fields[10]", "postalCode");
  params.set("fields[11]", "city");
  params.set("fields[12]", "website");
  params.set("fields[13]", "contactEmail");
  params.set("fields[14]", "contactPhone");
  params.set("fields[15]", "mobilePhone");
  params.set("fields[16]", "fax");
  params.set("fields[17]", "googleMapsUrl");
  params.set("fields[18]", "contactPerson");
  params.set("fields[19]", "president");
  params.set("fields[20]", "sportsDirector");
  params.set("fields[21]", "youthDirector");
  params.set("populate[logo][fields][0]", "url");
  params.set("populate[logo][fields][1]", "name");
  params.set("populate[clubs][fields][0]", "name");
  params.set("populate[clubs][fields][1]", "slug");
  params.set("populate[clubs][fields][2]", "documentId");
  params.set("populate[children][fields][0]", "name");
  params.set("populate[children][fields][1]", "slug");
  params.set("populate[children][fields][2]", "documentId");
  params.set("populate[children][fields][3]", "country");
  params.set("populate[children][fields][4]", "level");
  params.set("populate[parent][fields][0]", "name");
  params.set("populate[parent][fields][1]", "documentId");
  params.set("populate[parent][fields][2]", "slug");

  const json = await fetchStrapiJson(`/api/federations?${params.toString()}`);
  return Array.isArray(json?.data)
    ? json.data.map((row: Federation) => ({
        ...row,
        clubCount: row.level === "national" ? row.clubs?.length || 0 : 0,
        federationCount: row.children?.length || 0,
      }))
    : [];
}

export async function getFederationBySlug(slug: string): Promise<Federation | null> {
  const params = new URLSearchParams();
  params.set("filters[slug][$eq]", slug);
  params.set("pagination[pageSize]", "1");
  params.set("fields[0]", "name");
  params.set("fields[1]", "country");
  params.set("fields[2]", "documentId");
  params.set("fields[3]", "slug");
  params.set("fields[4]", "level");
  params.set("fields[5]", "acronym");
  params.set("fields[6]", "office");
  params.set("fields[7]", "address");
  params.set("fields[8]", "addressLine2");
  params.set("fields[9]", "addressLine3");
  params.set("fields[10]", "postalCode");
  params.set("fields[11]", "city");
  params.set("fields[12]", "website");
  params.set("fields[13]", "contactEmail");
  params.set("fields[14]", "contactPhone");
  params.set("fields[15]", "mobilePhone");
  params.set("fields[16]", "fax");
  params.set("fields[17]", "googleMapsUrl");
  params.set("fields[18]", "contactPerson");
  params.set("fields[19]", "president");
  params.set("fields[20]", "sportsDirector");
  params.set("fields[21]", "youthDirector");
  params.set("populate[logo][fields][0]", "url");
  params.set("populate[logo][fields][1]", "name");
  params.set("populate[clubs][fields][0]", "name");
  params.set("populate[clubs][fields][1]", "slug");
  params.set("populate[clubs][fields][2]", "documentId");
  params.set("populate[children][fields][0]", "name");
  params.set("populate[children][fields][1]", "slug");
  params.set("populate[children][fields][2]", "documentId");
  params.set("populate[children][fields][3]", "country");
  params.set("populate[children][fields][4]", "level");
  params.set("populate[parent][fields][0]", "name");
  params.set("populate[parent][fields][1]", "documentId");
  params.set("populate[parent][fields][2]", "slug");

  const json = await fetchStrapiJson(`/api/federations?${params.toString()}`);
  if (!Array.isArray(json?.data)) return null;
  const row = json.data[0] || null;
  if (!row) return null;
  return {
    ...row,
    clubCount: row.level === "national" ? row.clubs?.length || 0 : 0,
    federationCount: row.children?.length || 0,
  };
}

export async function getFederationByIdentifier(identifier: string): Promise<Federation | null> {
  const clean = identifier.trim();
  if (!clean) return null;

  const bySlug = await getFederationBySlug(clean);
  if (bySlug) return bySlug;

  const params = new URLSearchParams();
  params.set("filters[documentId][$eq]", clean);
  params.set("pagination[pageSize]", "1");
  params.set("fields[0]", "name");
  params.set("fields[1]", "country");
  params.set("fields[2]", "documentId");
  params.set("fields[3]", "slug");
  params.set("fields[4]", "level");
  params.set("fields[5]", "acronym");
  params.set("fields[6]", "office");
  params.set("fields[7]", "address");
  params.set("fields[8]", "addressLine2");
  params.set("fields[9]", "addressLine3");
  params.set("fields[10]", "postalCode");
  params.set("fields[11]", "city");
  params.set("fields[12]", "website");
  params.set("fields[13]", "contactEmail");
  params.set("fields[14]", "contactPhone");
  params.set("fields[15]", "mobilePhone");
  params.set("fields[16]", "fax");
  params.set("fields[17]", "googleMapsUrl");
  params.set("fields[18]", "contactPerson");
  params.set("fields[19]", "president");
  params.set("fields[20]", "sportsDirector");
  params.set("fields[21]", "youthDirector");
  params.set("populate[logo][fields][0]", "url");
  params.set("populate[logo][fields][1]", "name");
  params.set("populate[clubs][fields][0]", "name");
  params.set("populate[clubs][fields][1]", "slug");
  params.set("populate[clubs][fields][2]", "documentId");
  params.set("populate[children][fields][0]", "name");
  params.set("populate[children][fields][1]", "slug");
  params.set("populate[children][fields][2]", "documentId");
  params.set("populate[children][fields][3]", "country");
  params.set("populate[children][fields][4]", "level");
  params.set("populate[parent][fields][0]", "name");
  params.set("populate[parent][fields][1]", "documentId");
  params.set("populate[parent][fields][2]", "slug");

  const json = await fetchStrapiJson(`/api/federations?${params.toString()}`);
  if (!Array.isArray(json?.data)) return null;
  const row = json.data[0] || null;
  if (!row) return null;
  return {
    ...row,
    clubCount: row.level === "national" ? row.clubs?.length || 0 : 0,
    federationCount: row.children?.length || 0,
  };
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
