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

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
};

const getRowValue = (row: RawSession, key: string): unknown => {
  if (key in row) return row[key];
  const attributes = asRecord(row.attributes);
  if (attributes && key in attributes) return attributes[key];
  return undefined;
};

const normalizeSession = (row: RawSession) => ({
  ...normalizeLiveSessionRow(row),
  documentId:
    asString(getRowValue(row, "documentId")) ||
    asString(row.documentId) ||
    String(getRowValue(row, "id") || row.id || ""),
  eventId: asString(getRowValue(row, "eventId")),
  eventStageId: asString(getRowValue(row, "eventStageId")),
  groupNumber:
    typeof getRowValue(row, "groupNumber") === "number"
      ? (getRowValue(row, "groupNumber") as number)
      : typeof getRowValue(row, "groupNumber") === "string"
        ? Number(getRowValue(row, "groupNumber"))
        : null,
  screenIdentifier: asString(getRowValue(row, "screenIdentifier")),
  player1DocumentId: asString(getRowValue(row, "player1DocumentId")),
  player2DocumentId: asString(getRowValue(row, "player2DocumentId")),
  player1Name: asString(getRowValue(row, "player1Name")),
  player2Name: asString(getRowValue(row, "player2Name")),
  sessionStatus: asString(getRowValue(row, "sessionStatus")),
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
    params.set("eventId", eventId);
    params.set("status", "pending,in_progress");
    params.set("pageSize", "100");

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = getScoreboardApiToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${SERVER_API_URL}/api/scoreboard/sessions?${params.toString()}`, {
      cache: "no-store",
      headers,
    });

    if (response.status === 404) {
      return NextResponse.json({ data: [] });
    }

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
