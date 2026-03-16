import { NextResponse } from "next/server";
import { SERVER_API_URL } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email") || "";
  const query = new URLSearchParams({ email });

  const res = await fetch(`${SERVER_API_URL}/api/player-accounts/enrollment-preview?${query.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  const text = await res.text();
  return new NextResponse(text || "{}", {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
