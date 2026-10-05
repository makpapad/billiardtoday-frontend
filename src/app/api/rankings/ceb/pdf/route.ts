import { NextRequest, NextResponse } from "next/server";
import { readCebRanking, readCebRankingEdition } from "@/lib/cebRankingData";
import { renderCebRankingPdf } from "@/lib/cebRankingPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/rankings/ceb/pdf?slug=<slug>&edition=<editionKey|κενό=τρέχουσα>
 *
 * Returns the whole CEB ranking list as a real PDF (application/pdf, attachment).
 * The URL is the one the CEB federations already receive by email — do not change it.
 * Data comes from `public/data/ceb-ranking/` (same source as the site table), never
 * from the database or the network.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const slug = params.get("slug")?.trim() ?? "";
  const edition = params.get("edition")?.trim() || null;

  if (!slug) {
    return NextResponse.json({ error: "Missing required 'slug' parameter." }, { status: 400 });
  }

  const payload = edition ? readCebRankingEdition(slug, edition) : readCebRanking(slug);
  if (!payload) {
    return NextResponse.json(
      { error: "CEB ranking not found.", slug, edition },
      { status: 404 },
    );
  }

  const bytes = await renderCebRankingPdf({ payload });
  const filename = `ceb-${slug}-${payload.edition.replace(/\//g, "-")}.pdf`;

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
