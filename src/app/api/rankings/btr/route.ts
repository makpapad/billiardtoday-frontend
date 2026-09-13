import { NextRequest, NextResponse } from "next/server";
import { BTR_RANKING_PAGE_SIZE, fetchBtrRankingPage } from "@/lib/publicSiteData";

export const runtime = "nodejs";
export const revalidate = 300;

/**
 * Paginated BTR leaderboard for the public rankings page. Pagination happens server-side so the
 * page reaches every ranked player instead of only the top slice the player endpoint would return.
 */
export async function GET(req: NextRequest) {
  const incoming = req.nextUrl.searchParams;

  const page = Number.parseInt(incoming.get("page") || "1", 10);
  const pageSize = Number.parseInt(incoming.get("pageSize") || "", 10);

  const payload = await fetchBtrRankingPage({
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : BTR_RANKING_PAGE_SIZE,
    country: incoming.get("country"),
    search: incoming.get("q"),
  });

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
