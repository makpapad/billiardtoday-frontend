import { getCountryCode } from "@/lib/countryFlags";
import { resolveMediaUrl as resolveConfiguredMediaUrl } from "@/lib/mediaUrl";
import { buildTournamentHref } from "@/lib/tournaments";

const STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || "https://app.billiardtoday.com";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const IS_DEVELOPMENT = process.env.NODE_ENV !== "production";

type StrapiRelation<T> = { data?: T[] | T | null } | T[] | T | null | undefined;

export type PublicPlayerCard = {
  id: number | null;
  documentId: string;
  fullName: string;
  fullNameEn: string | null;
  country: string | null;
  city: string | null;
  clubName: string | null;
  photoUrl: string | null;
  href: string;
};

export type PublicTournamentCard = {
  id: number | null;
  documentId: string;
  title: string;
  slug: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string | null;
  gameType: string | null;
  clubName: string | null;
  eventDocumentId: string | null;
  tournamentSlug: string | null;
  href: string | null;
};

export type PublicClubCard = {
  id: number | null;
  documentId: string;
  name: string;
  slug: string;
  city: string | null;
  address: string | null;
  timezone: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  federationName: string | null;
  federationSlug: string | null;
  playerCount: number;
  tournamentCount: number;
  href: string;
};

export type PublicClubDetail = PublicClubCard & {
  players: PublicPlayerCard[];
  tournaments: PublicTournamentCard[];
};

export type PublicFederationCard = {
  id: number | null;
  documentId: string;
  name: string;
  slug: string;
  country: string | null;
  countryCode: string | null;
  level: string | null;
  parentName: string | null;
  clubCount: number;
  federationCount: number;
  href: string;
};

export type PublicFederationDetail = PublicFederationCard & {
  clubs: PublicClubCard[];
  children: PublicFederationCard[];
};

export type PublicTournamentEventCard = {
  id: number | null;
  documentId: string;
  tournamentSlug: string | null;
  title: string;
  season: number | null;
  startDate: string | null;
  endDate: string | null;
  gameType: string | null;
  tournamentTitle: string | null;
  href: string;
};

const buildHeaders = (): HeadersInit => {
  if (!STRAPI_API_TOKEN) return {};
  return {
    Authorization: `Bearer ${STRAPI_API_TOKEN}`,
  };
};

const fetchStrapiJson = async (path: string, revalidate = 60) => {
  const url = `${STRAPI_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    headers: buildHeaders(),
    cache: IS_DEVELOPMENT ? "no-store" : undefined,
    next: IS_DEVELOPMENT ? undefined : { revalidate },
  });

  if (!response.ok) {
    throw new Error(`Strapi request failed: ${response.status} ${path}`);
  }

  return response.json();
};

const readString = (value: unknown): string | null => {
  const cleaned = String(value || "").trim();
  return cleaned || null;
};

const isUsablePlayerName = (value: string | null) => {
  const clean = readString(value);
  if (!clean) return false;
  if (/^[\W_]+$/.test(clean)) return false;
  if (/^\d/.test(clean)) return false;
  if (!/[A-Za-z\u00C0-\u024F\u0370-\u03FF]/.test(clean)) return false;
  return true;
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

const resolveMediaUrl = (value: unknown): string | null => {
  const entity = unwrapEntity(
    value && typeof value === "object" && "data" in (value as Record<string, unknown>)
      ? (value as { data?: unknown }).data
      : value,
  );
  const mediaUrl = readString(entity?.url);
  if (!mediaUrl) return null;
  return resolveConfiguredMediaUrl(mediaUrl, STRAPI_URL);
};

const buildPlayerHref = (id: number | string | null, name: string) => {
  const cleanId = String(id || "").trim();
  const cleanName = String(name || "")
    .trim()
    .replace(/\s+/g, "-");
  return `/players/${cleanName ? `${cleanId}-${cleanName}` : cleanId}`;
};

const mapPlayerCard = (value: unknown): PublicPlayerCard | null => {
  const entity = unwrapEntity(value);
  if (!entity) return null;

  const nativeName = readString(entity.full_name);
  const englishName = readString(entity.full_name_en);
  const displayName =
    (isUsablePlayerName(englishName) ? englishName : null) ||
    (isUsablePlayerName(nativeName) ? nativeName : null);
  const documentId = readString(entity.documentId);
  const id = toNumber(entity.id);

  if (!displayName || !documentId || id === null) return null;
  const clubEntity = unwrapEntity(
    entity.club && typeof entity.club === "object" && "data" in (entity.club as Record<string, unknown>)
      ? (entity.club as { data?: unknown }).data
      : entity.club,
  );

  return {
    id,
    documentId,
    fullName: nativeName || displayName,
    fullNameEn: englishName,
    country: readString(entity.country),
    city: readString(entity.city),
    clubName: readString(clubEntity?.name),
    photoUrl: resolveMediaUrl(entity.photo_main) || resolveMediaUrl(entity.photo_alt),
    href: buildPlayerHref(id, displayName),
  };
};

const mapTournamentCard = (value: unknown): PublicTournamentCard | null => {
  const entity = unwrapEntity(value);
  if (!entity) return null;
  if (isDraftTournament(entity)) return null;

  const title = readString(entity.title);
  const documentId = readString(entity.documentId);
  if (!title || !documentId) return null;

  const clubEntity = unwrapEntity(
    entity.club && typeof entity.club === "object" && "data" in (entity.club as Record<string, unknown>)
      ? (entity.club as { data?: unknown }).data
      : entity.club,
  );
  const eventEntity = unwrapEntity(
    entity.bt_event && typeof entity.bt_event === "object" && "data" in (entity.bt_event as Record<string, unknown>)
      ? (entity.bt_event as { data?: unknown }).data
      : entity.bt_event,
  );
  const eventDocumentId = readString(eventEntity?.documentId);
  const tournamentSlug = readString(entity.slug);

  return {
    id: toNumber(entity.id),
    documentId,
    title,
    slug: readString(entity.slug),
    startDate: readString(entity.startDate),
    endDate: readString(entity.endDate),
    status: readString(entity.tournament_status),
    gameType: readString(entity.game_type),
    clubName: readString(clubEntity?.name),
    eventDocumentId,
    tournamentSlug,
    href: eventDocumentId
      ? buildTournamentHref(tournamentSlug || eventDocumentId, title, toNumber(entity.season))
      : null,
  };
};

const isDraftTournament = (entity: Record<string, unknown>): boolean => {
  const formatDefinition =
    entity.format_definition && typeof entity.format_definition === "object"
      ? (entity.format_definition as Record<string, unknown>)
      : {};
  const publication =
    formatDefinition.publication && typeof formatDefinition.publication === "object"
      ? (formatDefinition.publication as Record<string, unknown>)
      : {};
  const publicationState = String(publication.state ?? "").toLowerCase();
  if (publicationState) return publicationState !== "published";

  return Boolean(
    formatDefinition.clubRuntime ||
      String(formatDefinition.setupMode ?? "").startsWith("club_"),
  );
};

const mapClubCard = (value: unknown): PublicClubCard | null => {
  const entity = unwrapEntity(value);
  if (!entity) return null;

  const name = readString(entity.name);
  const slug = readString(entity.slug);
  const documentId = readString(entity.documentId);
  if (!name || !slug || !documentId) return null;

  const federationEntity = unwrapEntity(
    entity.federation && typeof entity.federation === "object" && "data" in (entity.federation as Record<string, unknown>)
      ? (entity.federation as { data?: unknown }).data
      : entity.federation,
  );

  const players = toRelationArray(entity.players);
  const tournaments = toRelationArray(entity.tournaments).filter(
    (tournament) => !isDraftTournament(tournament as Record<string, unknown>),
  );

  return {
    id: toNumber(entity.id),
    documentId,
    name,
    slug,
    city: readString(entity.city),
    address: readString(entity.address),
    timezone: readString(entity.timezone),
    contactEmail: readString(entity.contactEmail),
    contactPhone: readString(entity.contactPhone),
    federationName: readString(federationEntity?.name),
    federationSlug: readString(federationEntity?.slug),
    playerCount: players.length,
    tournamentCount: tournaments.length,
    href: `/clubs/${slug}`,
  };
};

const mapFederationCard = (value: unknown): PublicFederationCard | null => {
  const entity = unwrapEntity(value);
  if (!entity) return null;

  const name = readString(entity.name);
  const country = readString(entity.country);
  const documentId = readString(entity.documentId);
  const slugSource = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : null;
  const slug = readString(entity.slug) || slugSource;

  if (!name || !country || !documentId || !slug) return null;

  const clubs = toRelationArray(entity.clubs);
  const children = toRelationArray(entity.children);
  const parentEntity = unwrapEntity(
    entity.parent && typeof entity.parent === "object" && "data" in (entity.parent as Record<string, unknown>)
      ? (entity.parent as { data?: unknown }).data
      : entity.parent,
  );

  return {
    id: toNumber(entity.id),
    documentId,
    name,
    slug,
    country,
    countryCode: getCountryCode(country),
    level: readString(entity.level),
    parentName: readString(parentEntity?.name),
    clubCount: readString(entity.level) === "national" ? clubs.length : 0,
    federationCount: children.length,
    href: `/federations/${slug}`,
  };
};

export const listTournamentEvents = async (limit = 6): Promise<PublicTournamentEventCard[]> => {
  const params = new URLSearchParams();
  params.set("pagination[pageSize]", String(limit));
  params.set("sort[0]", "start_date:desc");
  params.set("fields[0]", "title");
  params.set("fields[1]", "season");
  params.set("fields[2]", "start_date");
  params.set("fields[3]", "end_date");
  params.set("fields[4]", "game_type");
  params.set("fields[5]", "documentId");
  params.set("populate[tournament][fields][0]", "title");
  params.set("populate[tournament][fields][1]", "slug");

  const json = await fetchStrapiJson(`/api/bt-events?${params.toString()}`, 60).catch(() => null);
  const rows = Array.isArray(json?.data) ? json.data : [];

  return rows
    .map((row: unknown) => {
      const entity = unwrapEntity(row);
      if (!entity) return null;
      const documentId = readString(entity.documentId);
      const title = readString(entity.title);
      if (!documentId || !title) return null;
      const tournamentEntity = unwrapEntity(
        entity.tournament && typeof entity.tournament === "object" && "data" in (entity.tournament as Record<string, unknown>)
          ? (entity.tournament as { data?: unknown }).data
          : entity.tournament,
      );

      return {
        id: toNumber(entity.id),
        documentId,
        tournamentSlug: readString(tournamentEntity?.slug),
        title,
        season: toNumber(entity.season),
        startDate: readString(entity.start_date),
        endDate: readString(entity.end_date),
        gameType: readString(entity.game_type),
        tournamentTitle: readString(tournamentEntity?.title),
        href: buildTournamentHref(
          readString(tournamentEntity?.slug) || documentId,
          title,
          toNumber(entity.season),
        ),
      } satisfies PublicTournamentEventCard;
    })
    .filter((row: PublicTournamentEventCard | null): row is PublicTournamentEventCard => Boolean(row));
};

export const listClubs = async (limit = 12): Promise<PublicClubCard[]> => {
  const params = new URLSearchParams();
  params.set("pagination[pageSize]", String(limit));
  params.set("sort[0]", "name:asc");
  params.set("fields[0]", "name");
  params.set("fields[1]", "slug");
  params.set("fields[2]", "city");
  params.set("fields[3]", "address");
  params.set("fields[4]", "timezone");
  params.set("fields[5]", "contactEmail");
  params.set("fields[6]", "contactPhone");
  params.set("fields[7]", "documentId");
  params.set("populate[federation][fields][0]", "name");
  params.set("populate[federation][fields][1]", "slug");
  params.set("populate[players][fields][0]", "documentId");
  params.set("populate[tournaments][fields][0]", "documentId");
  params.set("populate[tournaments][fields][1]", "format_definition");

  const json = await fetchStrapiJson(`/api/clubs?${params.toString()}`, 60).catch(() => null);
  const rows = Array.isArray(json?.data) ? json.data : [];
  return rows.map(mapClubCard).filter((row: PublicClubCard | null): row is PublicClubCard => Boolean(row));
};

export const getClubBySlug = async (slug: string): Promise<PublicClubDetail | null> => {
  const cleanSlug = String(slug || "").trim();
  if (!cleanSlug) return null;

  const params = new URLSearchParams();
  params.set("filters[slug][$eq]", cleanSlug);
  params.set("pagination[pageSize]", "1");
  params.set("fields[0]", "name");
  params.set("fields[1]", "slug");
  params.set("fields[2]", "city");
  params.set("fields[3]", "address");
  params.set("fields[4]", "timezone");
  params.set("fields[5]", "contactEmail");
  params.set("fields[6]", "contactPhone");
  params.set("fields[7]", "documentId");
  params.set("populate[federation][fields][0]", "name");
  params.set("populate[federation][fields][1]", "slug");
  params.set("populate[players][fields][0]", "full_name");
  params.set("populate[players][fields][1]", "full_name_en");
  params.set("populate[players][fields][2]", "country");
  params.set("populate[players][fields][3]", "city");
  params.set("populate[players][fields][4]", "documentId");
  params.set("populate[players][populate][photo_main][fields][0]", "url");
  params.set("populate[tournaments][fields][0]", "title");
  params.set("populate[tournaments][fields][1]", "slug");
  params.set("populate[tournaments][fields][2]", "startDate");
  params.set("populate[tournaments][fields][3]", "endDate");
  params.set("populate[tournaments][fields][4]", "tournament_status");
  params.set("populate[tournaments][fields][5]", "game_type");
  params.set("populate[tournaments][fields][6]", "documentId");
  params.set("populate[tournaments][fields][7]", "format_definition");
  params.set("populate[tournaments][populate][bt_event][fields][0]", "documentId");

  const json = await fetchStrapiJson(`/api/clubs?${params.toString()}`, 60).catch(() => null);
  const row = Array.isArray(json?.data) ? json.data[0] : null;
  const base = mapClubCard(row);
  const entity = unwrapEntity(row);

  if (!base || !entity) return null;

  return {
    ...base,
    players: toRelationArray(entity.players)
      .map(mapPlayerCard)
      .filter((player: PublicPlayerCard | null): player is PublicPlayerCard => Boolean(player))
      .slice(0, 12),
    tournaments: toRelationArray(entity.tournaments)
      .map(mapTournamentCard)
      .filter((row: PublicTournamentCard | null): row is PublicTournamentCard => Boolean(row))
      .slice(0, 12),
  };
};

export const listFederations = async (limit = 12): Promise<PublicFederationCard[]> => {
  const params = new URLSearchParams();
  params.set("pagination[pageSize]", String(limit));
  params.set("sort[0]", "name:asc");
  params.set("fields[0]", "name");
  params.set("fields[1]", "slug");
  params.set("fields[2]", "country");
  params.set("fields[3]", "documentId");
  params.set("fields[4]", "level");
  params.set("populate[clubs][fields][0]", "documentId");
  params.set("populate[children][fields][0]", "name");
  params.set("populate[children][fields][1]", "slug");
  params.set("populate[children][fields][2]", "country");
  params.set("populate[children][fields][3]", "documentId");
  params.set("populate[children][fields][4]", "level");
  params.set("populate[parent][fields][0]", "name");

  const json = await fetchStrapiJson(`/api/federations?${params.toString()}`, 60).catch(() => null);
  const rows = Array.isArray(json?.data) ? json.data : [];
  return rows.map(mapFederationCard).filter((row: PublicFederationCard | null): row is PublicFederationCard => Boolean(row));
};

export const getFederationBySlug = async (slug: string): Promise<PublicFederationDetail | null> => {
  const params = new URLSearchParams();
  params.set("filters[slug][$eq]", slug);
  params.set("pagination[pageSize]", "1");
  params.set("fields[0]", "name");
  params.set("fields[1]", "slug");
  params.set("fields[2]", "country");
  params.set("fields[3]", "documentId");
  params.set("fields[4]", "level");
  params.set("populate[clubs][fields][0]", "name");
  params.set("populate[clubs][fields][1]", "slug");
  params.set("populate[clubs][fields][2]", "city");
  params.set("populate[clubs][fields][3]", "address");
  params.set("populate[clubs][fields][4]", "timezone");
  params.set("populate[clubs][fields][5]", "contactEmail");
  params.set("populate[clubs][fields][6]", "contactPhone");
  params.set("populate[clubs][fields][7]", "documentId");
  params.set("populate[clubs][populate][players][fields][0]", "documentId");
  params.set("populate[clubs][populate][tournaments][fields][0]", "documentId");
  params.set("populate[clubs][populate][federation][fields][0]", "name");
  params.set("populate[children][fields][0]", "name");
  params.set("populate[children][fields][1]", "slug");
  params.set("populate[children][fields][2]", "country");
  params.set("populate[children][fields][3]", "documentId");
  params.set("populate[children][fields][4]", "level");
  params.set("populate[parent][fields][0]", "name");

  const json = await fetchStrapiJson(`/api/federations?${params.toString()}`, 60).catch(() => null);
  const row = Array.isArray(json?.data) ? json.data[0] : null;
  const base = mapFederationCard(row);
  const entity = unwrapEntity(row);
  if (!entity || !base) return null;

  return {
    ...base,
    clubs: toRelationArray(entity.clubs)
      .map(mapClubCard)
      .filter((club: PublicClubCard | null): club is PublicClubCard => Boolean(club)),
    children: toRelationArray(entity.children)
      .map(mapFederationCard)
      .filter((child: PublicFederationCard | null): child is PublicFederationCard => Boolean(child)),
  };
};

export const listFeaturedPlayers = async (limit = 6): Promise<PublicPlayerCard[]> => {
  const params = new URLSearchParams();
  params.set("pagination[pageSize]", String(limit));
  params.set("sort[0]", "full_name:asc");
  params.set("fields[0]", "full_name");
  params.set("fields[1]", "full_name_en");
  params.set("fields[2]", "country");
  params.set("fields[3]", "city");
  params.set("fields[4]", "documentId");
  params.set("populate[club][fields][0]", "name");
  params.set("populate[photo_main][fields][0]", "url");

  const json = await fetchStrapiJson(`/api/bt-players?${params.toString()}`, 60).catch(() => null);
  const rows = Array.isArray(json?.data) ? json.data : [];
  return rows.map(mapPlayerCard).filter((row: PublicPlayerCard | null): row is PublicPlayerCard => Boolean(row));
};

export const getPlayersTotalCount = async (): Promise<number> => {
  const params = new URLSearchParams();
  params.set("pagination[page]", "1");
  params.set("pagination[pageSize]", "1");
  params.set("fields[0]", "documentId");

  const json = await fetchStrapiJson(`/api/bt-players?${params.toString()}`, 60).catch(() => null);
  const total =
    (json as { meta?: { pagination?: { total?: number } } } | null)?.meta?.pagination?.total;

  if (typeof total === "number" && Number.isFinite(total) && total >= 0) {
    return total;
  }

  const rows = Array.isArray(json?.data) ? json.data : [];
  return rows.length;
};

export const getPublicPlayerByIdentifier = async (
  identifier: string,
): Promise<PublicPlayerCard | null> => {
  const cleanIdentifier = String(identifier || "").trim();
  if (!cleanIdentifier) return null;

  const playerId = decodeURIComponent(cleanIdentifier).split("-")[0]?.trim() || cleanIdentifier;
  const params = new URLSearchParams();
  params.set("pagination[pageSize]", "1");
  params.set("fields[0]", "full_name");
  params.set("fields[1]", "full_name_en");
  params.set("fields[2]", "country");
  params.set("fields[3]", "city");
  params.set("fields[4]", "documentId");
  params.set("populate[club][fields][0]", "name");
  params.set("populate[photo_main][fields][0]", "url");
  params.set("populate[photo_alt][fields][0]", "url");

  if (/^\d+$/.test(playerId)) {
    params.set("filters[id][$eq]", playerId);
  } else {
    params.set("filters[documentId][$eq]", playerId);
  }

  const json = await fetchStrapiJson(`/api/bt-players?${params.toString()}`, 60).catch(() => null);
  const rows = Array.isArray(json?.data) ? json.data : [];

  return mapPlayerCard(rows[0]) || null;
};

export const listPlayers = async (limit = 100000): Promise<PublicPlayerCard[]> => {
  const pageSize = 1000;
  const maxTotal = Math.max(0, Number.isFinite(limit) ? Number(limit) : 0);
  const hardCap = 50000;

  const baseParams = new URLSearchParams();
  baseParams.set("sort[0]", "full_name:asc");
  baseParams.set("fields[0]", "full_name");
  baseParams.set("fields[1]", "full_name_en");
  baseParams.set("fields[2]", "country");
  baseParams.set("fields[3]", "city");
  baseParams.set("fields[4]", "documentId");
  baseParams.set("populate[club][fields][0]", "name");
  baseParams.set("populate[photo_main][fields][0]", "url");
  baseParams.set("populate[photo_alt][fields][0]", "url");

  const allRows: unknown[] = [];
  let page = 1;
  let pageCount: number | null = null;

  while (true) {
    const params = new URLSearchParams(baseParams);
    params.set("pagination[pageSize]", String(pageSize));
    params.set("pagination[page]", String(page));

    const json = await fetchStrapiJson(`/api/bt-players?${params.toString()}`, 60).catch(() => null);
    const rows = Array.isArray(json?.data) ? json.data : [];
    if (rows.length === 0) break;

    allRows.push(...rows);

    const metaPageCount = (json as { meta?: { pagination?: { pageCount?: number } } } | null)?.meta?.pagination?.pageCount;
    if (typeof metaPageCount === "number" && Number.isFinite(metaPageCount) && metaPageCount > 0) {
      pageCount = metaPageCount;
    }

    const reachedRequestedLimit = maxTotal > 0 && allRows.length >= maxTotal;
    const reachedHardCap = allRows.length >= hardCap;
    const reachedKnownEnd = pageCount !== null && page >= pageCount;

    if (reachedRequestedLimit || reachedHardCap || reachedKnownEnd) break;
    if (rows.length < pageSize) break;

    page += 1;
  }

  const sliced = maxTotal > 0 ? allRows.slice(0, Math.min(maxTotal, hardCap)) : allRows.slice(0, hardCap);
  return sliced
    .map(mapPlayerCard)
    .filter((row: PublicPlayerCard | null): row is PublicPlayerCard => Boolean(row))
    .sort((a: PublicPlayerCard, b: PublicPlayerCard) => {
      const labelA = (a.fullNameEn || a.fullName).toLocaleLowerCase("en");
      const labelB = (b.fullNameEn || b.fullName).toLocaleLowerCase("en");
      return labelA.localeCompare(labelB, "en");
    });
};
