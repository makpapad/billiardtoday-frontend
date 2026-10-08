import { NextRequest, NextResponse } from "next/server";
import { readUmbRanking, readUmbRankingEdition } from "@/lib/umbRankingData";
import { renderUmbRankingPdf } from "@/lib/umbRankingPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/rankings/umb/pdf?slug=<slug>&edition=<editionKey|κενό=τρέχουσα>
 *
 * Returns the whole UMB Events Ranking list as a real PDF (application/pdf,
 * attachment). Same contract as the CEB export (`/api/rankings/ceb/pdf`), so the
 * "Download PDF" button on the UMB page works exactly like the CEB one. Data comes
 * from `public/data/umb-ranking/` (same source as the site table), never from the
 * database or the network.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const slug = params.get("slug")?.trim() ?? "";
  const edition = params.get("edition")?.trim() || null;

  if (!slug) {
    return NextResponse.json({ error: "Missing required 'slug' parameter." }, { status: 400 });
  }

  const payload = edition ? readUmbRankingEdition(slug, edition) : readUmbRanking(slug);
  if (!payload) {
    return NextResponse.json(
      { error: "UMB ranking not found.", slug, edition },
      { status: 404 },
    );
  }

  const bytes = await renderUmbRankingPdf({ payload });
  const filename = `umb-${slug}-${payload.edition.replace(/\//g, "-")}.pdf`;

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
