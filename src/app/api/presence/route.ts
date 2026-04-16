import { NextResponse } from "next/server";
import { fetchPresenceEntries, getPresenceEndpoint } from "@/lib/wsPresence";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchPresenceEntries();
    return NextResponse.json({
      data,
      source: getPresenceEndpoint(),
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load presence";

    return NextResponse.json(
      {
        error: message,
        source: getPresenceEndpoint(),
        fetchedAt: new Date().toISOString(),
      },
      { status: 502 },
    );
  }
}
