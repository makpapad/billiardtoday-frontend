import { NextResponse } from "next/server";
import { getScoreboardApiToken } from "@/lib/server-token";
import { getServerEnv } from "@/lib/serverEnv";

export const dynamic = "force-dynamic";

const IS_PRODUCTION =
  (getServerEnv("NODE_ENV") || process.env.NODE_ENV || "").trim() === "production";
const STRAPI_BASE_URL = (
  getServerEnv("STRAPI_API_URL") ||
  (IS_PRODUCTION ? "http://127.0.0.1:1337" : getServerEnv("NEXT_PUBLIC_STRAPI_URL")) ||
  "https://app.billiardtoday.com"
).replace(/\/$/, "");

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

  const res = await fetch(`${STRAPI_BASE_URL}/api/player-devices/claim-scoreboard`, {
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
