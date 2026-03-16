import { NextResponse } from "next/server";
import { SERVER_API_URL } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth) {
    headers.Authorization = auth;
  }

  const res = await fetch(`${SERVER_API_URL}/api/player-accounts/verify-email/resend`, {
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
