import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { getScoreboardApiToken } from "@/lib/server-token";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ data: [] });
  }

  const params = new URLSearchParams();
  params.set("fields[0]", "full_name");
  params.set("fields[1]", "full_name_en");
  params.set("fields[2]", "country");
  params.set("fields[3]", "documentId");
  params.set("populate[photo_alt][fields][0]", "url");
  params.set("populate[photo_main][fields][0]", "url");
  params.set("pagination[pageSize]", "10");
  params.set("filters[$or][0][full_name][$containsi]", q);
  params.set("filters[$or][1][full_name_en][$containsi]", q);

  const headers: Record<string, string> = {};
  const token = getScoreboardApiToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api/bt-players?${params.toString()}`, {
    cache: "no-store",
    headers,
  });
  const raw = await res.json().catch(() => ({ data: [] }));
  const data = Array.isArray(raw?.data)
    ? raw.data.map((entry: any) => {
        const attrs = entry?.attributes ?? entry ?? {};
        return {
          id: entry?.id ?? attrs?.id ?? null,
          documentId: attrs?.documentId ?? entry?.documentId ?? null,
          fullName: attrs?.full_name ?? attrs?.full_name_en ?? null,
          country: attrs?.country ?? null,
          photoUrl: attrs?.photo_alt?.url ?? attrs?.photo_main?.url ?? null,
        };
      })
    : [];

  return NextResponse.json({ data });
}
