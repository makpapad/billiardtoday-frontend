export type TournamentEventStageSummary = {
  documentId: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  order: number | null;
  isFinal: boolean;
  stageType: string | null;
};

export type TournamentEventSummary = {
  documentId: string;
  source?: "bt_event" | "club_tournament";
  canonicalId?: string | null;
  tournamentSlug: string | null;
  title: string;
  description: string | null;
  season: number | null;
  startDate: string | null;
  endDate: string | null;
  gameType: string | null;
  rulesetKey: string | null;
  tournamentTitle: string | null;
  clubDocumentId: string | null;
  clubName: string | null;
  clubCity: string | null;
  clubCountry: string | null;
  venueName: string | null;
  venueCity: string | null;
  venueCountry: string | null;
  organizerType: string | null;
  organizerLogoUrl: string | null;
  organizerLogoName: string | null;
  category: string | null;
  rankingSeriesDocumentId: string | null;
  rankingSeriesSlug: string | null;
  rankingSeriesTitle: string | null;
  teamTournamentDocumentId: string | null;
  externalLiveTablesHref: string | null;
  stages: TournamentEventStageSummary[];
};

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const PRIMARY_STRAPI_URL =
  process.env.STRAPI_API_URL ||
  (IS_PRODUCTION ? "http://127.0.0.1:1337" : process.env.NEXT_PUBLIC_STRAPI_URL) ||
  "https://app.billiardtoday.com";
const FALLBACK_STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || (IS_PRODUCTION ? "https://app.billiardtoday.com" : undefined);
const STRAPI_URLS = Array.from(
  new Set([PRIMARY_STRAPI_URL, FALLBACK_STRAPI_URL].filter(Boolean)),
) as string[];
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const IS_DEVELOPMENT = !IS_PRODUCTION;

const buildHeaders = (): HeadersInit => {
  if (!STRAPI_API_TOKEN) return {};
  return {
    Authorization: `Bearer ${STRAPI_API_TOKEN}`,
  };
};

const fetchWithOptionalAuth = async (
  path: string,
  options?: { retryWithoutAuth?: boolean; noStore?: boolean },
) => {
  const runtimeOptions =
    IS_DEVELOPMENT || options?.noStore
      ? { cache: "no-store" as const }
      : { next: { revalidate: 60 } };

  for (const baseUrl of STRAPI_URLS) {
    const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const firstResponse = await fetch(url, {
      ...runtimeOptions,
      headers: buildHeaders(),
    }).catch(() => null);

    if (firstResponse?.ok) {
      return firstResponse;
    }

    if (!options?.retryWithoutAuth || !STRAPI_API_TOKEN) {
      if (firstResponse) return firstResponse;
      continue;
    }

    const retryResponse = await fetch(url, runtimeOptions).catch(() => null);
    if (retryResponse?.ok || retryResponse) {
      return retryResponse;
    }
  }

  return null;
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

const readExternalLiveTablesHref = (timetableConfig: unknown): string | null => {
  const config =
    timetableConfig && typeof timetableConfig === "object" && !Array.isArray(timetableConfig)
      ? (timetableConfig as Record<string, unknown>)
      : {};
  const externalResultSync =
    config.externalResultSync &&
    typeof config.externalResultSync === "object" &&
    !Array.isArray(config.externalResultSync)
      ? (config.externalResultSync as Record<string, unknown>)
      : {};
  const liveButton =
    externalResultSync.liveButton &&
    typeof externalResultSync.liveButton === "object" &&
    !Array.isArray(externalResultSync.liveButton)
      ? (externalResultSync.liveButton as Record<string, unknown>)
      : {};

  if (liveButton.enabled !== true) return null;
  const href = readString(liveButton.href);
  if (!href) return null;

  if (href.startsWith("/tournaments/live/soop?")) return href;

  try {
    const parsed = new URL(href);
    if (parsed.hostname === "billiardtoday.com" && parsed.pathname === "/tournaments/live/soop") {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return null;
  }

  return null;
};

const readDateYear = (value: unknown): number | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.getFullYear();
  const match = value.match(/\b(\d{4})\b/);
  return match ? Number(match[1]) : null;
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

const stripTrailingSeasonFromTitle = (
  title: string,
  season?: number | null,
) => {
  const cleanTitle = String(title || "").trim();
  const cleanSeason =
    typeof season === "number" && Number.isFinite(season) ? String(season) : "";

  if (!cleanTitle || !cleanSeason) return cleanTitle;

  return cleanTitle.replace(new RegExp(`(?:[\\s\\-(),/]+)?${cleanSeason}$`), "").trim();
};

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
    startDate: readString(raw.start_date) ?? readString(raw.startDate),
    endDate: readString(raw.end_date) ?? readString(raw.endDate),
    order: toNumber(raw.order),
    isFinal: Boolean(raw.is_final),
    stageType: readString(raw.stage_type) ?? readString(raw.stageType),
  };
};

const readClubRuntimeStages = (tournament: Record<string, unknown>) => {
  const formatDefinition = tournament.format_definition;
  const formatRecord =
    formatDefinition && typeof formatDefinition === "object"
      ? (formatDefinition as Record<string, unknown>)
      : {};
  const runtime =
    formatRecord.clubRuntime && typeof formatRecord.clubRuntime === "object"
      ? (formatRecord.clubRuntime as Record<string, unknown>)
      : {};
  return Array.isArray(runtime.stages) ? runtime.stages : [];
};

const isDraftTournament = (tournament: Record<string, unknown>) => {
  const formatDefinition =
    tournament.format_definition && typeof tournament.format_definition === "object"
      ? (tournament.format_definition as Record<string, unknown>)
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

const normalizeClubTournamentSummary = (
  tournament: Record<string, unknown>,
): TournamentEventSummary | null => {
  const documentId = readString(tournament.documentId);
  if (!documentId) return null;
  if (isDraftTournament(tournament)) return null;

  const clubSource = unwrapEntitySource(tournament.club);
  const clubLogoSource = unwrapEntitySource(clubSource.logo);
  const startDate = readString(tournament.startDate) ?? readString(tournament.start_date);
  const endDate = readString(tournament.endDate) ?? readString(tournament.end_date);
  const title = readString(tournament.title) || "Club tournament";

  return {
    documentId: `club-tournament:${documentId}`,
    source: "club_tournament",
    canonicalId: readString(tournament.slug) || documentId,
    tournamentSlug: readString(tournament.slug),
    title,
    description: readString(tournament.description),
    season: readDateYear(startDate),
    startDate,
    endDate,
    gameType: readString(tournament.game_type),
    rulesetKey: readString(tournament.ruleset_key),
    tournamentTitle: title,
    clubDocumentId: readString(clubSource.documentId),
    clubName:
      readString(clubSource.name) ??
      readString(clubSource.title),
    clubCity: readString(clubSource.city),
    clubCountry: readString(clubSource.country),
    venueName: null,
    venueCity: null,
    venueCountry: null,
    organizerType: "club",
    organizerLogoUrl: readString(clubLogoSource.url),
    organizerLogoName: readString(clubLogoSource.name),
    category: readString(tournament.category),
    rankingSeriesDocumentId: null,
    rankingSeriesSlug: null,
    rankingSeriesTitle: null,
    teamTournamentDocumentId: null,
    externalLiveTablesHref: null,
    stages: readClubRuntimeStages(tournament).map((stage, index) =>
      normalizeStage(stage, index),
    ),
  };
};

const fetchClubTournamentSummaryBySlug = async (
  tournamentSlug: string,
): Promise<TournamentEventSummary | null> => {
  const cleanSlug = slugify(String(tournamentSlug || "").trim());
  if (!cleanSlug) return null;

  const params = new URLSearchParams();
  params.set("pagination[limit]", "1");
  params.set("filters[slug][$eq]", cleanSlug);
  params.set("fields[0]", "documentId");
  params.set("fields[1]", "title");
  params.set("fields[2]", "slug");
  params.set("fields[3]", "startDate");
  params.set("fields[4]", "endDate");
  params.set("fields[5]", "game_type");
  params.set("fields[6]", "description");
  params.set("fields[7]", "category");
  params.set("fields[8]", "format_definition");
  params.set("populate[club][fields][0]", "documentId");
  params.set("populate[club][fields][1]", "name");
  params.set("populate[club][fields][2]", "city");
  params.set("populate[club][fields][3]", "country");
  params.set("populate[club][populate][logo][fields][0]", "url");
  params.set("populate[club][populate][logo][fields][1]", "name");

  const response = await fetchWithOptionalAuth(
    `/api/tournaments?${params.toString()}`,
    { retryWithoutAuth: true },
  );
  if (!response?.ok) return null;

  const json = await response.json().catch(() => null);
  const first = Array.isArray(json?.data) ? json.data[0] : null;
  const source = unwrapEntitySource(first);
  return normalizeClubTournamentSummary(source);
};

export const buildTournamentSlug = (
  canonicalId: string,
  title: string,
  season?: number | null,
) => {
  const safeCanonicalId = slugify(String(canonicalId || "").trim());
  const normalizedTitle = stripTrailingSeasonFromTitle(title, season);
  const safeTitle = slugify(normalizedTitle || String(title || "").trim()) || "event";
  const safeSeason =
    typeof season === "number" && Number.isFinite(season) ? String(season) : "";
  const readableSlug = safeSeason ? `${safeTitle}-${safeSeason}` : safeTitle;
  return safeCanonicalId ? `${safeCanonicalId}--${readableSlug}` : readableSlug;
};

const buildLegacyTournamentSlug = (
  canonicalId: string,
  title: string,
  season?: number | null,
) => {
  const safeCanonicalId = slugify(String(canonicalId || "").trim());
  const safeTitle = slugify(String(title || "").trim()) || "event";
  const safeSeason =
    typeof season === "number" && Number.isFinite(season) ? String(season) : "";
  const readableSlug = safeSeason ? `${safeTitle}-${safeSeason}` : safeTitle;
  return safeCanonicalId ? `${safeCanonicalId}--${readableSlug}` : readableSlug;
};

export const buildTournamentHref = (
  canonicalId: string,
  title: string,
  season?: number | null,
  embedded = false,
) => `${embedded ? "/embed" : ""}/tournaments/${buildTournamentSlug(canonicalId, title, season)}`;

export const extractTournamentDocumentId = (slug: string) =>
  String(slug || "").split("--")[0]?.trim() || "";

const matchesTournamentSlug = (
  slug: string,
  title: string,
  season?: number | null,
) => {
  const cleanSlug = slugify(String(slug || "").trim());
  if (!cleanSlug) return false;

  return (
    buildTournamentSlug("", title, season) === cleanSlug ||
    buildLegacyTournamentSlug("", title, season) === cleanSlug
  );
};

const fetchTournamentEventSummaryByTournamentSlug = async (
  tournamentSlug: string,
): Promise<TournamentEventSummary | null> => {
  const cleanSlug = slugify(String(tournamentSlug || "").trim());
  if (!cleanSlug) return null;

  const params = new URLSearchParams();
  params.set("fields[0]", "documentId");
  params.set("pagination[limit]", "1");
  params.set("filters[tournament][slug][$eq]", cleanSlug);

  const response = await fetchWithOptionalAuth(
    `/api/bt-events?${params.toString()}`,
    { retryWithoutAuth: true },
  );

  if (!response?.ok) return null;

  const json = await response.json().catch(() => null);
  const first = Array.isArray(json?.data) ? json.data[0] : null;
  const source =
    first && typeof first === "object" && "attributes" in (first as Record<string, unknown>)
      ? {
          ...(((first as { attributes?: Record<string, unknown> }).attributes ?? {})),
          ...(first as Record<string, unknown>),
        }
      : (first as Record<string, unknown> | null);
  const documentId = readString(source?.documentId);
  return documentId
    ? fetchTournamentEventSummaryById(documentId)
    : fetchClubTournamentSummaryBySlug(cleanSlug);
};

const fetchTournamentEventSummaryById = async (
  documentId: string,
): Promise<TournamentEventSummary | null> => {
  const cleanId = String(documentId || "").trim();
  if (!cleanId) return null;

  const buildParams = (mode: "full" | "safe") => {
    const params = new URLSearchParams();
    params.set("fields[0]", "title");
    params.set("fields[1]", "season");
    params.set("fields[2]", "start_date");
    params.set("fields[3]", "end_date");
    params.set("fields[4]", "game_type");
    params.set("fields[5]", "documentId");
    params.set("fields[6]", "ruleset_key");
    params.set("fields[7]", "ruleset_config");
    params.set("fields[8]", "timetable_config");
    params.set("populate[event_stages][sort][0]", "order:asc");
    params.set("populate[event_stages][fields][0]", "title");
    params.set("populate[event_stages][fields][1]", "order");
    params.set("populate[event_stages][fields][2]", "is_final");
    params.set("populate[event_stages][fields][3]", "documentId");
    params.set("populate[event_stages][fields][4]", "ruleset_key");
    params.set("populate[event_stages][fields][5]", "ruleset_config");
    params.set("populate[event_stages][fields][6]", "start_date");
    params.set("populate[event_stages][fields][7]", "end_date");
    params.set("populate[event_stages][fields][8]", "stage_type");

    if (mode === "full") {
      params.set("populate[tournament][fields][0]", "title");
      params.set("populate[tournament][fields][1]", "organizer_type");
      params.set("populate[tournament][fields][2]", "startDate");
      params.set("populate[tournament][fields][3]", "endDate");
      params.set("populate[tournament][fields][4]", "description");
      params.set("populate[tournament][fields][5]", "category");
      params.set("populate[tournament][fields][6]", "slug");
      params.set("populate[tournament][fields][7]", "ruleset_key");
      params.set("populate[tournament][fields][8]", "ruleset_config");
      params.set("populate[tournament][fields][9]", "format_definition");
      params.set("populate[tournament][populate][venue][fields][0]", "name");
      params.set("populate[tournament][populate][venue][fields][1]", "city");
      params.set("populate[tournament][populate][venue][fields][2]", "country");
      params.set("populate[tournament][populate][club][fields][1]", "name");
      params.set("populate[tournament][populate][club][fields][2]", "city");
      params.set("populate[tournament][populate][club][fields][3]", "country");
      params.set("populate[tournament][populate][club][fields][0]", "documentId");
      params.set("populate[tournament][populate][club][populate][logo][fields][0]", "url");
      params.set("populate[tournament][populate][club][populate][logo][fields][1]", "name");
      params.set("populate[tournament][populate][club][populate][federation][fields][0]", "name");
      params.set("populate[tournament][populate][club][populate][federation][populate][logo][fields][0]", "url");
      params.set("populate[tournament][populate][club][populate][federation][populate][logo][fields][1]", "name");
      params.set("populate[tournament][populate][organizer_federation][fields][0]", "name");
      params.set("populate[tournament][populate][organizer_federation][populate][logo][fields][0]", "url");
      params.set("populate[tournament][populate][organizer_federation][populate][logo][fields][1]", "name");
      params.set("populate[tournament][populate][series_entries][sort][0]", "order:asc");
      params.set("populate[tournament][populate][series_entries][fields][0]", "order");
      params.set("populate[tournament][populate][series_entries][fields][1]", "documentId");
      params.set("populate[tournament][populate][series_entries][populate][series][fields][0]", "documentId");
      params.set("populate[tournament][populate][series_entries][populate][series][fields][1]", "slug");
      params.set("populate[tournament][populate][series_entries][populate][series][fields][2]", "title");
      params.set("populate[tournament][populate][team_tournament][fields][0]", "documentId");
    }

    return params;
  };

  let response = await fetchWithOptionalAuth(
    `/api/bt-events/${cleanId}?${buildParams("full").toString()}`,
    { retryWithoutAuth: true, noStore: true },
  );

  if (!response?.ok) {
    response = await fetchWithOptionalAuth(
      `/api/bt-events/${cleanId}?${buildParams("safe").toString()}`,
      { retryWithoutAuth: true, noStore: true },
    );
  }

  if (!response?.ok) return null;

  const json = await response.json().catch(() => null);
  const source =
    json?.data && typeof json.data === "object" && json.data.attributes
      ? { ...json.data.attributes, ...json.data }
      : json?.data;

  if (!source || typeof source !== "object") return null;

  const event = source as Record<string, unknown>;
  const externalLiveTablesHref = readExternalLiveTablesHref(event.timetable_config);
  const tournamentSource = unwrapEntitySource(event.tournament);
  if (isDraftTournament(tournamentSource)) return null;
  const tournamentClubSource = unwrapEntitySource(tournamentSource.club);
  const venueSource = unwrapEntitySource(tournamentSource.venue);
  const federationSource = unwrapEntitySource(tournamentClubSource.federation);
  const clubLogoSource = unwrapEntitySource(tournamentClubSource.logo);
  const federationLogoSource = unwrapEntitySource(federationSource.logo);
  const organizerFederationSource = unwrapEntitySource(tournamentSource.organizer_federation);
  const organizerFederationLogoSource = unwrapEntitySource(organizerFederationSource.logo);
  const seriesEntries = Array.isArray((tournamentSource as Record<string, unknown>).series_entries)
    ? ((tournamentSource as Record<string, unknown>).series_entries as unknown[])
    : Array.isArray(
          ((tournamentSource as Record<string, unknown>).series_entries as { data?: unknown[] } | undefined)
            ?.data,
        )
      ? (((tournamentSource as Record<string, unknown>).series_entries as { data?: unknown[] }).data ?? [])
      : [];
  const firstSeriesEntry = unwrapEntitySource(seriesEntries[0]);
  const rankingSeriesSource = unwrapEntitySource(firstSeriesEntry.series);
  const teamTournamentSource = unwrapEntitySource(
    (tournamentSource as Record<string, unknown>).team_tournament,
  );
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
    source: "bt_event",
    canonicalId: null,
    tournamentSlug: readString((tournamentSource as Record<string, unknown>).slug),
    title: readString(event.title) || "Tournament Event",
    description: readString((tournamentSource as Record<string, unknown>).description),
    season: toNumber(event.season),
    startDate: tournamentStartDate ?? readString(event.start_date),
    endDate: tournamentEndDate ?? readString(event.end_date),
    gameType: readString(event.game_type),
    rulesetKey: readString(event.ruleset_key),
    tournamentTitle: readString((tournamentSource as Record<string, unknown>).title),
    clubDocumentId: readString((tournamentClubSource as Record<string, unknown>).documentId),
    clubName:
      readString((tournamentClubSource as Record<string, unknown>).name) ??
      readString((tournamentClubSource as Record<string, unknown>).title),
    clubCity: readString((tournamentClubSource as Record<string, unknown>).city),
    clubCountry: readString((tournamentClubSource as Record<string, unknown>).country),
    venueName: readString((venueSource as Record<string, unknown>).name),
    venueCity: readString((venueSource as Record<string, unknown>).city),
    venueCountry: readString((venueSource as Record<string, unknown>).country),
    organizerType,
    organizerLogoUrl: readString((organizerLogoSource as Record<string, unknown>).url),
    organizerLogoName: readString((organizerLogoSource as Record<string, unknown>).name),
    category: readString((tournamentSource as Record<string, unknown>).category),
    rankingSeriesDocumentId: readString((rankingSeriesSource as Record<string, unknown>).documentId),
    rankingSeriesSlug: readString((rankingSeriesSource as Record<string, unknown>).slug),
    rankingSeriesTitle: readString((rankingSeriesSource as Record<string, unknown>).title),
    teamTournamentDocumentId: readString(
      (teamTournamentSource as Record<string, unknown>).documentId,
    ),
    externalLiveTablesHref,
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

    const response = await fetchWithOptionalAuth(
      `/api/bt-events?${params.toString()}`,
      { retryWithoutAuth: true },
    );

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
      return title ? matchesTournamentSlug(cleanSlug, title, season) : false;
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
    const canonicalId = extractTournamentDocumentId(cleanValue);
    const byEventId = await fetchTournamentEventSummaryById(canonicalId);
    if (byEventId) return byEventId;
    return fetchTournamentEventSummaryByTournamentSlug(canonicalId);
  }

  const bySlug = await fetchTournamentEventSummaryBySlug(cleanValue);
  if (bySlug) return bySlug;

  const byTournamentSlug = await fetchTournamentEventSummaryByTournamentSlug(cleanValue);
  if (byTournamentSlug) return byTournamentSlug;

  const byClubTournamentSlug = await fetchClubTournamentSummaryBySlug(cleanValue);
  if (byClubTournamentSlug) return byClubTournamentSlug;

  return fetchTournamentEventSummaryById(cleanValue);
};

export const getTournamentEventSummary = async (
  documentId: string,
): Promise<TournamentEventSummary | null> => fetchTournamentEventSummaryById(documentId);
