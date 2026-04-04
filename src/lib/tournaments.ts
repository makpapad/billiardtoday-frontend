export type TournamentEventStageSummary = {
  documentId: string;
  title: string;
  order: number | null;
  isFinal: boolean;
};

export type TournamentEventSummary = {
  documentId: string;
  title: string;
  season: number | null;
  startDate: string | null;
  endDate: string | null;
  gameType: string | null;
  tournamentTitle: string | null;
  clubDocumentId: string | null;
  organizerType: string | null;
  organizerLogoUrl: string | null;
  organizerLogoName: string | null;
  stages: TournamentEventStageSummary[];
};

const STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || "https://app.billiardtoday.com";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const IS_DEVELOPMENT = process.env.NODE_ENV !== "production";

const buildHeaders = (): HeadersInit => {
  if (!STRAPI_API_TOKEN) return {};
  return {
    Authorization: `Bearer ${STRAPI_API_TOKEN}`,
  };
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const readString = (value: unknown): string | null => {
  const cleaned = String(value || "").trim();
  return cleaned || null;
};

const unwrapEntitySource = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object") return {};
  const candidate = value as Record<string, unknown>;
  const data = candidate.data;
  if (data && typeof data === "object") {
    return unwrapEntitySource(data);
  }
  if (candidate.attributes && typeof candidate.attributes === "object") {
    return {
      ...(candidate.attributes as Record<string, unknown>),
      ...candidate,
    };
  }
  return candidate;
};

const GREEK_TO_LATIN: Record<string, string> = {
  α: "a",
  β: "v",
  γ: "g",
  δ: "d",
  ε: "e",
  ζ: "z",
  η: "i",
  θ: "th",
  ι: "i",
  κ: "k",
  λ: "l",
  μ: "m",
  ν: "n",
  ξ: "x",
  ο: "o",
  π: "p",
  ρ: "r",
  σ: "s",
  ς: "s",
  τ: "t",
  υ: "y",
  φ: "f",
  χ: "ch",
  ψ: "ps",
  ω: "o",
};

const transliterateGreek = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split("")
    .map((char) => {
      const lower = char.toLowerCase();
      return GREEK_TO_LATIN[lower] ?? char;
    })
    .join("");

const slugify = (value: string) =>
  transliterateGreek(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const normalizeStage = (value: unknown, index: number): TournamentEventStageSummary => {
  const source =
    value && typeof value === "object" && "attributes" in (value as Record<string, unknown>)
      ? ((value as { attributes?: Record<string, unknown> }).attributes ?? {})
      : ((value as Record<string, unknown>) ?? {});
  const raw = {
    ...source,
    ...(value && typeof value === "object" ? (value as Record<string, unknown>) : {}),
  };

  return {
    documentId: readString(raw.documentId) || `stage-${index + 1}`,
    title: readString(raw.title) || `Stage ${index + 1}`,
    order: toNumber(raw.order),
    isFinal: Boolean(raw.is_final),
  };
};

export const buildTournamentSlug = (
  _documentId: string,
  title: string,
  season?: number | null,
) => {
  const safeTitle = slugify(String(title || "").trim()) || "event";
  const safeSeason =
    typeof season === "number" && Number.isFinite(season) ? String(season) : "";
  return safeSeason ? `${safeTitle}-${safeSeason}` : safeTitle;
};

export const buildTournamentHref = (
  documentId: string,
  title: string,
  season?: number | null,
  embedded = false,
) => `${embedded ? "/embed" : ""}/tournaments/${buildTournamentSlug(documentId, title, season)}`;

export const extractTournamentDocumentId = (slug: string) =>
  String(slug || "").split("--")[0]?.trim() || "";

const fetchTournamentEventSummaryById = async (
  documentId: string,
): Promise<TournamentEventSummary | null> => {
  const cleanId = String(documentId || "").trim();
  if (!cleanId) return null;

  const params = new URLSearchParams();
  params.set("fields[0]", "title");
  params.set("fields[1]", "season");
  params.set("fields[2]", "start_date");
  params.set("fields[3]", "end_date");
  params.set("fields[4]", "game_type");
  params.set("fields[5]", "documentId");
  params.set("populate[tournament][fields][0]", "title");
  params.set("populate[tournament][fields][1]", "organizer_type");
  params.set("populate[tournament][fields][2]", "startDate");
  params.set("populate[tournament][fields][3]", "endDate");
  params.set("populate[tournament][fields][4]", "start_date");
  params.set("populate[tournament][fields][5]", "end_date");
  params.set("populate[tournament][populate][club][fields][0]", "documentId");
  params.set("populate[tournament][populate][club][populate][logo][fields][0]", "url");
  params.set("populate[tournament][populate][club][populate][logo][fields][1]", "name");
  params.set("populate[tournament][populate][club][populate][federation][fields][0]", "name");
  params.set("populate[tournament][populate][club][populate][federation][populate][logo][fields][0]", "url");
  params.set("populate[tournament][populate][club][populate][federation][populate][logo][fields][1]", "name");
  params.set("populate[tournament][populate][organizer_federation][fields][0]", "name");
  params.set("populate[tournament][populate][organizer_federation][populate][logo][fields][0]", "url");
  params.set("populate[tournament][populate][organizer_federation][populate][logo][fields][1]", "name");
  params.set("populate[event_stages][sort][0]", "order:asc");
  params.set("populate[event_stages][fields][0]", "title");
  params.set("populate[event_stages][fields][1]", "order");
  params.set("populate[event_stages][fields][2]", "is_final");
  params.set("populate[event_stages][fields][3]", "documentId");

  const response = await fetch(`${STRAPI_URL}/api/bt-events/${cleanId}?${params.toString()}`, {
    headers: buildHeaders(),
    cache: IS_DEVELOPMENT ? "no-store" : undefined,
    next: IS_DEVELOPMENT ? undefined : { revalidate: 60 },
  }).catch(() => null);

  if (!response?.ok) return null;

  const json = await response.json().catch(() => null);
  const source =
    json?.data && typeof json.data === "object" && json.data.attributes
      ? { ...json.data.attributes, ...json.data }
      : json?.data;

  if (!source || typeof source !== "object") return null;

  const event = source as Record<string, unknown>;
  const tournamentSource = unwrapEntitySource(event.tournament);
  const tournamentClubSource = unwrapEntitySource(tournamentSource.club);
  const federationSource = unwrapEntitySource(tournamentClubSource.federation);
  const clubLogoSource = unwrapEntitySource(tournamentClubSource.logo);
  const federationLogoSource = unwrapEntitySource(federationSource.logo);
  const organizerFederationSource = unwrapEntitySource(tournamentSource.organizer_federation);
  const organizerFederationLogoSource = unwrapEntitySource(organizerFederationSource.logo);
  const organizerType = readString((tournamentSource as Record<string, unknown>).organizer_type);
  const tournamentStartDate =
    readString((tournamentSource as Record<string, unknown>).startDate) ??
    readString((tournamentSource as Record<string, unknown>).start_date);
  const tournamentEndDate =
    readString((tournamentSource as Record<string, unknown>).endDate) ??
    readString((tournamentSource as Record<string, unknown>).end_date);
  const preferredLogoSource =
    organizerType === "federation"
      ? organizerFederationLogoSource
      : organizerType === "club"
        ? clubLogoSource
        : clubLogoSource;
  const fallbackLogoSource =
    organizerType === "federation"
      ? federationLogoSource
      : organizerFederationLogoSource;
  const organizerLogoSource =
    readString((preferredLogoSource as Record<string, unknown>).url)
      ? preferredLogoSource
      : readString((fallbackLogoSource as Record<string, unknown>).url)
        ? fallbackLogoSource
        : federationLogoSource;
  const stagesRaw = Array.isArray(event.event_stages)
    ? event.event_stages
    : Array.isArray((event.event_stages as { data?: unknown[] } | undefined)?.data)
      ? (event.event_stages as { data?: unknown[] }).data ?? []
      : [];

  return {
    documentId: readString(event.documentId) || cleanId,
    title: readString(event.title) || "Tournament Event",
    season: toNumber(event.season),
    startDate: tournamentStartDate ?? readString(event.start_date),
    endDate: tournamentEndDate ?? readString(event.end_date),
    gameType: readString(event.game_type),
    tournamentTitle: readString((tournamentSource as Record<string, unknown>).title),
    clubDocumentId: readString((tournamentClubSource as Record<string, unknown>).documentId),
    organizerType,
    organizerLogoUrl: readString((organizerLogoSource as Record<string, unknown>).url),
    organizerLogoName: readString((organizerLogoSource as Record<string, unknown>).name),
    stages: stagesRaw.map((stage, index) => normalizeStage(stage, index)),
  };
};

const fetchTournamentEventSummaryBySlug = async (
  slug: string,
): Promise<TournamentEventSummary | null> => {
  const cleanSlug = slugify(String(slug || "").trim());
  if (!cleanSlug) return null;

  const pageSize = 500;
  const maxPages = 20;

  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams();
    params.set("fields[0]", "title");
    params.set("fields[1]", "documentId");
    params.set("fields[2]", "season");
    params.set("pagination[pageSize]", String(pageSize));
    params.set("pagination[page]", String(page));
    params.set("sort[0]", "updatedAt:desc");

    const response = await fetch(`${STRAPI_URL}/api/bt-events?${params.toString()}`, {
      headers: buildHeaders(),
      cache: IS_DEVELOPMENT ? "no-store" : undefined,
      next: IS_DEVELOPMENT ? undefined : { revalidate: 60 },
    }).catch(() => null);

    if (!response?.ok) return null;

    const json = await response.json().catch(() => null);
    const items: unknown[] = Array.isArray(json?.data) ? json.data : [];
    const match = items.find((item: unknown) => {
      const itemRecord = item && typeof item === "object" ? (item as Record<string, unknown>) : null;
      const attributes =
        itemRecord?.attributes && typeof itemRecord.attributes === "object"
          ? (itemRecord.attributes as Record<string, unknown>)
          : null;
      const source =
        attributes
          ? { ...attributes, ...itemRecord }
          : itemRecord;
      const title = readString((source as Record<string, unknown>)?.title);
      const season = toNumber((source as Record<string, unknown>)?.season);
      return title ? buildTournamentSlug("", title, season) === cleanSlug : false;
    });

    if (match) {
      const matchRecord = match && typeof match === "object" ? (match as Record<string, unknown>) : null;
      const matchAttributes =
        matchRecord?.attributes && typeof matchRecord.attributes === "object"
          ? (matchRecord.attributes as Record<string, unknown>)
          : null;
      const documentId = readString(
        matchAttributes?.documentId ?? matchRecord?.documentId,
      );
      return documentId ? fetchTournamentEventSummaryById(documentId) : null;
    }

    if (items.length < pageSize) break;
  }

  return null;
};

export const resolveTournamentEventSummary = async (
  slugOrLegacy: string,
): Promise<TournamentEventSummary | null> => {
  const cleanValue = String(slugOrLegacy || "").trim();
  if (!cleanValue) return null;

  if (cleanValue.includes("--")) {
    return fetchTournamentEventSummaryById(extractTournamentDocumentId(cleanValue));
  }

  const bySlug = await fetchTournamentEventSummaryBySlug(cleanValue);
  if (bySlug) return bySlug;

  return fetchTournamentEventSummaryById(cleanValue);
};

export const getTournamentEventSummary = async (
  documentId: string,
): Promise<TournamentEventSummary | null> => fetchTournamentEventSummaryById(documentId);
