import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { getScoreboardApiToken } from "@/lib/server-token";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ScoreboardEventBody = {
  type?: string;
  payload?: Record<string, unknown>;
};

export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Scoreboard id is required" }, { status: 400 });
  }

  let body: ScoreboardEventBody = {};
  try {
    const parsed = (await request.json()) as ScoreboardEventBody;
    body = parsed ?? {};
  } catch {
    body = {};
  }

  const eventType = typeof body.type === "string" ? body.type.trim() : "";
  if (!eventType) {
    return NextResponse.json({ error: "Event type is required" }, { status: 400 });
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = getScoreboardApiToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/api/scoreboards/${encodeURIComponent(id)}/events`, {
      method: "POST",
      cache: "no-store",
      headers,
      body: JSON.stringify({
        type: eventType,
        payload: body.payload && typeof body.payload === "object" ? body.payload : {},
      }),
    });

    const text = await response.text();
    return new NextResponse(text || "{}", {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to forward scoreboard event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
