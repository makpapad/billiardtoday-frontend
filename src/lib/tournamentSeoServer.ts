import { getServerEnv } from "@/lib/serverEnv";
import { buildPlayerHref } from "@/lib/publicSiteData";

/**
 * Server-side δεδομένα διοργάνωσης για SEO.
 *
 * Η σελίδα διοργάνωσης έβγαινε με ~1.600 χαρακτήρες κειμένου και ΜΗΔΕΝ links:
 * συμμετέχοντες, τελική κατάταξη, όμιλοι και αποτελέσματα φόρτωναν όλα με
 * JavaScript, οπότε ο crawler έβλεπε μια σχεδόν άδεια σελίδα.
 *
 * Παίρνουμε μόνο τα δύο πιο χρήσιμα κομμάτια (συμμετέχοντες + τελική κατάταξη)
 * με ένα ελαφρύ query — όχι το πλήρες payload των ~8 MB που φορτώνει η client
 * σελίδα — και τα αποδίδουμε server-side.
 */

const IS_PRODUCTION = (getServerEnv("NODE_ENV") || process.env.NODE_ENV) === "production";

const STRAPI_BASES = Array.from(
  new Set(
    [
      getServerEnv("STRAPI_API_URL") || (IS_PRODUCTION ? "http://127.0.0.1:1337" : undefined),
      getServerEnv("NEXT_PUBLIC_STRAPI_URL"),
      "https://app.billiardtoday.com",
    ].filter((value): value is string => Boolean(value && value.trim())),
  ),
);

const STRAPI_API_TOKEN = getServerEnv("STRAPI_API_TOKEN");

const SEO_FETCH_TIMEOUT_MS = 3000;
// 1 απόπειρα: στο production το base[0] ΕΙΝΑΙ το ίδιο Strapi στο 127.0.0.1 — μια
// δεύτερη απόπειρα στο fallback διπλασιάζει την αναμονή χωρίς να δίνει δεδομένα.
const SEO_MAX_ATTEMPTS = 1;

export type TournamentSeoPlayer = {
  id: number | null;
  documentId: string;
  name: string;
  nameEn: string | null;
  country: string | null;
  seed: number | null;
  ranking: number | null;
  href: string;
};

export type TournamentSeoStanding = {
  key: string;
  position: string | null;
  player: TournamentSeoPlayer | null;
  points: number | null;
  matchPoints: number | null;
  innings: number | null;
  highRun: number | null;
  bestAverage: number | null;
};

export type TournamentSeoData = {
  title: string;
  season: number | null;
  startDate: string | null;
  endDate: string | null;
  gameType: string | null;
  participants: TournamentSeoPlayer[];
  standings: TournamentSeoStanding[];
};

const readString = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
};

const readNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return null;
};

const readRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const toArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(readRecord(item)));
  const record = readRecord(value);
  if (record && Array.isArray(record.data)) {
    return record.data.filter((item): item is Record<string, unknown> => Boolean(readRecord(item)));
  }
  if (record) return [record];
  return [];
};

const mapPlayer = (entity: Record<string, unknown> | null): TournamentSeoPlayer | null => {
  if (!entity) return null;
  const name = readString(entity.full_name) || readString(entity.full_name_en);
  if (!name) return null;
  const id = readNumber(entity.id);
  return {
    id,
    documentId: readString(entity.documentId) || String(entity.id ?? name),
    name,
    nameEn: readString(entity.full_name_en),
    country: readString(entity.country),
    seed: readNumber(entity.seed),
    ranking: readNumber(entity.ranking),
    href: buildPlayerHref(id, name),
  };
};

export type TournamentSeoMatch = {
  key: string;
  label: string | null;
  group: string | null;
  player1: TournamentSeoPlayer | null;
  player2: TournamentSeoPlayer | null;
  player1Fallback: string | null;
  player2Fallback: string | null;
  player1Points: number | null;
  player2Points: number | null;
  player1Innings: number | null;
  player2Innings: number | null;
  player1MatchPoints: number | null;
  player2MatchPoints: number | null;
  player1HighRun: number | null;
  player2HighRun: number | null;
};

export type TournamentSeoStage = {
  key: string;
  title: string;
  order: number | null;
  matches: TournamentSeoMatch[];
};

/**
 * Οι αγώνες κάθε φάσης, για server-rendered απόδοση.
 *
 * ΓΙΑΤΙ: οι καρτέλες MATCHES/RANKING της σελίδας διοργάνωσης ζωγραφίζονται με κλικ,
 * οπότε στο HTML δεν υπήρχε ούτε ένα αποτέλεσμα (μετρημένο 02/11/2026: 0 πίνακες,
 * 989 χαρακτήρες ορατού κειμένου). Ο crawler έβλεπε τον τίτλο και τη σύνοψη.
 *
 * ΓΙΑΤΙ ΞΕΧΩΡΙΣΤΗ ΣΥΝΑΡΤΗΣΗ: το πλήρες `/event-data/` είναι 3 MB (48 όμιλοι ×
 * ολόκληρη η εγγραφή αθλητή). Εδώ ζητάμε ΜΟΝΟ τα πεδία του αγώνα + όνομα/χώρα των
 * δύο αθλητών. Τρέχει παράλληλα με το `getTournamentSeoData` (Promise.all), οπότε
 * δεν προσθέτει χρόνο, και έχει δικό του try/catch: αν σκάσει, η σελίδα χάνει μόνο
 * τους πίνακες αγώνων, όχι τους συμμετέχοντες και την κατάταξη.
 */
export const getTournamentSeoStages = async (
  eventDocumentId: string,
  options?: { matchesPerStage?: number },
): Promise<TournamentSeoStage[]> => {
  const documentId = String(eventDocumentId || "").trim();
  if (!documentId) return [];

  const params = new URLSearchParams();
  params.set("fields[0]", "documentId");
  params.set("populate[event_stages][sort][0]", "order:asc");
  params.set("populate[event_stages][fields][0]", "title");
  params.set("populate[event_stages][fields][1]", "order");
  params.set("populate[event_stages][fields][2]", "stage_type");
  params.set("populate[event_stages][fields][3]", "documentId");
  // ΣΕΙΡΑ ΠΙΝΑΚΑ: πρώτα ΟΜΙΛΟΣ, μετά αγώνας μέσα στον όμιλο. Με μόνο `match_number` όλοι οι «1οι»
  // αγώνες όλων των ομίλων εμφανίζονταν μαζί (1,1,1…, 2,2,2…, 3,3,3…) — ο πίνακας φαινόταν ανάποδα.
  params.set("populate[event_stages][populate][groups][sort][0]", "number:asc");
  params.set("populate[event_stages][populate][groups][sort][1]", "match_number:asc");
  const groupFields = [
    "match_number",
    "group_label",
    "player1_points",
    "player2_points",
    "player1_innings",
    "player2_innings",
    "player1_match_points",
    "player2_match_points",
    "player1_high_run",
    "player2_high_run",
    "player1_local_name",
    "player2_local_name",
    "ff_type_player1",
    "ff_type_player2",
    "documentId",
  ];
  groupFields.forEach((field, index) => {
    params.set(`populate[event_stages][populate][groups][fields][${index}]`, field);
  });
  for (const side of ["player1", "player2"]) {
    const key = `populate[event_stages][populate][groups][populate][${side}][fields]`;
    params.set(`${key}[0]`, "full_name");
    params.set(`${key}[1]`, "full_name_en");
    params.set(`${key}[2]`, "country");
    params.set(`${key}[3]`, "documentId");
  }

  const headers: HeadersInit = STRAPI_API_TOKEN
    ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` }
    : {};

  const matchesPerStage = options?.matchesPerStage ?? 200;

  for (const base of STRAPI_BASES.slice(0, SEO_MAX_ATTEMPTS)) {
    try {
      const response = await fetch(
        `${base.replace(/\/$/, "")}/api/bt-events/${encodeURIComponent(documentId)}?${params.toString()}`,
        {
          headers,
          next: { revalidate: 300 },
          signal: AbortSignal.timeout(SEO_FETCH_TIMEOUT_MS),
        },
      );
      if (!response.ok) continue;

      const payload = (await response.json().catch(() => null)) as { data?: unknown } | null;
      const entity = readRecord(payload?.data);
      if (!entity) continue;

      const stages: TournamentSeoStage[] = [];
      for (const rawStage of toArray(entity.event_stages)) {
        const rawMatches = toArray(rawStage.groups).slice(0, matchesPerStage);
        if (rawMatches.length === 0) continue;

        const matches: TournamentSeoMatch[] = rawMatches.map((raw, index) => {
          const player1 = mapPlayer(readRecord(raw.player1));
          const player2 = mapPlayer(readRecord(raw.player2));
          const label = readNumber(raw.match_number) !== null ? String(raw.match_number) : null;
          return {
            key: readString(raw.documentId) || `${index}`,
            label,
            group: readString(raw.group_label),
            player1,
            player2,
            // Όταν η θέση είναι placeholder («Winner of match 12»), το όνομα υπάρχει
            // μόνο στα local_name πεδία — χωρίς αυτά η γραμμή θα έβγαινε «- vs -».
            player1Fallback: readString(raw.player1_local_name) || readString(raw.ff_type_player1),
            player2Fallback: readString(raw.player2_local_name) || readString(raw.ff_type_player2),
            player1Points: readNumber(raw.player1_points),
            player2Points: readNumber(raw.player2_points),
            player1Innings: readNumber(raw.player1_innings),
            player2Innings: readNumber(raw.player2_innings),
            player1MatchPoints: readNumber(raw.player1_match_points),
            player2MatchPoints: readNumber(raw.player2_match_points),
            player1HighRun: readNumber(raw.player1_high_run),
            player2HighRun: readNumber(raw.player2_high_run),
          };
        });

        stages.push({
          key: readString(rawStage.documentId) || readString(rawStage.title) || `stage-${stages.length}`,
          title: readString(rawStage.title) || `Stage ${stages.length + 1}`,
          order: readNumber(rawStage.order),
          matches,
        });
      }

      return stages;
    } catch {
      // δοκίμασε το επόμενο base url
    }
  }

  return [];
};

export const getTournamentSeoData = async (
  eventDocumentId: string,
  options?: { standingsLimit?: number; participantLimit?: number },
): Promise<TournamentSeoData | null> => {
  const documentId = String(eventDocumentId || "").trim();
  if (!documentId) return null;

  const params = new URLSearchParams();
  params.set("fields[0]", "title");
  params.set("fields[1]", "season");
  params.set("fields[2]", "start_date");
  params.set("fields[3]", "end_date");
  params.set("fields[4]", "game_type");
  params.set("fields[5]", "documentId");
  // Ελαφρύ populate: χωρίς αυτό το Strapi επιστρέφει και τα βαριά json πεδία του
  // tournament (format_definition/config), που αργούν να σειριοποιηθούν.
  params.set("populate[tournament][fields][0]", "documentId");
  params.set("populate[tournament][fields][1]", "title");
  params.set("populate[tournament][fields][2]", "slug");
  params.set("populate[tournament][populate][participants][sort][0]", "ranking:asc");
  params.set("populate[tournament][populate][participants][fields][0]", "ranking");
  params.set("populate[tournament][populate][participants][fields][1]", "seed");
  params.set("populate[tournament][populate][participants][fields][2]", "participant_status");
  params.set("populate[tournament][populate][participants][populate][player][fields][0]", "full_name");
  params.set("populate[tournament][populate][participants][populate][player][fields][1]", "full_name_en");
  params.set("populate[tournament][populate][participants][populate][player][fields][2]", "country");
  params.set("populate[results_final][sort][0]", "position:asc");
  params.set("populate[results_final][fields][0]", "position");
  params.set("populate[results_final][fields][1]", "points");
  params.set("populate[results_final][fields][2]", "match_points");
  params.set("populate[results_final][fields][3]", "innings");
  params.set("populate[results_final][fields][4]", "high_run");
  params.set("populate[results_final][fields][5]", "best_average");
  params.set("populate[results_final][fields][6]", "documentId");
  params.set("populate[results_final][populate][player][fields][0]", "full_name");
  params.set("populate[results_final][populate][player][fields][1]", "full_name_en");
  params.set("populate[results_final][populate][player][fields][2]", "country");

  const headers: HeadersInit = STRAPI_API_TOKEN
    ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` }
    : {};

  // ΠΑΓΙΔΑ (φορτίο): η συνάρτηση καλείται σε ΚΑΘΕ render σελίδας διοργάνωσης. Με 3
  // base URLs × 15s timeout μια αργή απάντηση κρατούσε τη σελίδα 45s και την έβγαζε
  // 504. Κρατάμε το πολύ SEO_MAX_ATTEMPTS απόπειρες με 3s timeout (μέγιστο ~6s).
  for (const base of STRAPI_BASES.slice(0, SEO_MAX_ATTEMPTS)) {
    try {
      const response = await fetch(
        `${base.replace(/\/$/, "")}/api/bt-events/${encodeURIComponent(documentId)}?${params.toString()}`,
        {
          headers,
          next: { revalidate: 300 },
          signal: AbortSignal.timeout(SEO_FETCH_TIMEOUT_MS),
        },
      );
      if (!response.ok) continue;

      const payload = (await response.json().catch(() => null)) as { data?: unknown } | null;
      const entity = readRecord(payload?.data);
      if (!entity) continue;

      const participantLimit = options?.participantLimit ?? 220;
      const standingsLimit = options?.standingsLimit ?? 40;

      // Οι συμμετέχοντες κρέμονται από το tournament (participants[].player), όχι από το event.
      const participantsMap = new Map<string, TournamentSeoPlayer>();
      for (const raw of toArray(readRecord(entity.tournament)?.participants)) {
        const player = mapPlayer(readRecord(raw.player));
        if (player && !participantsMap.has(player.documentId)) participantsMap.set(player.documentId, player);
      }

      const standings: TournamentSeoStanding[] = [];
      for (const raw of toArray(entity.results_final).slice(0, standingsLimit)) {
        const player = mapPlayer(readRecord(raw.player));
        const position = raw.position !== undefined && raw.position !== null ? String(raw.position) : null;
        const hasNumbers =
          readNumber(raw.points) !== null ||
          readNumber(raw.match_points) !== null ||
          readNumber(raw.best_average) !== null;
        if (!player && !position && !hasNumbers) continue;
        standings.push({
          key: `${position ?? "x"}-${player?.documentId ?? standings.length}`,
          position,
          player,
          points: readNumber(raw.points),
          matchPoints: readNumber(raw.match_points),
          innings: readNumber(raw.innings),
          highRun: readNumber(raw.high_run),
          bestAverage: readNumber(raw.best_average),
        });
      }

      const participants = [...participantsMap.values()]
        .sort((left, right) => left.name.localeCompare(right.name, "en"))
        .slice(0, participantLimit);

      return {
        title: readString(entity.title) || "Tournament",
        season: readNumber(entity.season),
        startDate: readString(entity.start_date),
        endDate: readString(entity.end_date),
        gameType: readString(entity.game_type),
        participants,
        standings,
      };
    } catch {
      // δοκίμασε το επόμενο base url
    }
  }

  return null;
};
