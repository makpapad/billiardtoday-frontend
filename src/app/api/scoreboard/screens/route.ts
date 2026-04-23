import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { getScoreboardApiToken } from "@/lib/server-token";

type RawNode = Record<string, unknown>;

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

const asBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  return null;
};

export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

export async function GET(request: Request) {
  try {
    const incoming = new URL(request.url).searchParams;
    const params = new URLSearchParams(incoming);

    if (!params.get("pagination[pageSize]")) {
      params.set("pagination[pageSize]", "200");
    }
    if (!params.get("sort[0]")) {
      params.set("sort[0]", "name:asc");
    }
    if (!params.get("fields[0]")) {
      params.append("fields[0]", "name");
      params.append("fields[1]", "identifier");
      params.append("fields[2]", "isActive");
    }
    if (!params.get("populate[club][fields][0]")) {
      params.append("populate[club][fields][0]", "name");
    }

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

    const payload = (await response.json().catch(() => ({}))) as { data?: unknown[]; error?: unknown };
    if (!response.ok) {
      const errorMessage =
        asString(asRecord(payload.error)?.message) || "Failed to fetch screens";
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    const rows = Array.isArray(payload.data) ? payload.data : [];
    const data = rows
      .map((row) => {
        const node = unwrapNode(row) ?? {};
        const screenId = asString(node.identifier);
        if (!screenId) return null;

        const club = unwrapNode(node.club);
        return {
          screenId,
          screenName: asString(node.name) ?? screenId,
          isActive: asBoolean(node.isActive) ?? true,
          clubName: asString(club?.name),
        };
      })
      .filter((entry): entry is { screenId: string; screenName: string; isActive: boolean; clubName: string | null } => entry !== null);

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch screens";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
