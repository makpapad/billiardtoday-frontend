import { NextResponse } from "next/server";
import { SERVER_API_URL } from "@/lib/api";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ recordingId: string }>;
};

export async function GET(req: Request, context: Context) {
  const auth = req.headers.get("authorization");
  if (!auth) {
    return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
  }

  const { recordingId } = await context.params;
  const res = await fetch(
    `${SERVER_API_URL}/api/player-accounts/friendly-recordings/${encodeURIComponent(recordingId)}/events`,
    {
      cache: "no-store",
      headers: { Authorization: auth },
    },
  );

  const text = await res.text();
  return new NextResponse(text || "{}", {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
