"use client";

import { Suspense, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const DEFAULT_TABLES = ["1", "2", "3", "4"];
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
    } else if (requestedSrc && isAllowedEmbedUrl(requestedSrc)) {
      params.set("src", requestedSrc);
    }
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
            ) : null}
          </div>
        </div>

        <section className="flex flex-1 items-center">
          {isMultiview ? (
            <div className="grid w-full gap-3 lg:grid-cols-2">
              {DEFAULT_TABLES.map((tableOption) => (
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
