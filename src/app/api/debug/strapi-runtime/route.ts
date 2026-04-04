import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/serverEnv";
import { resolveTournamentEventSummary } from "@/lib/tournaments";

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
  const slug = "longoni-next-gen-grand-prix-3-cushion-u21-2026";
  const clubPath =
    "/api/clubs?filters[documentId][$eq]=m3m5jxpr74fgvq3yk2bewmrn&pagination[pageSize]=1";
  const siteSettingPath = "/api/site-setting?populate=*";
  const btEventsListPath = "/api/bt-events?pagination[pageSize]=1";
  const btEventsFieldsPath =
    "/api/bt-events?fields[0]=title&fields[1]=documentId&fields[2]=season&pagination[pageSize]=1&sort[0]=updatedAt:desc";
  const btEventsFilterPath =
    "/api/bt-events?filters[title][$containsi]=LONGONI&pagination[pageSize]=5";
  const btEventTournamentDatesPath =
    "/api/bt-events/v8nc64onx1l242seiui2wjng?fields[0]=title&fields[1]=documentId&fields[2]=season&populate[tournament][fields][0]=title&populate[tournament][fields][1]=startDate&populate[tournament][fields][2]=endDate&populate[tournament][fields][3]=start_date&populate[tournament][fields][4]=end_date";
  const btEventTournamentFieldsPath =
    "/api/bt-events/v8nc64onx1l242seiui2wjng?fields[0]=title&fields[1]=documentId&fields[2]=season&populate[tournament][fields][0]=title&populate[tournament][fields][1]=organizer_type&populate[tournament][fields][2]=startDate&populate[tournament][fields][3]=endDate&populate[tournament][fields][4]=start_date&populate[tournament][fields][5]=end_date";
  const btEventTournamentClubPath =
    "/api/bt-events/v8nc64onx1l242seiui2wjng?fields[0]=title&fields[1]=documentId&fields[2]=season&populate[tournament][fields][0]=title&populate[tournament][populate][club][fields][0]=documentId";

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
      btEventsListWithAuth: await test(btEventsListPath, true),
      btEventsListWithoutAuth: await test(btEventsListPath, false),
      btEventsFieldsWithAuth: await test(btEventsFieldsPath, true),
      btEventsFieldsWithoutAuth: await test(btEventsFieldsPath, false),
      btEventsFilterWithAuth: await test(btEventsFilterPath, true),
      btEventsFilterWithoutAuth: await test(btEventsFilterPath, false),
      btEventTournamentDatesWithAuth: await test(btEventTournamentDatesPath, true),
      btEventTournamentFieldsWithAuth: await test(btEventTournamentFieldsPath, true),
      btEventTournamentClubWithAuth: await test(btEventTournamentClubPath, true),
    },
    tournamentSummary: await resolveTournamentEventSummary(slug).catch((error) => ({
      error: error instanceof Error ? error.message : String(error),
    })),
  });
}

