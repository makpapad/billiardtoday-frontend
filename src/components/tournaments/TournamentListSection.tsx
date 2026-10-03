"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { CmsAppearance, CmsTournamentListSection } from "@/lib/cms/types";
import { getCmsContainerStyle } from "@/lib/cms/layout";
import { TournamentViewToggle, useTournamentView } from "@/components/tournaments/TournamentViewToggle";
import {
  TournamentCollection,
  tournamentStatus,
} from "@/components/tournaments/TournamentCollection";
import {
  getCmsSectionPaddingClass,
  getCmsSectionSurfaceStyle,
} from "@/lib/cms/sectionStyles";
import { buildTournamentHref } from "@/lib/tournaments";

type Tournament = {
  id: string;
  documentId: string;
  source?: "bt_event" | "club_tournament";
  canOpen?: boolean;
  title: string;
  game_type?: string | null;
  season: number | null;
  start_date: string | null;
  end_date: string | null;
  tournament?: {
    slug?: string | null;
    data?: {
      slug?: string | null;
      attributes?: {
        slug?: string | null;
      } | null;
    } | null;
    attributes?: {
      slug?: string | null;
    } | null;
  } | null;
};

type TournamentResponse = {
  data: Tournament[];
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
};

type Props = {
  section: CmsTournamentListSection;
  appearance: CmsAppearance;
  embedded?: boolean;
  clubSlug?: string;
  federationId?: string;
  /** Εμφάνιση διακόπτη λίστας/καρτών (προεπιλογή: λίστα). */
  allowViewToggle?: boolean;
};

const EMPTY_PAGINATION = {
  page: 1,
  pageSize: 20,
  pageCount: 1,
  total: 0,
};

const toPositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveTournamentCanonicalId = (item: Tournament) =>
  item.tournament?.slug ||
  item.tournament?.attributes?.slug ||
  item.tournament?.data?.slug ||
  item.tournament?.data?.attributes?.slug ||
  item.documentId;

const canOpenTournament = (item: Tournament) => item.canOpen !== false;

export function TournamentListSection({
  section,
  appearance,
  embedded = false,
  clubSlug,
  federationId,
  allowViewToggle = false,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Tournament[]>([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seasonInput, setSeasonInput] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const itemsPerPage =
    section.itemsPerPage && section.itemsPerPage > 0
      ? section.itemsPerPage
      : 20;
  const initialPage = toPositiveInt(searchParams?.get("page") ?? null, 1);
  const initialSeason = searchParams?.get("season") || "";
  const initialQuery = searchParams?.get("q") || "";
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [debouncedSeason, setDebouncedSeason] = useState(initialSeason);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [view, setView] = useTournamentView(section.layout === "cards" ? "cards" : "table");
  const useTitleLink =
    (embedded ||
      pathname === "/tournaments" ||
      pathname === "/embed/tournaments" ||
      pathname?.startsWith("/federations/")) &&
    section.showResultsLink;
  const { tokens } = appearance;

  useEffect(() => {
    setSeasonInput(initialSeason);
    setSearchInput(initialQuery);
  }, [initialSeason, initialQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSeason(seasonInput.trim());
      setDebouncedQuery(searchInput.trim());
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [seasonInput, searchInput]);

  useEffect(() => {
    let mounted = true;

    const fetchTournaments = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", String(currentPage));
        params.set("pageSize", String(itemsPerPage));
        if (debouncedSeason) params.set("season", debouncedSeason);
        if (debouncedQuery) params.set("q", debouncedQuery);
        if (clubSlug) params.set("clubSlug", clubSlug);
        if (federationId) params.set("federationId", federationId);

        const response = await fetch(`/api/tournaments?${params.toString()}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new Error(errorText || "Failed to fetch tournaments");
        }

        const payload = (await response.json()) as TournamentResponse;
        if (!mounted) return;

        setItems(Array.isArray(payload.data) ? payload.data : []);
        setPagination(
          payload.meta?.pagination || {
            ...EMPTY_PAGINATION,
            pageSize: itemsPerPage,
          },
        );
      } catch (fetchError) {
        if (!mounted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to fetch tournaments",
        );
        setItems([]);
        setPagination({ ...EMPTY_PAGINATION, pageSize: itemsPerPage });
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchTournaments();

    return () => {
      mounted = false;
    };
  }, [
    currentPage,
    debouncedSeason,
    debouncedQuery,
    itemsPerPage,
    clubSlug,
    federationId,
  ]);

  const tournamentEventHref = (
    eventDocumentId: string,
    title: string,
    season: number | null,
    tournamentSlug?: string | null,
  ) =>
    buildTournamentHref(
      tournamentSlug || eventDocumentId,
      title,
      season,
      embedded,
    );

  const tournamentHrefForItem = (item: Tournament) => {
    return tournamentEventHref(
      item.documentId,
      item.title,
      item.season,
      resolveTournamentCanonicalId(item),
    );
  };

  const sectionRef = useRef<HTMLElement | null>(null);
  const didMountRef = useRef(false);

  // Keep ?page= in the URL (shareable / survives refresh) without triggering a
  // router navigation, which would re-run the CMS server fetch on every click.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (currentPage > 1) {
      url.searchParams.set("page", String(currentPage));
    } else {
      url.searchParams.delete("page");
    }
    window.history.replaceState(window.history.state, "", url.toString());
  }, [currentPage]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentPage]);

  const pageNumbers = useMemo<(number | "ellipsis")[]>(() => {
    const pageCount = pagination.pageCount;
    const current = pagination.page;
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, index) => index + 1);
    }

    const pages: (number | "ellipsis")[] = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(pageCount - 1, current + 1);
    if (start > 2) pages.push("ellipsis");
    for (let value = start; value <= end; value += 1) pages.push(value);
    if (end < pageCount - 1) pages.push("ellipsis");
    pages.push(pageCount);
    return pages;
  }, [pagination.page, pagination.pageCount]);

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > pagination.pageCount) return;
    if (nextPage === currentPage) return;
    setCurrentPage(nextPage);
  };

  const wrapperClass = embedded
    ? "px-4 py-0 sm:px-6"
    : `px-4 ${getCmsSectionPaddingClass(section.paddingY)} sm:px-6`;

  const panelClass = embedded
    ? "rounded-[24px] border border-black/5 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]"
    : "rounded-[28px] border border-black/5 bg-white shadow-[0_18px_70px_rgba(15,23,42,0.08)]";

  return (
    <section
      ref={sectionRef}
      className={wrapperClass}
      style={getCmsSectionSurfaceStyle(section, appearance)}
    >
      <div className="mx-auto" style={getCmsContainerStyle(appearance, "page")}>
        {section.title || section.subtitle ? (
          <div className="mb-8">
            {section.title ? (
              <h2
                className="text-3xl font-semibold tracking-tight sm:text-4xl"
                style={{ fontFamily: tokens.headingFont }}
              >
                {section.title}
              </h2>
            ) : null}
            {section.subtitle ? (
              <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
                {section.subtitle}
              </p>
            ) : null}
          </div>
        ) : null}

        {section.showSeasonFilter ? (
          <div
            className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end"
            style={{ alignItems: "flex-end" }}
          >
            <div
              className="w-full sm:flex-none"
              style={{ width: "220px", maxWidth: "100%", flex: "0 0 220px" }}
            >
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Season
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={seasonInput}
                  onChange={(event) => setSeasonInput(event.target.value)}
                  placeholder="e.g. 2025"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
                {seasonInput ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSeasonInput("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                    aria-label="Clear season"
                    title="Clear season"
                  >
                    X
                  </button>
                ) : null}
              </div>
            </div>
            <div
              className="w-full sm:flex-none"
              style={{ width: "320px", maxWidth: "100%", flex: "0 0 320px" }}
            >
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Title or Game Type
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="e.g. 3 cushion"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
                {searchInput ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    X
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {allowViewToggle ? (
          <div className="mb-4 flex justify-end">
            <TournamentViewToggle mode={view} onChange={setView} />
          </div>
        ) : null}

        {isLoading && items.length === 0 ? (
          <div
            className={`${panelClass} px-6 py-10 text-center text-sm text-slate-500`}
          >
            Loading tournaments...
          </div>
        ) : error ? (
          <div
            className={`${panelClass} px-6 py-10 text-center text-sm text-red-600`}
          >
            {error}
          </div>
        ) : items.length === 0 ? (
          <div
            className={`${panelClass} px-6 py-10 text-center text-sm text-slate-500`}
          >
            {section.emptyStateText || "No tournaments found."}
          </div>
        ) : (
          <TournamentCollection
            view={view}
            items={items.map((item) => {
              const openable = canOpenTournament(item);
              const href = useTitleLink && openable ? tournamentHrefForItem(item) : null;
              const actionHref =
                section.showResultsLink && !useTitleLink && openable
                  ? tournamentHrefForItem(item)
                  : null;
              return {
                key: item.documentId,
                title: item.title,
                href,
                gameType: item.game_type || null,
                season: item.season,
                startDate: section.showDate ? item.start_date : null,
                endDate: section.showDate ? item.end_date : null,
                status: section.showStatus
                  ? tournamentStatus(item.start_date, item.end_date)
                  : null,
                resultsHref: actionHref,
                note:
                  section.showResultsLink && !useTitleLink && !openable
                    ? "Club tournament"
                    : null,
              };
            })}
          />
        )}

        {pagination.pageCount > 1 ? (
          <div className="mt-6 flex flex-col gap-3 rounded-[24px] border border-black/5 bg-white px-5 py-4 text-sm text-slate-600 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between">
            <div>
              Page <span className="font-semibold">{pagination.page}</span> of{" "}
              <span className="font-semibold">{pagination.pageCount}</span>
              {" · "}
              {pagination.total} tournaments
            </div>
            <nav
              className="flex flex-wrap items-center gap-2"
              aria-label="Tournament list pagination"
            >
              <button
                type="button"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              {pageNumbers.map((entry, index) =>
                entry === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-1 font-semibold text-slate-400"
                    aria-hidden="true"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => handlePageChange(entry)}
                    aria-current={entry === pagination.page ? "page" : undefined}
                    className={
                      entry === pagination.page
                        ? "rounded-full bg-slate-900 px-3.5 py-2 font-semibold text-white"
                        : "rounded-full border border-slate-200 px-3.5 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
                    }
                  >
                    {entry}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pageCount}
                className="rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </nav>
          </div>
        ) : null}
      </div>
    </section>
  );
}
