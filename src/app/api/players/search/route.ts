import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ data: [] });
  }

  const params = new URLSearchParams();
  params.set("q", q);

  const res = await fetch(`${API_URL}/api/bt-players/public-search?${params.toString()}`, {
    cache: "no-store",
  });
  const raw = await res.json().catch(() => ({ data: [] }));
  const data = Array.isArray(raw?.data) ? raw.data : [];

  return NextResponse.json({ data });
}
