import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/serverEnv";

/**
 * Ελαφρύς κατάλογος συμμετεχόντων για τη φόρμα «Follow this tournament».
 *
 * Η φόρμα χρειάζεται ΜΟΝΟ ονόματα (για το «I'm playing in this tournament»),
 * όχι το πλήρες payload του event (~8 MB). Γι' αυτό ένα ξεχωριστό, μικρό query
 * πάνω στο `tournament.participants` — ίδια σχέση με το SEO route
 * (`tournamentSeoServer`), χωρίς αποτελέσματα/ομίλους/στατιστικά.
 */

const IS_PRODUCTION = (getServerEnv("NODE_ENV") || process.env.NODE_ENV) === "production";

const STRAPI_BASE = (
  getServerEnv("STRAPI_API_URL") ||
  (IS_PRODUCTION ? "http://127.0.0.1:1337" : getServerEnv("NEXT_PUBLIC_STRAPI_URL")) ||
  "https://app.billiardtoday.com"
).replace(/\/$/, "");

const STRAPI_API_TOKEN = getServerEnv("STRAPI_API_TOKEN");

export const revalidate = 300;

type ParticipantRow = {
  documentId: string;
  name: string;
  country: string | null;
};

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function GET(request: Request) {
  const eventId = new URL(request.url).searchParams.get("eventId")?.trim();
  if (!eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  const params = new URLSearchParams();
  params.set("fields[0]", "documentId");
  params.set("populate[tournament][fields][0]", "documentId");
  params.set("populate[tournament][populate][participants][fields][0]", "ranking");
  params.set("populate[tournament][populate][participants][populate][player][fields][0]", "full_name");
  params.set("populate[tournament][populate][participants][populate][player][fields][1]", "full_name_en");
  params.set("populate[tournament][populate][participants][populate][player][fields][2]", "country");

  const headers: HeadersInit = STRAPI_API_TOKEN
    ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` }
    : {};

  try {
    const response = await fetch(
      `${STRAPI_BASE}/api/bt-events/${encodeURIComponent(eventId)}?${params.toString()}`,
      { headers, cache: "no-store", signal: AbortSignal.timeout(8000) },
    );

    if (!response.ok) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const payload = (await response.json()) as { data?: unknown };
    const event = asRecord(payload.data);
    const tournament = asRecord(event?.tournament);

    const seen = new Set<string>();
    const rows: ParticipantRow[] = [];

    for (const raw of asArray(tournament?.participants)) {
      const participant = asRecord(raw);
      const player = asRecord(participant?.player);
      const documentId = readString(player?.documentId);
      if (!documentId || seen.has(documentId)) continue;
      const name = readString(player?.full_name) || readString(player?.full_name_en);
      if (!name) continue;
      seen.add(documentId);
      rows.push({
        documentId,
        name,
        country: readString(player?.country),
      });
    }

    rows.sort((a, b) => a.name.localeCompare(b.name, "en"));

    return NextResponse.json(
      { data: rows },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch {
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
