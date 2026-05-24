import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ screenIdentifier: string }> },
) {
  const { screenIdentifier } = await context.params;
  if (!screenIdentifier) {
    return NextResponse.json({ error: "screenIdentifier is required" }, { status: 400 });
  }

  const res = await fetch(
    `${API_URL}/api/screens/by-identifier/${encodeURIComponent(screenIdentifier)}`,
    { cache: "no-store" },
  );
  const text = await res.text();

  return new NextResponse(text || "{}", {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
