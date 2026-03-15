import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { getScoreboardApiToken } from "@/lib/server-token";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const deviceToken = searchParams.get("deviceToken");
  if (!deviceToken) {
    return NextResponse.json({ error: "deviceToken is required" }, { status: 400 });
  }

  const headers: Record<string, string> = {};
  const token = getScoreboardApiToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api/player-devices/my-friendly-matches?deviceToken=${encodeURIComponent(deviceToken)}`, {
    cache: "no-store",
    headers,
  });
  const text = await res.text();
  return new NextResponse(text || "{}", {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
