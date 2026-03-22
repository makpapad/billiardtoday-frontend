import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

export async function POST() {
  return NextResponse.json(
    {
      error: "legacy_route_disabled",
      message: "Use direct WebSocket remote control flow.",
    },
    { status: 410 },
  );
}
