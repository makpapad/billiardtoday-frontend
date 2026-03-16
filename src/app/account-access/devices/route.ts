import { NextResponse } from "next/server";
import { SERVER_API_URL } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) {
    return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
  }

  const res = await fetch(`${SERVER_API_URL}/api/player-accounts/devices`, {
    cache: "no-store",
    headers: { Authorization: auth },
  });

  const text = await res.text();
  return new NextResponse(text || "{}", {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
