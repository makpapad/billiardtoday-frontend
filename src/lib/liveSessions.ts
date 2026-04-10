import { API_URL } from "@/lib/api";

type UnknownRecord = Record<string, any>;

type ClubIdentity = {
  id: string;
  documentId: string | null;
  slug: string | null;
};

const buildHeaders = () => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = process.env.STRAPI_API_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

export function unwrapStrapiNode(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object") return null;
  const input = value as UnknownRecord;
  if (input.data) return unwrapStrapiNode(input.data);
  if (input.attributes) return unwrapStrapiNode(input.attributes);
  return input;
}

export function normalizeMediaUrl(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith("/")) return `${API_URL}${trimmed}`;
    return `${API_URL}/${trimmed}`;
  }

  const node = unwrapStrapiNode(value);
  const direct = typeof node?.url === "string" ? node.url.trim() : "";
  if (!direct) return null;
  return normalizeMediaUrl(direct);
}

export async function parseJsonSafe(response: Response) {
  const text = await response.text();
  if (!text) return { data: [] };
  try {
    return JSON.parse(text);
  } catch {
    return { data: [] };
  }
}

export async function fetchWithTlsFallback(url: string, init: RequestInit) {
  try {
    return await fetch(url, init);
  } catch (error: any) {
    const code = error?.cause?.code ?? error?.code;
    if (url.startsWith("https://") && code === "CERT_HAS_EXPIRED") {
      const insecureUrl = `http://${url.slice("https://".length)}`;
      return fetch(insecureUrl, { ...init, redirect: "manual" });
    }
    throw error;
  }
}

export async function resolveClubIdentity(identifier: string): Promise<ClubIdentity | null> {
  const clean = identifier.trim();
  if (!clean) return null;

  const params = new URLSearchParams();
  let index = 0;
  params.set(`filters[$or][${index}][slug][$eq]`, clean);
  index += 1;
  params.set(`filters[$or][${index}][documentId][$eq]`, clean);
  index += 1;
  if (/^\d+$/.test(clean)) {
    params.set(`filters[$or][${index}][id][$eq]`, clean);
    index += 1;
  }
  params.set("pagination[pageSize]", "1");
  params.set("fields[0]", "slug");
  params.set("fields[1]", "documentId");

  const response = await fetchWithTlsFallback(`${API_URL}/api/clubs?${params.toString()}`, {
    cache: "no-store",
    headers: buildHeaders(),
  });
  if (!response.ok) return null;

  const json = await parseJsonSafe(response);
  const row = Array.isArray(json?.data) ? json.data[0] : null;
  if (!row) return null;

  return {
    id: String(row.id || ""),
    documentId: typeof row.documentId === "string" ? row.documentId : null,
    slug: typeof row.slug === "string" ? row.slug : null,
  };
}

export function matchesClub(row: UnknownRecord, club: ClubIdentity) {
  const attrs = unwrapStrapiNode(row?.attributes) || row;
  const clubNode = unwrapStrapiNode(attrs?.club) || attrs?.club || {};
  const candidates = [
    row?.id,
    row?.documentId,
    attrs?.clubId,
    clubNode?.id,
    clubNode?.documentId,
    clubNode?.slug,
  ]
    .filter(Boolean)
    .map((value) => String(value));

  return [club.id, club.documentId, club.slug].filter(Boolean).some((value) => candidates.includes(String(value)));
}

function readPositiveNumber(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : null;
}

function readPreferredPlayerName(player: UnknownRecord | null | undefined, fallback?: unknown): string | null {
  const fullNameEn =
    typeof player?.full_name_en === "string"
      ? player.full_name_en.trim()
      : typeof player?.fullNameEn === "string"
        ? player.fullNameEn.trim()
        : "";
  if (fullNameEn) return fullNameEn;

  const fullName =
    typeof player?.full_name === "string"
      ? player.full_name.trim()
      : typeof player?.fullName === "string"
        ? player.fullName.trim()
        : "";
  if (fullName) return fullName;

  const plainName = typeof player?.name === "string" ? player.name.trim() : "";
  if (plainName) return plainName;

  return typeof fallback === "string" && fallback.trim() ? fallback.trim() : null;
}

function extractTargetPointsFromSource(source: unknown): number | null {
  if (!source) return null;

  if (typeof source === "string") {
    try {
      return extractTargetPointsFromSource(JSON.parse(source));
    } catch {
      return null;
    }
  }

  if (Array.isArray(source)) {
    for (const item of source) {
      const found = extractTargetPointsFromSource(item);
      if (found !== null) return found;
    }
    return null;
  }

  const node = unwrapStrapiNode(source);
  if (!node) return null;

  const direct =
    readPositiveNumber(node.targetPoints) ??
    readPositiveNumber(node.target_points) ??
    readPositiveNumber(node.targetPoint) ??
    readPositiveNumber(node.target) ??
    readPositiveNumber(node.pointsToWin) ??
    readPositiveNumber(node.goalPoints) ??
    readPositiveNumber(node.equalInningPoints) ??
    readPositiveNumber(node.equal_inning_points) ??
    readPositiveNumber(node.targetP1) ??
    readPositiveNumber(node.targetP2) ??
    readPositiveNumber(node.targetPointsP1) ??
    readPositiveNumber(node.targetPointsP2);
  if (direct !== null) return direct;

  return null;
}

function extractInningsDetail(source: unknown) {
  const resolve = (
    value: unknown,
  ):
    | Array<{
        inning: number;
        player1?: { pt: number; tot: number };
        player2?: { pt: number; tot: number };
      }>
    | undefined => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value as Array<{
      inning: number;
      player1?: { pt: number; tot: number };
      player2?: { pt: number; tot: number };
    }>;
    const node = unwrapStrapiNode(value);
    if (Array.isArray(node?.inningsDetail)) {
      return node.inningsDetail as Array<{
        inning: number;
        player1?: { pt: number; tot: number };
        player2?: { pt: number; tot: number };
      }>;
    }
    if (typeof value === "string") {
      try {
        return resolve(JSON.parse(value));
      } catch {
        return undefined;
      }
    }
    return undefined;
  };

  const node = unwrapStrapiNode(source) || source;
  return (
    resolve(node) ||
    resolve((node as UnknownRecord)?.matchSheet) ||
    resolve((node as UnknownRecord)?.matchSheetJson) ||
    resolve((node as UnknownRecord)?.match_sheet) ||
    undefined
  );
}

export function normalizeLiveSessionRow(row: UnknownRecord) {
  const attrs = unwrapStrapiNode(row?.attributes) || row;
  const club = unwrapStrapiNode(attrs?.club) || {};
  const players = Array.isArray(attrs?.players) ? attrs.players : [];
  const playerA = players[0] || {};
  const playerB = players[1] || {};
  const sessionId = String(row?.documentId || row?.id || attrs?.documentId || attrs?.id || "");
  const inningsA = Number(playerA?.innings ?? attrs?.inningsA ?? attrs?.innings ?? 0);
  const inningsB = Number(playerB?.innings ?? attrs?.inningsB ?? attrs?.innings ?? 0);
  const targetA =
    readPositiveNumber(playerA?.targetPoints) ??
    readPositiveNumber(playerA?.target_points) ??
    readPositiveNumber(attrs?.targetPointsP1) ??
    readPositiveNumber(attrs?.target_points_p1) ??
    readPositiveNumber(attrs?.targetPoints) ??
    readPositiveNumber(attrs?.target_points) ??
    readPositiveNumber(attrs?.targetP1) ??
    extractTargetPointsFromSource(attrs?.matchSheet) ??
    extractTargetPointsFromSource(attrs?.matchSheetJson) ??
    extractTargetPointsFromSource(attrs?.sheet);
  const targetB =
    readPositiveNumber(playerB?.targetPoints) ??
    readPositiveNumber(playerB?.target_points) ??
    readPositiveNumber(attrs?.targetPointsP2) ??
    readPositiveNumber(attrs?.target_points_p2) ??
    readPositiveNumber(attrs?.targetPoints) ??
    readPositiveNumber(attrs?.target_points) ??
    readPositiveNumber(attrs?.targetP2) ??
    extractTargetPointsFromSource(attrs?.matchSheet) ??
    extractTargetPointsFromSource(attrs?.matchSheetJson) ??
    extractTargetPointsFromSource(attrs?.sheet);

  return {
    id: sessionId,
    sessionId,
    screenId: attrs?.screenIdentifier ?? null,
    updatedAt: attrs?.updatedAt ?? row?.updatedAt ?? null,
    clubId: club?.documentId ?? club?.id ?? attrs?.clubId ?? null,
    clubName: club?.name ?? attrs?.clubName ?? null,
    clubCity: club?.city ?? attrs?.clubCity ?? null,
    clubFederationName: club?.federation?.name ?? attrs?.clubFederationName ?? null,
    state: {
      scoreA: Number(playerA?.points ?? attrs?.scoreA ?? 0),
      scoreB: Number(playerB?.points ?? attrs?.scoreB ?? 0),
      runA: Number(playerA?.run ?? attrs?.runA ?? 0),
      runB: Number(playerB?.run ?? attrs?.runB ?? 0),
      liveRunA: Number(playerA?.liveRun ?? attrs?.liveRunA ?? 0),
      liveRunB: Number(playerB?.liveRun ?? attrs?.liveRunB ?? 0),
      current: attrs?.current === "B" ? "B" : "A",
      inningsA,
      inningsB,
      inningsCount: Number(attrs?.innings ?? Math.max(inningsA, inningsB, 0)),
      bestRunA: Number(playerA?.hr ?? attrs?.bestRunA ?? 0),
      bestRunB: Number(playerB?.hr ?? attrs?.bestRunB ?? 0),
      bestRun2A: Number(playerA?.hr2 ?? attrs?.player1_high_run_2 ?? attrs?.bestRun2A ?? 0),
      bestRun2B: Number(playerB?.hr2 ?? attrs?.player2_high_run_2 ?? attrs?.bestRun2B ?? 0),
      playerAName: readPreferredPlayerName(playerA, attrs?.player1Name),
      playerBName: readPreferredPlayerName(playerB, attrs?.player2Name),
      playerACountry: playerA?.country ?? attrs?.player1Country ?? null,
      playerBCountry: playerB?.country ?? attrs?.player2Country ?? null,
      playerAPhotoUrl: normalizeMediaUrl(playerA?.photoUrl ?? attrs?.player1PhotoUrl),
      playerAPhotoMainUrl: normalizeMediaUrl(
        playerA?.photoMainUrl ?? playerA?.photo_main ?? attrs?.player1PhotoMainUrl,
      ),
      playerBPhotoUrl: normalizeMediaUrl(playerB?.photoUrl ?? attrs?.player2PhotoUrl),
      playerBPhotoMainUrl: normalizeMediaUrl(
        playerB?.photoMainUrl ?? playerB?.photo_main ?? attrs?.player2PhotoMainUrl,
      ),
      progress: Number(attrs?.progress ?? 0),
      totalBlocks: Number(attrs?.totalBlocks ?? 0),
      isRunning: Boolean(attrs?.isRunning),
      timeoutsA: Number(playerA?.timeoutsUsed ?? playerA?.timeouts ?? attrs?.timeoutsA ?? 0),
      timeoutsB: Number(playerB?.timeoutsUsed ?? playerB?.timeouts ?? attrs?.timeoutsB ?? 0),
      maxTimeoutsA: Number(playerA?.maxTimeouts ?? attrs?.maxTimeoutsA ?? 3),
      maxTimeoutsB: Number(playerB?.maxTimeouts ?? attrs?.maxTimeoutsB ?? 3),
      avgFormattedA: playerA?.avgFormatted ?? null,
      avgFormattedB: playerB?.avgFormatted ?? null,
      accPercentA: typeof playerA?.accPercent === "number" ? playerA.accPercent : undefined,
      accPercentB: typeof playerB?.accPercent === "number" ? playerB.accPercent : undefined,
      playerATimeSeconds:
        typeof playerA?.playerTimeSeconds === "number"
          ? playerA.playerTimeSeconds
          : undefined,
      playerBTimeSeconds:
        typeof playerB?.playerTimeSeconds === "number"
          ? playerB.playerTimeSeconds
          : undefined,
      secondsPerInningA:
        typeof playerA?.secondsPerInning === "number"
          ? playerA.secondsPerInning
          : undefined,
      secondsPerInningB:
        typeof playerB?.secondsPerInning === "number"
          ? playerB.secondsPerInning
          : undefined,
      targetPointsA: targetA,
      targetPointsB: targetB,
      gameDurationSeconds: typeof attrs?.gameDurationSeconds === "number" ? attrs.gameDurationSeconds : undefined,
      inningsDetail: extractInningsDetail(row),
      tournamentName: attrs?.tournamentName ?? attrs?.eventTitle ?? null,
      stageName: attrs?.stageName ?? attrs?.stageTitle ?? null,
      groupName: attrs?.groupName ?? attrs?.groupLabel ?? null,
      tableName: attrs?.tableName ?? attrs?.tableNumber ?? null,
    },
  };
}

export async function fetchScoreboardSessionRows(statuses: string[]) {
  const params = new URLSearchParams();
  statuses.forEach((status, index) => {
    params.set(`filters[$or][${index}][sessionStatus][$eq]`, status);
    params.set(`filters[$or][${index + statuses.length}][status][$eq]`, status);
  });
  params.set("populate", "*");
  params.set("sort", "updatedAt:desc");
  params.set("pagination[pageSize]", "100");

  const response = await fetchWithTlsFallback(`${API_URL}/api/scoreboard/sessions?${params.toString()}`, {
    cache: "no-store",
    headers: buildHeaders(),
  });

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch scoreboard sessions: ${response.status} ${text}`);
  }

  const json = await parseJsonSafe(response);
  return Array.isArray(json?.data) ? json.data : [];
}

export async function fetchScoreboardSessionById(sessionId: string, token?: string | null) {
  const headers = buildHeaders();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetchWithTlsFallback(
    `${API_URL}/api/scoreboard/sessions/${encodeURIComponent(sessionId)}`,
    {
      cache: "no-store",
      headers,
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch session ${sessionId}: ${response.status} ${text}`);
  }

  const json = await parseJsonSafe(response);
  return json?.data || null;
}
