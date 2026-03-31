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

    const text = await response.text();
    return new NextResponse(text || "{}", {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to resolve overlay slug";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
