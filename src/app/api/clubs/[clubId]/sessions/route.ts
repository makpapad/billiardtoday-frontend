import { NextResponse } from "next/server";
import {
  fetchScoreboardSessionRows,
  matchesClub,
  normalizeLiveSessionRow,
  resolveClubIdentity,
} from "@/lib/liveSessions";

export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

const DEFAULT_STATUSES = ["pending", "in_progress"];

export async function GET(
  request: Request,
  context: { params: Promise<{ clubId: string }> },
) {
  const { clubId } = await context.params;
  if (!clubId) {
    return NextResponse.json({ error: "clubId is required" }, { status: 400 });
  }

  try {
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status") || DEFAULT_STATUSES.join(",");
    const statuses = statusParam
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const club = await resolveClubIdentity(clubId);
    if (!club) {
      return NextResponse.json({ data: [], error: "Club not found" }, { status: 200 });
    }

    const rows = await fetchScoreboardSessionRows(statuses);
    const data = rows
      .filter((row: Record<string, unknown>) => matchesClub(row, club))
      .map((row: Record<string, unknown>) => normalizeLiveSessionRow(row));

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { data: [], error: error?.message || "Failed to fetch live sessions" },
      { status: 500 },
    );
  }
}
