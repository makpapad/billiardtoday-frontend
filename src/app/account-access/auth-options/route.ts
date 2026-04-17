import { NextResponse } from "next/server";
import { SERVER_API_URL } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const res = await fetch(`${SERVER_API_URL}/api/player-accounts/auth-options`, {
    cache: "no-store",
  });

  const text = await res.text();
  return new NextResponse(text || "{}", {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
