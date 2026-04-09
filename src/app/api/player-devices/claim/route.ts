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
  return new NextResponse(text || "{}", {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
