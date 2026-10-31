import { NextRequest, NextResponse } from "next/server";
import { getTournamentList } from "@/lib/tournamentListing";

export const runtime = "nodejs";

/**
 * Λεπτός wrapper πάνω στο `getTournamentList` (lib/tournamentListing).
 * Η ίδια συνάρτηση τροφοδοτεί και το server-rendered `/tournaments`, ώστε η λίστα
 * που βλέπει ο χρήστης και η λίστα που βλέπει ο crawler να είναι ΠΑΝΤΑ ίδιες.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const payload = await getTournamentList(searchParams);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Το facets payload είναι σταθερό για ώρα — το ζητάει κάθε render της λίστας.
  if (searchParams.get("facets")) {
    headers["Cache-Control"] = "public, s-maxage=3600, stale-while-revalidate=86400";
  }

  return NextResponse.json(payload, { status: 200, headers });
}
