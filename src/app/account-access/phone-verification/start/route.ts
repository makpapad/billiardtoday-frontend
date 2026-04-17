import { NextResponse } from "next/server";
import { SERVER_API_URL } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) {
    return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const res = await fetch(`${SERVER_API_URL}/api/player-accounts/phone-verification/start`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  return new NextResponse(text || "{}", {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
