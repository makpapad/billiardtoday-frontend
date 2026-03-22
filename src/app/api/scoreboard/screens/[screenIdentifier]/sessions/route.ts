import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { getScoreboardApiToken } from "@/lib/server-token";

type RouteContext = {
  params: Promise<{
    screenIdentifier: string;
  }>;
};

export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

export async function GET(request: Request, context: RouteContext) {
  const { screenIdentifier } = await context.params;
  if (!screenIdentifier) {
    return NextResponse.json({ error: "screenIdentifier is required" }, { status: 400 });
  }

  try {
    const incoming = new URL(request.url).searchParams;
    const params = new URLSearchParams(incoming);
    if (!params.get("status")) {
      params.set("status", "pending,in_progress");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = getScoreboardApiToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_URL}/api/scoreboard/screens/${encodeURIComponent(screenIdentifier)}/sessions?${params.toString()}`,
      {
        cache: "no-store",
        headers,
      },
    );

    const text = await response.text();
    return new NextResponse(text || "{}", {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch screen sessions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
