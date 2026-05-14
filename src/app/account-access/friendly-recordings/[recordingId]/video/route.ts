import { NextResponse } from "next/server";
import { SERVER_API_URL } from "@/lib/api";

export const dynamic = "force-dynamic";

const INITIAL_VIDEO_CHUNK_BYTES = 1024 * 1024;

function boundedInitialRange(range: string | null) {
  const trimmed = range?.trim();
  if (!trimmed) return `bytes=0-${INITIAL_VIDEO_CHUNK_BYTES - 1}`;

  const openEnded = trimmed.match(/^bytes=(\d+)-$/i);
  if (!openEnded) return trimmed;

  const start = Number(openEnded[1]);
  if (!Number.isSafeInteger(start) || start < 0) return trimmed;
  return `bytes=${start}-${start + INITIAL_VIDEO_CHUNK_BYTES - 1}`;
}

type Context = {
  params: Promise<{ recordingId: string }>;
};

export async function GET(req: Request, context: Context) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();
  const auth = req.headers.get("authorization") || (token ? `Bearer ${token}` : null);
  if (!auth) {
    return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
  }

  const { recordingId } = await context.params;
  const headers: Record<string, string> = { Authorization: auth };
  headers.Range = boundedInitialRange(req.headers.get("range"));

  const res = await fetch(
    `${SERVER_API_URL}/api/player-accounts/friendly-recordings/${encodeURIComponent(recordingId)}/video`,
    {
      cache: "no-store",
      headers,
    },
  );

  if (!res.body) {
    return new NextResponse(await res.text().catch(() => ""), { status: res.status });
  }

  const responseHeaders = new Headers();
  for (const key of ["accept-ranges", "cache-control", "content-length", "content-range", "content-type"]) {
    const value = res.headers.get(key);
    if (value) responseHeaders.set(key, value);
  }
  responseHeaders.set("Content-Disposition", "inline");
  responseHeaders.set("X-Accel-Buffering", "no");

  return new NextResponse(res.body, {
    status: res.status,
    headers: responseHeaders,
  });
}
