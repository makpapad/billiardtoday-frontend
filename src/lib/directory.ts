import { notFound } from "next/navigation";
import { getServerEnv } from "@/lib/serverEnv";

const STRAPI_URL = getServerEnv("NEXT_PUBLIC_STRAPI_URL") || "http://localhost:1337";
const STRAPI_API_TOKEN = getServerEnv("STRAPI_API_TOKEN");

type Club = {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  city?: string | null;
  address?: string | null;
  timezone?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  federation?: {
    id: number;
    documentId: string;
    name: string;
    country?: string | null;
  } | null;
};

type Federation = {
  id: number;
  documentId: string;
  name: string;
  country?: string | null;
  clubs?: Club[];
};

const buildHeaders = (): HeadersInit =>
  STRAPI_API_TOKEN ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` } : {};

const fetchStrapiJson = async (path: string) => {
  const res = await fetch(`${STRAPI_URL}${path}`, {
    cache: "no-store",
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Strapi request failed: ${res.status} ${path}`);
  }

  return res.json();
};

export async function getClubs(): Promise<Club[]> {
  const params = new URLSearchParams();
  params.set("pagination[pageSize]", "100");
  params.set("sort[0]", "name:asc");
  params.set("populate[federation][fields][0]", "name");
  params.set("populate[federation][fields][1]", "country");
  params.set("populate[federation][fields][2]", "documentId");

  const json = await fetchStrapiJson(`/api/clubs?${params.toString()}`);
  return Array.isArray(json?.data) ? json.data : [];
}

export async function getClubBySlug(slug: string): Promise<Club | null> {
  const params = new URLSearchParams();
  params.set("filters[slug][$eq]", slug);
  params.set("pagination[pageSize]", "1");
  params.set("populate[federation][fields][0]", "name");
  params.set("populate[federation][fields][1]", "country");
  params.set("populate[federation][fields][2]", "documentId");

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
  params.set("populate[federation][fields][0]", "name");
  params.set("populate[federation][fields][1]", "country");
  params.set("populate[federation][fields][2]", "documentId");

  const json = await fetchStrapiJson(`/api/clubs?${params.toString()}`);
  return Array.isArray(json?.data) ? json.data[0] || null : null;
}

export async function getFederations(): Promise<Federation[]> {
  const params = new URLSearchParams();
  params.set("pagination[pageSize]", "100");
  params.set("sort[0]", "name:asc");
  params.set("populate[clubs][fields][0]", "name");
  params.set("populate[clubs][fields][1]", "slug");
  params.set("populate[clubs][fields][2]", "documentId");

  const json = await fetchStrapiJson(`/api/federations?${params.toString()}`);
  return Array.isArray(json?.data) ? json.data : [];
}

export async function getFederationByDocumentId(documentId: string): Promise<Federation | null> {
  const params = new URLSearchParams();
  params.set("filters[documentId][$eq]", documentId);
  params.set("pagination[pageSize]", "1");
  params.set("populate[clubs][fields][0]", "name");
  params.set("populate[clubs][fields][1]", "slug");
  params.set("populate[clubs][fields][2]", "documentId");

  const json = await fetchStrapiJson(`/api/federations?${params.toString()}`);
  return Array.isArray(json?.data) ? json.data[0] || null : null;
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

export async function requireFederationByDocumentId(documentId: string) {
  const federation = await getFederationByDocumentId(documentId);
  if (!federation) notFound();
  return federation;
}

export type { Club, Federation };
