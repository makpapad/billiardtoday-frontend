import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { fetchScoreboardSessionRows, normalizeLiveSessionRow, parseJsonSafe } from "@/lib/liveSessions";
import { getScoreboardApiToken } from "@/lib/server-token";

type RawNode = Record<string, unknown>;

type ScreenSummary = {
  screenId: string;
  screenName: string;
  isActive: boolean;
  clubName: string | null;
};

const asRecord = (value: unknown): RawNode | null => {
  if (!value || typeof value !== "object") return null;
  return value as RawNode;
};

const unwrapNode = (value: unknown): RawNode | null => {
  const node = asRecord(value);
  if (!node) return null;
  if ("data" in node) return unwrapNode(node.data);
  if ("attributes" in node) return unwrapNode(node.attributes);
  return node;
};

const asString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const fetchScreenNameMap = async (screenIds: string[]) => {
  const uniqueIds = Array.from(new Set(screenIds.map((id) => id.trim()).filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, { screenName: string; clubName: string | null; isActive: boolean }>();

  const params = new URLSearchParams();
  uniqueIds.forEach((screenId, index) => {
    params.set(`filters[$or][${index}][identifier][$eq]`, screenId);
  });
  params.set("pagination[pageSize]", String(uniqueIds.length));
  params.set("sort[0]", "name:asc");
  params.append("fields[0]", "identifier");
  params.append("fields[1]", "name");
  params.append("fields[2]", "isActive");
  params.append("populate[club][fields][0]", "name");

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const token = getScoreboardApiToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/api/screens?${params.toString()}`, {
    cache: "no-store",
    headers,
  });
  if (!response.ok) {
    return new Map<string, { screenName: string; clubName: string | null; isActive: boolean }>();
  }

  const payload = await parseJsonSafe(response);
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const map = new Map<string, { screenName: string; clubName: string | null; isActive: boolean }>();

  rows.forEach((row: unknown) => {
    const node = unwrapNode(row) ?? {};
    const screenId = asString(node.identifier);
    if (!screenId) return;

    const club = unwrapNode(node.club);
    map.set(screenId, {
      screenName: asString(node.name) ?? screenId,
      clubName: asString(club?.name),
      isActive: typeof node.isActive === "boolean" ? node.isActive : true,
    });
  });

  return map;
};

export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

export async function GET() {
  try {
    const rows = await fetchScoreboardSessionRows(["pending", "in_progress"]);
    const sessions: Array<ReturnType<typeof normalizeLiveSessionRow>> = rows.map((row: unknown) =>
      normalizeLiveSessionRow(row as RawNode),
    );
    const orderedScreenIds: string[] = [];

    sessions.forEach((session: ReturnType<typeof normalizeLiveSessionRow>) => {
      const screenId = typeof session.screenId === "string" ? session.screenId.trim() : "";
      if (!screenId) return;
      if (!orderedScreenIds.includes(screenId)) {
        orderedScreenIds.push(screenId);
      }
    });

    const screenNameMap = await fetchScreenNameMap(orderedScreenIds);

    const data: ScreenSummary[] = orderedScreenIds.map((screenId) => {
      const meta = screenNameMap.get(screenId);
      const matchingSession = sessions.find(
        (session: ReturnType<typeof normalizeLiveSessionRow>) => session.screenId === screenId,
      );
      return {
        screenId,
        screenName: meta?.screenName ?? screenId,
        isActive:
          sessions.some(
            (session: ReturnType<typeof normalizeLiveSessionRow>) =>
              session.screenId === screenId &&
              (session.state?.isRunning === true ||
                (rowHasInProgressStatus(rows, screenId) ?? false)),
          ) || false,
        clubName: meta?.clubName ?? (typeof matchingSession?.clubName === "string" ? matchingSession.clubName : null),
      };
    });

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch screens";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function rowHasInProgressStatus(rows: unknown[], screenId: string): boolean {
  return rows.some((row: unknown) => {
    const node = unwrapNode(row) ?? {};
    const rowScreenId = asString(node.screenIdentifier);
    const status = asString(node.sessionStatus) ?? asString(node.status);
    return rowScreenId === screenId && status === "in_progress";
  });
}
