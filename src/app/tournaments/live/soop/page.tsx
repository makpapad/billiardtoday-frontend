"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { LiveSessionItem } from "@/components/live/types";

const DEFAULT_EVENT_ID = "ac6fd1dd-487b-409d-9424-606d8b683ed8";
const DEFAULT_COMPETITION_IDX = "204";
const DEFAULT_TABLE = "1";
const DEFAULT_SOOP_EMBED_URL =
  "https://play.sooplive.com/afbilliards1/294178879/embed";

type ExternalLiveTablesResponse = {
  data?: LiveSessionItem[];
  updatedAt?: string | null;
  sourceUrl?: string | null;
  error?: string;
  disabled?: boolean;
  configured?: boolean;
};

const normalizeTable = (value: string | null | undefined) =>
  String(value || "")
    .replace(/^table\s*/i, "")
    .trim();

const isAllowedEmbedUrl = (value: string) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname.endsWith("sooplive.com") ||
        url.hostname.endsWith("sooplive.co.kr"))
    );
  } catch {
    return false;
  }
};

const fallbackSoopEmbedUrlForTable = (table: string) =>
  `https://play.sooplive.com/afbilliards${encodeURIComponent(table || DEFAULT_TABLE)}/embed`;

function SoopLiveTableContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId")?.trim() || DEFAULT_EVENT_ID;
  const competitionIdx =
    searchParams.get("competitionIdx")?.trim() || DEFAULT_COMPETITION_IDX;
  const table = normalizeTable(searchParams.get("table") || DEFAULT_TABLE);
  const requestedSrc = searchParams.get("src")?.trim() || "";

  const [sessions, setSessions] = useState<LiveSessionItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const params = new URLSearchParams();
        params.set("competitionIdx", competitionIdx);
        const response = await fetch(
          `/api/tournaments/${encodeURIComponent(eventId)}/external-live-tables?${params.toString()}`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as ExternalLiveTablesResponse;
        if (cancelled) return;
        setSessions(Array.isArray(payload.data) ? payload.data : []);
        setUpdatedAt(payload.updatedAt || null);
        setError(
          payload.disabled
            ? "External live tables are disabled."
            : payload.error || null,
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load live score");
          setSessions([]);
          setUpdatedAt(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    const interval = window.setInterval(load, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [competitionIdx, eventId]);

  const selectedSession = useMemo(() => {
    return (
      sessions.find((session) => normalizeTable(session.state.tableName) === table) ||
      sessions.find((session) => normalizeTable(session.screenId) === table) ||
      null
    );
  }, [sessions, table]);

  const state = selectedSession?.state;
  const sessionVideoUrl = selectedSession?.liveVideos?.find((video) => {
    const url = typeof video.url === "string" ? video.url.trim() : "";
    return url && isAllowedEmbedUrl(url);
  })?.url;
  const soopEmbedUrl =
    requestedSrc && isAllowedEmbedUrl(requestedSrc)
      ? requestedSrc
      : sessionVideoUrl || fallbackSoopEmbedUrlForTable(table) || DEFAULT_SOOP_EMBED_URL;
  const lastUpdatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleTimeString("el-GR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <main className="bg-neutral-950 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-7xl flex-col gap-5 px-4 py-4 lg:px-6">
        <section className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded border border-white/10 bg-black">
            <div className="aspect-video w-full">
              <iframe
                src={soopEmbedUrl}
                title="SOOP live video"
                className="h-full w-full"
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture"
              />
            </div>
          </div>

          <aside className="rounded border border-white/10 bg-neutral-900 p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">
                  Live score
                </p>
                <h1 className="text-xl font-semibold">Table {table}</h1>
              </div>
              <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase">
                Live
              </span>
            </div>

            {isLoading ? (
              <div className="rounded bg-white/5 p-4 text-sm text-neutral-300">
                Loading score...
              </div>
            ) : error ? (
              <div className="rounded border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
                {error}
              </div>
            ) : !state ? (
              <div className="rounded border border-white/10 bg-white/5 p-4 text-sm text-neutral-300">
                No live table found for table {table}.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded bg-white/5 p-3 text-sm text-neutral-300">
                  <div>{state.stageName || "Stage"}</div>
                  {state.groupName ? <div>{state.groupName}</div> : null}
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <PlayerBlock
                    align="left"
                    name={state.playerAName || "Player A"}
                    avg={state.avgFormattedA}
                    hr={state.bestRunA}
                  />
                  <div className="flex items-center gap-2 text-5xl font-black tabular-nums">
                    <span>{state.scoreA ?? 0}</span>
                    <span className="text-2xl text-neutral-500">:</span>
                    <span>{state.scoreB ?? 0}</span>
                  </div>
                  <PlayerBlock
                    align="right"
                    name={state.playerBName || "Player B"}
                    avg={state.avgFormattedB}
                    hr={state.bestRunB}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <Metric label="INN" value={state.inningsCount ?? 0} />
                  <Metric label="AVG A" value={state.avgFormattedA || "-"} />
                  <Metric label="AVG B" value={state.avgFormattedB || "-"} />
                </div>
              </div>
            )}

            <div className="mt-5 border-t border-white/10 pt-3 text-xs text-neutral-400">
              <div>Competition {competitionIdx}</div>
              {lastUpdatedLabel ? <div>Updated {lastUpdatedLabel}</div> : null}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function PlayerBlock({
  name,
  avg,
  hr,
  align,
}: {
  name: string;
  avg?: string;
  hr?: number;
  align: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div className="text-base font-semibold leading-tight">{name}</div>
      <div className="mt-2 text-xs uppercase tracking-wide text-neutral-400">
        Avg {avg || "-"} · HR {hr ?? 0}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded bg-white/5 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

export default function SoopLiveTablePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">
          Loading...
        </main>
      }
    >
      <SoopLiveTableContent />
    </Suspense>
  );
}
