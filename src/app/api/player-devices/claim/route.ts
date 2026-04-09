import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { getScoreboardApiToken } from "@/lib/server-token";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  console.log("[api/player-devices/claim] incoming", {
    nonce8: typeof body?.nonce === "string" ? body.nonce.slice(0, 8) : null,
    screenIdentifier: body?.screenIdentifier ?? null,
    deviceTokenLast4:
      typeof body?.deviceToken === "string" ? body.deviceToken.slice(-4) : null,
  });

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getScoreboardApiToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api/player-devices/claim-scoreboard`, {
    method: "POST",
    cache: "no-store",
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log("[api/player-devices/claim] upstream", {
    status: res.status,
    statusText: res.statusText,
    bodyPreview: text.slice(0, 500),
  });
  return new NextResponse(text || "{}", {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
