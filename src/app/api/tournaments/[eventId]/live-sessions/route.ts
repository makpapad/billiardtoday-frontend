import { NextResponse } from "next/server";
import { SERVER_API_URL } from "@/lib/api";
import { getScoreboardApiToken } from "@/lib/server-token";
import { normalizeLiveSessionRow } from "@/lib/liveSessions";

export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

type RawSession = Record<string, unknown>;

const asString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeSession = (row: RawSession) => ({
  ...normalizeLiveSessionRow(row),
  documentId: asString(row.documentId) || String(row.id || ""),
  eventId: asString(row.eventId),
  eventStageId: asString(row.eventStageId),
  groupNumber:
    typeof row.groupNumber === "number"
      ? row.groupNumber
      : typeof row.groupNumber === "string"
        ? Number(row.groupNumber)
        : null,
  screenIdentifier: asString(row.screenIdentifier),
  player1DocumentId: asString(row.player1DocumentId),
  player2DocumentId: asString(row.player2DocumentId),
  player1Name: asString(row.player1Name),
  player2Name: asString(row.player2Name),
  sessionStatus: asString(row.sessionStatus),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await context.params;
  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  try {
    const params = new URLSearchParams();
    params.set("filters[eventId][$eq]", eventId);
    params.set("filters[sessionStatus][$in][0]", "pending");
    params.set("filters[sessionStatus][$in][1]", "in_progress");
    params.set("pagination[pageSize]", "100");
    params.set("sort[0]", "updatedAt:desc");

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = getScoreboardApiToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${SERVER_API_URL}/api/scoreboard/sessions?${params.toString()}`, {
      cache: "no-store",
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: text || "Failed to fetch tournament live sessions" },
        { status: response.status },
      );
    }

    const json = await response.json().catch(() => ({ data: [] }));
    const rows = Array.isArray(json?.data) ? json.data : [];
    return NextResponse.json({ data: rows.map((row: RawSession) => normalizeSession(row)) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch tournament live sessions" },
      { status: 500 },
    );
  }
}
