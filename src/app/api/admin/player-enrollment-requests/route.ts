import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { getScoreboardApiToken } from "@/lib/server-token";
import { buildVerificationProxyHeaders } from "@/lib/player-review-admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const headers: Record<string, string> = {
    ...buildVerificationProxyHeaders(req),
  };
  const token = getScoreboardApiToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api/player-enrollment-requests/pending`, {
    cache: "no-store",
    headers,
  });

  const text = await res.text();
  return new NextResponse(text || "{}", {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
