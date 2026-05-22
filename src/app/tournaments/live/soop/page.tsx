"use client";

import { Suspense, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const DEFAULT_TABLES = ["1", "2", "3", "4", "5", "6", "7", "8"];
const DEFAULT_TABLE = "1";

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
  return Array.from(new Set(selected)).slice(0, 4);
};

function SoopLiveTableContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedSrc = searchParams.get("src")?.trim() || "";
  const table = normalizeTable(searchParams.get("table") || DEFAULT_TABLE);
  const requestedView = searchParams.get("view")?.toLowerCase() || "";
  const isMultiview =
    searchParams.get("multiview") === "1" ||
    requestedView === "multi" ||
    requestedView === "multiview";
  const selectedTables = useMemo(() => {
    const selected = parseSelectedTables(searchParams.get("tables"));
    return selected.length > 0 ? selected : DEFAULT_TABLES.slice(0, 4);
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
      : selectedTables.length < 4
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
                    Tables {selectedTables.join(", ")}
                  </summary>
                  <div className="absolute right-0 z-20 mt-2 w-48 rounded border border-white/10 bg-neutral-950 p-2 shadow-2xl">
                    {DEFAULT_TABLES.map((tableOption) => {
                      const checked = selectedTables.includes(tableOption);
                      const disabled = !checked && selectedTables.length >= 4;
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
                      Select up to 4
                    </div>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>

        <section className="flex flex-1 items-center">
          {isMultiview ? (
            <div className="grid w-full gap-3 lg:grid-cols-2">
              {selectedTables.map((tableOption) => (
                <div
                  key={tableOption}
                  className="overflow-hidden border border-white/10 bg-black"
                >
                  <div className="border-b border-white/10 bg-neutral-950 px-3 py-2 text-sm font-semibold">
                    Table {tableOption}
                  </div>
                  <div className="aspect-video w-full">
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
