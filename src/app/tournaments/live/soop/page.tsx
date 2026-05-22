"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const DEFAULT_TABLES = ["1", "2", "3", "4", "5", "6", "7", "8"];
const DEFAULT_TABLE = "1";
const MAX_MULTIVIEW_TABLES = 4;

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

const soopEmbedUrlForTable = (table: string) =>
  `https://play.sooplive.com/afbilliards${encodeURIComponent(
    table || DEFAULT_TABLE,
  )}/embed`;

const parseSelectedTables = (value: string | null | undefined) => {
  const selected = String(value || "")
    .split(",")
    .map(normalizeTable)
    .filter((table) => DEFAULT_TABLES.includes(table));
  return Array.from(new Set(selected)).slice(0, MAX_MULTIVIEW_TABLES);
};

const formatSelectedTablesLabel = (tables: string[]) =>
  `${tables.length === 1 ? "Table" : "Tables"} ${tables.join(", ")}`;

function SoopLiveTableContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const multiviewRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const requestedSrc = searchParams.get("src")?.trim() || "";
  const table = normalizeTable(searchParams.get("table") || DEFAULT_TABLE);
  const requestedView = searchParams.get("view")?.toLowerCase() || "";
  const isMultiview =
    searchParams.get("multiview") === "1" ||
    requestedView === "multi" ||
    requestedView === "multiview";
  const selectedTables = useMemo(() => {
    const selected = parseSelectedTables(searchParams.get("tables"));
    return selected.length > 0
      ? selected
      : DEFAULT_TABLES.slice(0, MAX_MULTIVIEW_TABLES);
  }, [searchParams]);

  const availableTables = useMemo(() => {
    const tableSet = new Set(DEFAULT_TABLES);
    if (table) tableSet.add(table);
    return Array.from(tableSet).sort((left, right) => {
      const leftNumber = Number(left);
      const rightNumber = Number(right);
      if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
        return leftNumber - rightNumber;
      }
      return left.localeCompare(right);
    });
  }, [table]);

  const handleTableChange = (nextTable: string) => {
    const params = new URLSearchParams();
    params.set("table", nextTable);
    if (requestedSrc && isAllowedEmbedUrl(requestedSrc)) {
      params.set("src", requestedSrc);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleViewChange = (nextMultiview: boolean) => {
    const params = new URLSearchParams();
    params.set("table", table || DEFAULT_TABLE);
    if (nextMultiview) {
      params.set("view", "multiview");
      params.set("tables", selectedTables.join(","));
    } else if (requestedSrc && isAllowedEmbedUrl(requestedSrc)) {
      params.set("src", requestedSrc);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSelectedTableToggle = (tableOption: string) => {
    const nextSelected = selectedTables.includes(tableOption)
      ? selectedTables.filter((selectedTable) => selectedTable !== tableOption)
      : selectedTables.length < MAX_MULTIVIEW_TABLES
        ? [...selectedTables, tableOption]
        : selectedTables;
    if (nextSelected.length === 0) return;

    const params = new URLSearchParams();
    params.set("table", table || DEFAULT_TABLE);
    params.set("view", "multiview");
    params.set("tables", nextSelected.join(","));
    router.push(`${pathname}?${params.toString()}`);
  };

  const soopEmbedUrl =
    requestedSrc && isAllowedEmbedUrl(requestedSrc)
      ? requestedSrc
      : soopEmbedUrlForTable(table);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === multiviewRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleFullscreenToggle = async () => {
    const element = multiviewRef.current;
    if (!element) return;
    if (document.fullscreenElement === element) {
      await document.exitFullscreen();
      return;
    }
    await element.requestFullscreen();
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-3 px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-base font-semibold sm:text-lg">Live video</h1>
          <div className="flex items-center gap-2">
            <div className="inline-flex h-9 overflow-hidden rounded border border-white/10 bg-neutral-900 text-sm font-semibold">
              <button
                type="button"
                onClick={() => handleViewChange(false)}
                className={`px-3 transition ${
                  isMultiview
                    ? "text-neutral-300 hover:bg-white/10"
                    : "bg-white text-neutral-950"
                }`}
                aria-pressed={!isMultiview}
              >
                Single
              </button>
              <button
                type="button"
                onClick={() => handleViewChange(true)}
                className={`border-l border-white/10 px-3 transition ${
                  isMultiview
                    ? "bg-white text-neutral-950"
                    : "text-neutral-300 hover:bg-white/10"
                }`}
                aria-pressed={isMultiview}
              >
                Multiview
              </button>
            </div>
            {!isMultiview ? (
              <select
                value={table}
                onChange={(event) => handleTableChange(event.target.value)}
                className="h-9 rounded border border-white/10 bg-neutral-900 px-3 text-sm font-semibold text-white outline-none transition hover:bg-neutral-800 focus:border-cyan-300"
                aria-label="Select table"
              >
                {availableTables.map((tableOption) => (
                  <option key={tableOption} value={tableOption}>
                    Table {tableOption}
                  </option>
                ))}
              </select>
            ) : (
              <div className="relative">
                <details className="group">
                  <summary className="flex h-9 cursor-pointer list-none items-center rounded border border-white/10 bg-neutral-900 px-3 text-sm font-semibold text-white outline-none transition hover:bg-neutral-800 focus:border-cyan-300">
                    {formatSelectedTablesLabel(selectedTables)}
                  </summary>
                  <div className="absolute right-0 z-20 mt-2 w-48 rounded border border-white/10 bg-neutral-950 p-2 shadow-2xl">
                    {DEFAULT_TABLES.map((tableOption) => {
                      const checked = selectedTables.includes(tableOption);
                      const disabled =
                        !checked && selectedTables.length >= MAX_MULTIVIEW_TABLES;
                      return (
                        <label
                          key={tableOption}
                          className={`flex items-center gap-2 rounded px-2 py-2 text-sm font-semibold ${
                            disabled
                              ? "cursor-not-allowed text-neutral-500"
                              : "cursor-pointer text-white hover:bg-white/10"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => handleSelectedTableToggle(tableOption)}
                            className="h-4 w-4 accent-cyan-300"
                          />
                          <span>Table {tableOption}</span>
                        </label>
                      );
                    })}
                    <div className="border-t border-white/10 px-2 pt-2 text-xs text-neutral-400">
                      Select up to {MAX_MULTIVIEW_TABLES}
                    </div>
                  </div>
                </details>
              </div>
            )}
            {isMultiview ? (
              <button
                type="button"
                onClick={handleFullscreenToggle}
                className="h-9 rounded border border-white/10 bg-neutral-900 px-3 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:border-cyan-300"
                aria-pressed={isFullscreen}
              >
                {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              </button>
            ) : null}
          </div>
        </div>

        <section className="flex flex-1 items-center">
          {isMultiview ? (
            <div
              ref={multiviewRef}
              className="relative w-full bg-black p-0 fullscreen:flex fullscreen:h-screen fullscreen:items-start fullscreen:p-3"
            >
              <div className="grid w-full gap-3 fullscreen:h-full fullscreen:gap-3 lg:grid-cols-2">
                {selectedTables.map((tableOption) => (
                  <div
                    key={tableOption}
                    className="overflow-hidden border border-white/10 bg-black fullscreen:flex fullscreen:min-h-0 fullscreen:flex-col"
                  >
                    <div className="border-b border-white/10 bg-neutral-950 px-3 py-2 text-sm font-semibold fullscreen:shrink-0 fullscreen:py-1">
                      Table {tableOption}
                    </div>
                    <div className="aspect-video w-full fullscreen:min-h-0 fullscreen:flex-1 fullscreen:aspect-auto">
                      <iframe
                        src={soopEmbedUrlForTable(tableOption)}
                        title={`SOOP live video table ${tableOption}`}
                        className="h-full w-full"
                        allowFullScreen
                        allow="autoplay; fullscreen; picture-in-picture"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {selectedTables.length >= MAX_MULTIVIEW_TABLES ? (
                <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/80 p-3 shadow-[0_0_36px_rgba(0,0,0,0.8)] fullscreen:flex lg:flex">
                  <img
                    src="/logo-billiardtoday.png"
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="w-full overflow-hidden bg-black">
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
          )}
        </section>
      </div>
    </main>
  );
}

export default function SoopLiveTablePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black text-white">
          Loading...
        </main>
      }
    >
      <SoopLiveTableContent />
    </Suspense>
  );
}
