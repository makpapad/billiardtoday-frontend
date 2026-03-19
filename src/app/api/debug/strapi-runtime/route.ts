import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/serverEnv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

const isProduction = (getServerEnv("NODE_ENV") || process.env.NODE_ENV) === "production";
const strapiUrl =
  getServerEnv("STRAPI_API_URL") ||
  (isProduction ? "http://127.0.0.1:1337" : getServerEnv("NEXT_PUBLIC_STRAPI_URL")) ||
  "http://localhost:1337";
const token = getServerEnv("STRAPI_API_TOKEN") || "";

async function test(path: string, useAuth: boolean) {
  const url = `${strapiUrl}${path}`;
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: useAuth && token ? { Authorization: `Bearer ${token}` } : {},
    });
    const text = await response.text();
    return {
      url,
      useAuth,
      status: response.status,
      ok: response.ok,
      bodyPreview: text.slice(0, 300),
    };
  } catch (error: any) {
    return {
      url,
      useAuth,
      error: error?.message || String(error),
    };
  }
}

export async function GET() {
  const clubPath =
    "/api/clubs?filters[documentId][$eq]=m3m5jxpr74fgvq3yk2bewmrn&pagination[pageSize]=1";
  const siteSettingPath = "/api/site-setting?populate=*";

  return NextResponse.json({
    cwd: process.cwd(),
    nodeEnv: process.env.NODE_ENV || null,
    resolved: {
      isProduction,
      strapiUrl,
      hasToken: Boolean(token),
      tokenPrefix: token ? token.slice(0, 12) : null,
    },
    tests: {
      clubWithAuth: await test(clubPath, true),
      clubWithoutAuth: await test(clubPath, false),
      siteSettingWithAuth: await test(siteSettingPath, true),
      siteSettingWithoutAuth: await test(siteSettingPath, false),
    },
  });
}

