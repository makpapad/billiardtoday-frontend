import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { getScoreboardApiToken } from "@/lib/server-token";

type RouteContext = {
  params: Promise<{
    overlaySlug: string;
  }>;
};

export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function unwrapNode(value: unknown): Record<string, unknown> | null {
  const node = asRecord(value);
  if (!node) return null;
  if ("data" in node) return unwrapNode(node.data);
  if ("attributes" in node) return unwrapNode(node.attributes);
  return node;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function resolveScreenByIdentifierOrName(
  value: string,
  headers: Record<string, string>,
): Promise<Record<string, unknown> | null> {
  const params = new URLSearchParams();
  params.set("filters[$or][0][identifier][$eq]", value);
  params.set("filters[$or][1][name][$eqi]", value);
  params.set("pagination[pageSize]", "2");
  params.set("sort[0]", "isActive:desc");
  params.set("sort[1]", "name:asc");
  params.append("fields[0]", "identifier");
  params.append("fields[1]", "name");
  params.append("fields[2]", "isActive");

  const response = await fetch(`${API_URL}/api/screens?${params.toString()}`, {
    cache: "no-store",
    headers,
  });
  if (!response.ok) return null;

  const payload = await parseJsonSafe(response);
  const rows = Array.isArray(asRecord(payload)?.data) ? (asRecord(payload)?.data as unknown[]) : [];
  const exactIdentifierMatch = rows
    .map((row) => unwrapNode(row))
    .find((node) => asString(node?.identifier) === value);
  const exactNameMatch = rows
    .map((row) => unwrapNode(row))
    .find((node) => asString(node?.name)?.toLowerCase() === value.toLowerCase());
  const node = exactIdentifierMatch ?? exactNameMatch ?? unwrapNode(rows[0]);
  const identifier = asString(node?.identifier);
  if (!identifier) return null;

  return {
    data: {
      identifier,
      name: asString(node?.name),
      isActive: typeof node?.isActive === "boolean" ? node.isActive : null,
    },
  };
}

export async function GET(_: Request, context: RouteContext) {
  const { overlaySlug } = await context.params;
  if (!overlaySlug) {
    return NextResponse.json({ error: "overlaySlug is required" }, { status: 400 });
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = getScoreboardApiToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_URL}/api/screens/by-overlay-slug/${encodeURIComponent(overlaySlug)}`,
      {
        cache: "no-store",
        headers,
      },
    );

    const payload = await parseJsonSafe(response);
    const identifier = asString(unwrapNode(payload)?.identifier);
    if (response.ok && identifier) {
      return NextResponse.json(payload, { status: response.status });
    }

    const fallbackPayload = await resolveScreenByIdentifierOrName(overlaySlug, headers);
    if (fallbackPayload) {
      return NextResponse.json(fallbackPayload);
    }

    return NextResponse.json(
      response.ok ? { error: "Screen not found" } : payload,
      { status: response.ok ? 404 : response.status },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to resolve screen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
