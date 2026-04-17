import { NextResponse } from "next/server";
import { SERVER_API_URL } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  if (typeof body?.playerDocumentId === "string" && body.playerDocumentId.trim()) {
    return NextResponse.json({ error: "Public playerDocumentId account binding is disabled" }, { status: 400 });
  }

  const res = await fetch(`${SERVER_API_URL}/api/player-accounts/register`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: body?.email,
      password: body?.password,
      fullName: body?.fullName,
      enrollmentRequestId: body?.enrollmentRequestId,
    }),
  });

  const text = await res.text();
  return new NextResponse(text || "{}", {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
