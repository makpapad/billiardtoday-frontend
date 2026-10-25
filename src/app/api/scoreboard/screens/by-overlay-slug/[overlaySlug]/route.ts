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

type ScreenCandidate = { identifier: string; name: string | null };

type ScreenResolution =
  | { status: "ok"; payload: Record<string, unknown> }
  | { status: "ambiguous"; candidates: ScreenCandidate[] }
  | { status: "not_found" };

// Το `name` ΔΕΝ είναι μοναδικό στο Strapi (μοναδικό είναι μόνο το `identifier`) — 3 οθόνες
// μοιράζονται ήδη όνομα (Europe-S4, Kolonos-S3, Legend). Με παραπάνω από ένα ταιριάσματα ΔΕΝ
// μαντεύουμε: ο caller παίρνει 409 και ζητά identifier, αλλιώς το overlay δείχνει σιωπηλά
// τον αγώνα άλλης οθόνης (η σειρά του Postgres αλλάζει με κάθε update/restore).
const MAX_RESOLUTION_ROWS = 10;

async function resolveScreenByIdentifierOrName(
  value: string,
  headers: Record<string, string>,
): Promise<ScreenResolution> {
  const params = new URLSearchParams();
  params.set("filters[$or][0][identifier][$eq]", value);
  params.set("filters[$or][1][name][$eqi]", value);
  params.set("pagination[pageSize]", String(MAX_RESOLUTION_ROWS));
  params.set("sort[0]", "isActive:desc");
  params.set("sort[1]", "name:asc");
  params.append("fields[0]", "identifier");
  params.append("fields[1]", "name");
  params.append("fields[2]", "isActive");

  const response = await fetch(`${API_URL}/api/screens?${params.toString()}`, {
    cache: "no-store",
    headers,
  });
  if (!response.ok) return { status: "not_found" };

  const payload = await parseJsonSafe(response);
  const rows = Array.isArray(asRecord(payload)?.data) ? (asRecord(payload)?.data as unknown[]) : [];
  const nodes = rows
    .map((row) => unwrapNode(row))
    .filter((node): node is Record<string, unknown> => Boolean(asString(node?.identifier)));

  // Το identifier κερδίζει πάντα (είναι μοναδικό) — ακόμη κι αν κάποια οθόνη λέγεται έτσι.
  const exactIdentifierMatch = nodes.find((node) => asString(node?.identifier) === value);
  if (exactIdentifierMatch) return okResolution(exactIdentifierMatch);

  const wantedName = value.toLowerCase();
  const nameMatches = nodes.filter((node) => asString(node?.name)?.toLowerCase() === wantedName);
  if (nameMatches.length > 1) {
    return {
      status: "ambiguous",
      candidates: nameMatches.map((node) => ({
        identifier: asString(node?.identifier) as string,
        name: asString(node?.name),
      })),
    };
  }

  const node = nameMatches[0] ?? (nodes.length === 1 ? nodes[0] : null);
  if (!node) return { status: "not_found" };
  return okResolution(node);
}

function okResolution(node: Record<string, unknown>): ScreenResolution {
  return {
    status: "ok",
    payload: {
      data: {
        identifier: asString(node?.identifier),
        name: asString(node?.name),
        isActive: typeof node?.isActive === "boolean" ? node.isActive : null,
      },
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

    const fallback = await resolveScreenByIdentifierOrName(overlaySlug, headers);
    if (fallback.status === "ok") {
      return NextResponse.json(fallback.payload);
    }
    if (fallback.status === "ambiguous") {
      const identifiers = fallback.candidates.map((candidate) => candidate.identifier);
      return NextResponse.json(
        {
          code: "AMBIGUOUS_SCREEN_NAME",
          error:
            `Ambiguous screen name "${overlaySlug}": ${identifiers.length} screens share it ` +
            `(${identifiers.join(", ")}). Use the screen identifier in the overlay URL.`,
          matches: fallback.candidates,
        },
        { status: 409 },
      );
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
