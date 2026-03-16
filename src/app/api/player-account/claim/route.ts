import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "";
  const query = new URLSearchParams({ token });

  const res = await fetch(`${API_URL}/api/player-accounts/claim?${query.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  const text = await res.text();
  return new NextResponse(text || "{}", {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
