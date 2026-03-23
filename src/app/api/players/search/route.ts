import { NextResponse } from "next/server";
import { SERVER_API_URL } from "@/lib/api";

export const dynamic = "force-dynamic";

const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

const readString = (value: unknown): string | null => {
  const clean = String(value || "").trim();
  return clean || null;
};

const unwrapEntity = (value: any) => {
  if (!value || typeof value !== "object") return null;
  return value.attributes && typeof value.attributes === "object"
    ? { ...value.attributes, ...value }
    : value;
};

const isInactiveStatus = (value: unknown) => {
  const status = String(value || "").trim().toLowerCase();
  return status === "inactive" || status === "disabled";
};

const isPlayerActive = (entity: any) => {
  if (!entity || typeof entity !== "object") return false;

  if (typeof entity.active === "boolean") return entity.active;
  if (typeof entity.is_active === "boolean") return entity.is_active;
  if (typeof entity.isActive === "boolean") return entity.isActive;

  if (isInactiveStatus(entity.status)) return false;

  return true;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ data: [] });
  }

  const params = new URLSearchParams();
  params.set("pagination[page]", "1");
  params.set("pagination[pageSize]", "50");
  params.set("sort[0]", "full_name:asc");
  params.set("fields[0]", "full_name");
  params.set("fields[1]", "full_name_en");
  params.set("fields[2]", "country");
  params.set("fields[3]", "city");
  params.set("fields[4]", "documentId");
  params.set("populate[club][fields][0]", "name");
  params.set("filters[$or][0][full_name][$containsi]", q);
  params.set("filters[$or][1][full_name_en][$containsi]", q);
  params.set("filters[$or][2][country][$containsi]", q);
  params.set("filters[$or][3][city][$containsi]", q);
  params.set("filters[$or][4][club][name][$containsi]", q);

  const headers: HeadersInit = {};
  if (STRAPI_API_TOKEN) {
    headers.Authorization = `Bearer ${STRAPI_API_TOKEN}`;
  }

  const doFetch = async (withAuth: boolean) =>
    fetch(`${SERVER_API_URL}/api/bt-players?${params.toString()}`, {
      cache: "no-store",
      headers: withAuth ? headers : {},
    });

  let res = await doFetch(Boolean(STRAPI_API_TOKEN));
  if (!res.ok && STRAPI_API_TOKEN && (res.status === 401 || res.status === 403)) {
    res = await doFetch(false);
  }

  if (!res.ok) {
    return NextResponse.json({ data: [] }, { status: res.status });
  }

  const raw = await res.json().catch(() => ({ data: [] }));
  const rows = Array.isArray(raw?.data) ? raw.data : [];
  const data = rows
    .map((row: any) => {
      const entity = unwrapEntity(row);
      const clubEntity = unwrapEntity(entity?.club?.data ?? entity?.club);
      const id = Number(entity?.id);
      const documentId = readString(entity?.documentId);
      const fullName = readString(entity?.full_name);
      const fullNameEn = readString(entity?.full_name_en);

      if (!isPlayerActive(entity)) {
        return null;
      }

      if (!Number.isFinite(id) || !documentId || !(fullName || fullNameEn)) {
        return null;
      }

      return {
        id,
        documentId,
        fullName: fullName || fullNameEn,
        fullNameEn,
        country: readString(entity?.country),
        city: readString(entity?.city),
        clubName: readString(clubEntity?.name),
      };
    })
    .filter((row: any) => Boolean(row));

  return NextResponse.json({ data });
}
