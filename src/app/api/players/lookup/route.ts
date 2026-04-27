import { NextRequest, NextResponse } from "next/server";
import { SERVER_API_URL } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

const copySearchParams = (incoming: URLSearchParams) => {
  const params = new URLSearchParams();

  const page = incoming.get("pagination[page]");
  const pageSize = incoming.get("pagination[pageSize]");

  if (page) {
    params.set("pagination[page]", page);
  }
  params.set("pagination[pageSize]", pageSize ?? "1");

  const sortValues = incoming.getAll("sort[0]");
  if (sortValues.length > 0) {
    sortValues.forEach((value, index) => {
      params.set(`sort[${index}]`, value);
    });
  } else {
    params.set("sort[0]", "full_name:asc");
  }

  incoming.forEach((value, key) => {
    if (key.startsWith("filters[") || key.startsWith("fields[") || key.startsWith("populate[")) {
      params.set(key, value);
    }
  });

  const hasAnyFields = Array.from(incoming.keys()).some((key) => key.startsWith("fields["));
  if (!hasAnyFields) {
    const defaultFields = ["full_name", "full_name_en", "country", "documentId", "career_stats"];
    defaultFields.forEach((field, index) => {
      params.set(`fields[${index}]`, field);
    });
  }

  const ensurePopulateFields = (field: string) => {
    const baseKey = `populate[${field}]`;
    const hasPopulate =
      incoming.has(baseKey) ||
      incoming.has(`${baseKey}[fields][0]`) ||
      incoming.has(`${baseKey}[populate]`);

    if (!hasPopulate) {
      params.set(`${baseKey}[fields][0]`, "url");
      params.set(`${baseKey}[fields][1]`, "documentId");
      params.set(`${baseKey}[fields][2]`, "name");
    }
  };

  ensurePopulateFields("photo_main");
  ensurePopulateFields("photo_alt");

  return params;
};

export async function GET(req: NextRequest) {
  try {
    const params = copySearchParams(req.nextUrl.searchParams);
    const headers: HeadersInit =
      STRAPI_API_TOKEN ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` } : {};

    const doFetch = async (withAuth: boolean) =>
      fetch(`${SERVER_API_URL}/api/bt-players?${params.toString()}`, {
        cache: "no-store",
        headers: withAuth ? headers : {},
      });

    let res = await doFetch(Boolean(STRAPI_API_TOKEN));
    let text = await res.text();

    if (!res.ok && STRAPI_API_TOKEN && (res.status === 401 || res.status === 403)) {
      const retry = await doFetch(false);
      const retryText = await retry.text();
      if (retry.ok) {
        res = retry;
        text = retryText;
      } else if (retry.status >= res.status) {
        res = retry;
        text = retryText;
      }
    }

    return new NextResponse(text || "{}", {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[frontend.api.players.lookup][GET]", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
