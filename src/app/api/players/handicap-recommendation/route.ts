import { NextResponse } from "next/server";
import { SERVER_API_URL } from "@/lib/api";
import { buildHandicapRecommendation } from "@/lib/handicapRecommendation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

const readString = (value: unknown) => {
  const clean = String(value || "").trim();
  return clean || null;
};

const unwrapEntity = (value: any) => {
  if (!value || typeof value !== "object") return null;
  return value.attributes && typeof value.attributes === "object"
    ? { ...value.attributes, ...value }
    : value;
};

const resolvePlayer = async (input: unknown) => {
  const raw = readString(input);
  if (!raw) return null;

  const params = new URLSearchParams();
  params.set("pagination[page]", "1");
  params.set("pagination[pageSize]", "1");
  params.set("fields[0]", "full_name");
  params.set("fields[1]", "full_name_en");
  params.set("fields[2]", "documentId");
  params.set("fields[3]", "career_stats");

  if (/^\d+$/.test(raw)) {
    params.set("filters[id][$eq]", raw);
  } else {
    params.set("filters[documentId][$eq]", raw);
  }

  const headers: HeadersInit = STRAPI_API_TOKEN
    ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` }
    : {};

  const res = await fetch(`${SERVER_API_URL}/api/bt-players?${params.toString()}`, {
    cache: "no-store",
    headers,
  });

  if (!res.ok) return null;
  const payload = await res.json().catch(() => ({ data: [] }));
  const row = Array.isArray(payload?.data) ? payload.data[0] : null;
  const entity = unwrapEntity(row);
  if (!entity) return null;

  return {
    id: Number.isFinite(Number(entity.id)) ? Number(entity.id) : null,
    documentId: readString(entity.documentId),
    name: readString(entity.full_name) ?? readString(entity.full_name_en),
    careerStats:
      entity.career_stats && typeof entity.career_stats === "object"
        ? entity.career_stats
        : null,
  };
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const playerAInput = body.playerA ?? body.player1 ?? body.player_a;
    const playerBInput = body.playerB ?? body.player2 ?? body.player_b;

    if (!playerAInput || !playerBInput) {
      return NextResponse.json(
        { error: "playerA and playerB are required" },
        { status: 400 },
      );
    }

    const [playerA, playerB] = await Promise.all([
      resolvePlayer(playerAInput),
      resolvePlayer(playerBInput),
    ]);

    if (!playerA || !playerB) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const data = buildHandicapRecommendation({
      playerA,
      playerB,
      targetPoints: body.targetPoints ?? body.target_points ?? 40,
      gameType: body.gameType ?? body.game_type ?? "Three-Cushion",
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[frontend.api.players.handicap-recommendation][POST]", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
