import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function tokenizeSearch(input: string | null): string[] {
  if (!input) return [];
  return input
    .toLowerCase()
    .replace(/[_/\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

function normalizeToken(token: string): string {
  if (
    ["cusion", "cusions", "cishion", "cishions", "cushions"].includes(token)
  ) {
    return "cushion";
  }
  if (["sesion", "session"].includes(token)) {
    return "season";
  }
  if (token === "3c") {
    return "3-cushion";
  }
  return token;
}

function emptyPayload(page: number, pageSize: number) {
  return {
    data: [],
    meta: {
      pagination: {
        page,
        pageSize,
        pageCount: 0,
        total: 0,
      },
    },
  };
}

function readDateYear(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.getFullYear();
  const match = value.match(/\b(\d{4})\b/);
  return match ? Number(match[1]) : null;
}

function normalizeEventItem(item: any) {
  return {
    ...item,
    source: "bt_event",
    canOpen: true,
  };
}

function normalizeClubTournamentItem(item: any) {
  const startDate = item?.startDate ?? item?.start_date ?? null;
  const endDate = item?.endDate ?? item?.end_date ?? null;

  return {
    id: `club-tournament:${item?.documentId ?? item?.id}`,
    documentId: item?.documentId ?? String(item?.id ?? ""),
    source: "club_tournament",
    canOpen: true,
    title: item?.title ?? "Club tournament",
    game_type: item?.game_type ?? null,
    season: readDateYear(startDate),
    start_date: startDate,
    end_date: endDate,
    tournament: item?.slug
      ? {
          slug: item.slug,
          documentId: item?.documentId ?? null,
        }
      : null,
  };
}

function sortTournamentItems(left: any, right: any) {
  const leftDate = left?.start_date ? new Date(left.start_date).getTime() : 0;
  const rightDate = right?.start_date
    ? new Date(right.start_date).getTime()
    : 0;
  if (rightDate !== leftDate) return rightDate - leftDate;
  return String(left?.title ?? "").localeCompare(String(right?.title ?? ""));
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = toPositiveInt(searchParams.get("page"), 1);
    const pageSize = toPositiveInt(searchParams.get("pageSize"), 10);
    const season = searchParams.get("season");
    const search = searchParams.get("q")?.trim() ?? null;
    const clubSlug = searchParams.get("clubSlug");
    const federationId = searchParams.get("federationId");

    if (clubSlug && !federationId) {
      const pageSizeForMerge = 500;
      const searchTokens = tokenizeSearch(search).map(normalizeToken);

      const eventParams = new URLSearchParams();
      eventParams.set("pagination[page]", "1");
      eventParams.set("pagination[pageSize]", String(pageSizeForMerge));
      eventParams.set("sort[0]", "start_date:desc");
      eventParams.set("fields[0]", "title");
      eventParams.set("fields[1]", "season");
      eventParams.set("fields[2]", "start_date");
      eventParams.set("fields[3]", "end_date");
      eventParams.set("fields[4]", "documentId");
      eventParams.set("fields[5]", "game_type");
      eventParams.set("populate[tournament][fields][0]", "slug");
      eventParams.set("filters[tournament][club][slug][$eq]", clubSlug);

      let eventAndIndex = 0;
      for (const token of searchTokens) {
        if (token === "season") continue;
        if (/^\d{4}$/.test(token)) {
          eventParams.set(
            `filters[$and][${eventAndIndex}][season][$eq]`,
            token,
          );
          eventAndIndex++;
          continue;
        }
        eventParams.set(
          `filters[$and][${eventAndIndex}][$or][0][title][$containsi]`,
          token,
        );
        eventParams.set(
          `filters[$and][${eventAndIndex}][$or][1][game_type][$containsi]`,
          token,
        );
        eventAndIndex++;
      }
      if (season) {
        eventParams.set("filters[season][$eq]", season);
      }

      const tournamentParams = new URLSearchParams();
      tournamentParams.set("pagination[page]", "1");
      tournamentParams.set("pagination[pageSize]", String(pageSizeForMerge));
      tournamentParams.set("sort[0]", "startDate:desc");
      tournamentParams.set("fields[0]", "title");
      tournamentParams.set("fields[1]", "slug");
      tournamentParams.set("fields[2]", "documentId");
      tournamentParams.set("fields[3]", "startDate");
      tournamentParams.set("fields[4]", "endDate");
      tournamentParams.set("fields[5]", "game_type");
      tournamentParams.set("filters[club][slug][$eq]", clubSlug);
      tournamentParams.set("populate[bt_event][fields][0]", "documentId");

      let tournamentAndIndex = 0;
      for (const token of searchTokens) {
        if (token === "season" || /^\d{4}$/.test(token)) continue;
        tournamentParams.set(
          `filters[$and][${tournamentAndIndex}][$or][0][title][$containsi]`,
          token,
        );
        tournamentParams.set(
          `filters[$and][${tournamentAndIndex}][$or][1][game_type][$containsi]`,
          token,
        );
        tournamentAndIndex++;
      }

      const fetchFromStrapi = async (path: string, useAuth: boolean) => {
        const headers: HeadersInit = {};
        if (useAuth && STRAPI_API_TOKEN) {
          headers.Authorization = `Bearer ${STRAPI_API_TOKEN}`;
        }
        return fetch(`${STRAPI_URL}/api/${path}`, {
          cache: "no-store",
          headers,
        });
      };

      const fetchCollection = async (path: string) => {
        let res = await fetchFromStrapi(path, Boolean(STRAPI_API_TOKEN)).catch(
          () => null,
        );
        if ((!res || !res.ok) && STRAPI_API_TOKEN) {
          res = await fetchFromStrapi(path, false).catch(() => null);
        }
        if (!res?.ok) return [];
        const json = await res.json().catch(() => null);
        return Array.isArray(json?.data) ? json.data : [];
      };

      const [eventRows, tournamentRows] = await Promise.all([
        fetchCollection(`bt-events?${eventParams.toString()}`),
        fetchCollection(`tournaments?${tournamentParams.toString()}`),
      ]);
      const localRows = tournamentRows
        .filter((item: any) => !item?.bt_event?.documentId)
        .map(normalizeClubTournamentItem)
        .filter((item: any) => !season || String(item.season ?? "") === season);
      const merged = [...eventRows.map(normalizeEventItem), ...localRows].sort(
        sortTournamentItems,
      );
      const total = merged.length;
      const pageCount = Math.max(1, Math.ceil(total / pageSize));
      const start = (page - 1) * pageSize;
      const data = merged.slice(start, start + pageSize);

      return NextResponse.json({
        data,
        meta: {
          pagination: {
            page,
            pageSize,
            pageCount,
            total,
          },
        },
      });
    }

    const queryParams = new URLSearchParams();
    queryParams.set("pagination[page]", page.toString());
    queryParams.set("pagination[pageSize]", pageSize.toString());
    queryParams.set("sort[0]", "start_date:desc");
    queryParams.set("fields[0]", "title");
    queryParams.set("fields[1]", "season");
    queryParams.set("fields[2]", "start_date");
    queryParams.set("fields[3]", "end_date");
    queryParams.set("fields[4]", "documentId");
    queryParams.set("fields[5]", "game_type");
    queryParams.set("populate[tournament][fields][0]", "slug");

    if (season) {
      queryParams.set("filters[season][$eq]", season);
    }
    const searchTokens = tokenizeSearch(search).map(normalizeToken);
    let andIndex = 0;
    for (const token of searchTokens) {
      // keyword only, ignore as filter token
      if (token === "season") continue;

      // "2026 3 cushion" => season + text filters
      if (/^\d{4}$/.test(token)) {
        queryParams.set(`filters[$and][${andIndex}][season][$eq]`, token);
        andIndex++;
        continue;
      }

      queryParams.set(
        `filters[$and][${andIndex}][$or][0][title][$containsi]`,
        token,
      );
      queryParams.set(
        `filters[$and][${andIndex}][$or][1][game_type][$containsi]`,
        token,
      );
      andIndex++;
    }
    if (clubSlug) {
      queryParams.set("filters[tournament][club][slug][$eq]", clubSlug);
    }
    if (federationId) {
      queryParams.set(
        "filters[tournament][organizer_federation][documentId][$eq]",
        federationId,
      );
    }

    const url = `${STRAPI_URL}/api/bt-events?${queryParams.toString()}`;

    const fetchFromStrapi = async (useAuth: boolean) => {
      const headers: HeadersInit = {};
      if (useAuth && STRAPI_API_TOKEN) {
        headers.Authorization = `Bearer ${STRAPI_API_TOKEN}`;
      }
      return fetch(url, {
        cache: "no-store",
        headers,
      });
    };

    let res: Response;
    try {
      res = await fetchFromStrapi(Boolean(STRAPI_API_TOKEN));
    } catch (error) {
      console.error("[tournaments][GET] upstream unavailable:", error);
      return NextResponse.json(emptyPayload(page, pageSize), { status: 200 });
    }

    if (!res.ok && STRAPI_API_TOKEN) {
      try {
        const retry = await fetchFromStrapi(false);
        if (retry.ok) {
          res = retry;
        } else {
          const retryText = await retry.text().catch(() => "");
          console.error(
            "[tournaments][GET] retry failed:",
            retry.status,
            retryText,
          );
          return NextResponse.json(emptyPayload(page, pageSize), {
            status: 200,
          });
        }
      } catch (error) {
        console.error("[tournaments][GET] retry upstream unavailable:", error);
        return NextResponse.json(emptyPayload(page, pageSize), { status: 200 });
      }
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[tournaments][GET] Error response:", res.status, text);
      return NextResponse.json(emptyPayload(page, pageSize), { status: 200 });
    }

    const text = await res.text();
    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[tournaments][GET]", error);
    const page = toPositiveInt(req.nextUrl.searchParams.get("page"), 1);
    const pageSize = toPositiveInt(
      req.nextUrl.searchParams.get("pageSize"),
      10,
    );
    return NextResponse.json(emptyPayload(page, pageSize), { status: 200 });
  }
}
