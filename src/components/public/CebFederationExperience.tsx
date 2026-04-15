"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buildTournamentHref } from "@/lib/tournaments";
import type { Federation } from "@/lib/directory";
import { CountryFlag, PresentationHero, SectionHeading } from "@/components/public/PresentationBlocks";
import { CEB_MEMBER_PIN_POSITIONS } from "@/components/public/cebFederationMapData";

type TournamentItem = {
  documentId: string;
  title: string;
  season: number | null;
  start_date: string | null;
  end_date: string | null;
  game_type?: string | null;
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

type TournamentPayload = {
  data?: TournamentItem[];
  meta?: {
    pagination?: {
      page?: number;
      pageSize?: number;
      pageCount?: number;
      total?: number;
    };
  };
};

type RankingSeriesItem = {
  slug: string;
  title: string;
  description: string;
  federationSlug: string | null;
};

type HeroView = "network" | "tournaments" | "board" | "upcoming" | "rankings";

type Props = {
  federation: Federation;
  members: Federation[];
  embedded?: boolean;
};

type TabKey = "details" | "tournaments" | "clubs";

type BoardMember = {
  role: string;
  name: string;
  city: string;
  country: string;
  phone?: string | null;
  fax?: string | null;
  email?: string | null;
  imageUrl: string;
  imagePosition?: string;
};

const CEB_BOARD_MEMBERS: BoardMember[] = [
  {
    role: "President",
    name: "Diane Wild",
    city: "Lausanne",
    country: "Switzerland",
    phone: "+41 79 449 46 78",
    fax: "+41 21 351 42 05",
    email: "diane.wild@eurobillard.org",
    imageUrl: "https://www.eurobillard.org/medias/pages/board/csm-wild-5de63532ab.jpg",
  },
  {
    role: "Vice-President",
    name: "Carlos Borrell Danis",
    city: "Bözberg",
    country: "Switzerland",
    phone: "+41 564417219",
    email: "carlos.borrell@eurobillard.org",
    imageUrl: "https://www.eurobillard.org/medias/photos/carlos.jpg",
  },
  {
    role: "Secretary General",
    name: "Jean-Pierre Guiraud",
    city: "Vannes",
    country: "France",
    email: "jean-pierre.guiraud@eurobillard.org",
    imageUrl: "https://www.eurobillard.org/medias/photos/jpg.jpg",
  },
  {
    role: "Treasurer",
    name: "Rainer Selgrath",
    city: "St. Wendel",
    country: "Germany",
    phone: "+49 6851 5550",
    email: "rainer.selgrath@eurobillard.org",
    imageUrl: "https://www.eurobillard.org/medias/pages/board/rainer.png",
  },
  {
    role: "Sports Director",
    name: "Stefano Malacrita",
    city: "Rome",
    country: "Italy",
    phone: "+39 3478067556",
    email: "stefano.malacrita@eurobillard.org",
    imageUrl: "https://www.eurobillard.org/medias/pages/board/pic-3.jpg",
  },
  {
    role: "Youth Director",
    name: "Nikolaos Tremoulis",
    city: "Athens",
    country: "Greece",
    phone: "+30 6947521517",
    email: "nikos.tremoulis@eurobillard.org",
    imageUrl: "https://www.eurobillard.org/medias/photos/nick1.jpg",
    imagePosition: "center 1%",
  },
  {
    role: "Board Member",
    name: "Ümit Özkul",
    city: "Atakum / Samsun",
    country: "Turkiye",
    phone: "+90 532 615 61 03",
    fax: "+90 362 435 42 80",
    email: "umit.ozkul@eurobillard.org",
    imageUrl: "https://www.eurobillard.org/medias/photos/umit.jpg",
  },
  {
    role: "Board Member",
    name: "Francesco Volino",
    city: "Milan",
    country: "Italy",
    phone: "+39 335 582 2919",
    email: "francesco.volino@eurobillard.org",
    imageUrl: "https://www.eurobillard.org/medias/photos/volino.jpeg",
  },
  {
    role: "Marketing / Communications Manager",
    name: "Ninad Vardam",
    city: "Lausanne",
    country: "Switzerland",
    email: "ninad.vardam@billiards.sport",
    imageUrl: "https://www.eurobillard.org/medias/pages/board/ninad-vardam-700x980.jpg",
  },
];

const resolveLogoUrl = (value: Federation["logo"]): string | null => {
  if (!value?.url) return null;
  return value.url.startsWith("http")
    ? value.url
    : `https://app.billiardtoday.com${value.url.startsWith("/") ? value.url : `/${value.url}`}`;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "Date pending";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCalendarDay = (value: string | null | undefined) => {
  if (!value) return { day: "--", month: "TBD" };
  const date = new Date(value);
  return {
    day: date.toLocaleDateString("en-GB", { day: "2-digit" }),
    month: date.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
  };
};

const formatMonthHeading = (value: string) => {
  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
};

const getStatus = (startDate: string | null | undefined, endDate: string | null | undefined) => {
  const now = Date.now();
  const start = startDate ? new Date(startDate).getTime() : null;
  const end = endDate ? new Date(endDate).getTime() : null;
  if (start && start > now) return "Upcoming";
  if (end && end < now) return "Completed";
  return "Live";
};

const buildClubHref = (slug?: string | null, documentId?: string | null, embedded = false) => {
  const target = slug || documentId;
  return target ? `${embedded ? "/embed" : ""}/clubs/${target}` : "#";
};

const resolveTournamentCanonicalId = (item: TournamentItem) =>
  item.tournament?.slug ||
  item.tournament?.attributes?.slug ||
  item.tournament?.data?.slug ||
  item.tournament?.data?.attributes?.slug ||
  item.documentId;

const DETAIL_FIELDS = [
  { key: "country", label: "Country" },
  { key: "city", label: "City" },
  { key: "address", label: "Address" },
  { key: "postalCode", label: "Postal code" },
  { key: "office", label: "Office" },
  { key: "contactEmail", label: "Email" },
  { key: "contactPhone", label: "Phone" },
  { key: "mobilePhone", label: "Mobile" },
  { key: "fax", label: "Fax" },
  { key: "website", label: "Website" },
  { key: "president", label: "President" },
  { key: "sportsDirector", label: "Sports director" },
  { key: "youthDirector", label: "Youth director" },
] as const;

async function fetchAllFederationTournaments(federationId: string): Promise<TournamentItem[]> {
  const pageSize = 100;
  let page = 1;
  let pageCount = 1;
  const allItems: TournamentItem[] = [];

  while (page <= pageCount) {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      federationId,
    });
    const response = await fetch(
      `/api/tournaments?${params.toString()}`,
      { cache: "no-store" },
    );
    const payload = (await response.json().catch(() => ({ data: [], meta: {} }))) as TournamentPayload;
    const items = Array.isArray(payload.data) ? payload.data : [];
    allItems.push(...items);
    pageCount = payload.meta?.pagination?.pageCount || 1;
    page += 1;
  }

  const seen = new Set<string>();
  return allItems.filter((item) => {
    if (!item.documentId || seen.has(item.documentId)) return false;
    seen.add(item.documentId);
    return true;
  });
}

export function CebFederationExperience({ federation, members, embedded = false }: Props) {
  const sortedMembers = [...members].sort((a, b) => a.name.localeCompare(b.name, "en"));
  const [rankingSeries, setRankingSeries] = useState<RankingSeriesItem[]>([]);
  const initialSelectedId = sortedMembers[0]?.documentId || null;
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [activeTab, setActiveTab] = useState<TabKey>("details");
  const [heroView, setHeroView] = useState<HeroView>("tournaments");
  const [tournaments, setTournaments] = useState<Record<string, TournamentItem[]>>({});
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const [cebTournaments, setCebTournaments] = useState<TournamentItem[] | null>(null);
  const [loadingCebTournaments, setLoadingCebTournaments] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<string>("all");
  const [selectedGameType, setSelectedGameType] = useState<string>("all");

  useEffect(() => {
    if (!selectedId || tournaments[selectedId]) return;

    let mounted = true;
    const load = async () => {
      setLoadingDocId(selectedId);
      try {
        const response = await fetch(`/api/tournaments?page=1&pageSize=8&federationId=${encodeURIComponent(selectedId)}`, {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({ data: [] }))) as TournamentPayload;
        if (!mounted) return;
        setTournaments((current) => ({
          ...current,
          [selectedId]: Array.isArray(payload.data) ? payload.data : [],
        }));
      } catch {
        if (!mounted) return;
        setTournaments((current) => ({ ...current, [selectedId]: [] }));
      } finally {
        if (mounted) {
          setLoadingDocId((current) => (current === selectedId ? null : current));
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [selectedId, tournaments]);

  useEffect(() => {
    if (cebTournaments !== null) return;

    let mounted = true;
    const load = async () => {
      setLoadingCebTournaments(true);
      try {
        if (!mounted) return;
        const items = await fetchAllFederationTournaments(federation.documentId);
        if (!mounted) return;
        setCebTournaments(items);
      } catch {
        if (!mounted) return;
        setCebTournaments([]);
      } finally {
        if (mounted) setLoadingCebTournaments(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [heroView, cebTournaments, federation.documentId]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await fetch("/api/rankings/series-index", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({ data: [] }))) as { data?: RankingSeriesItem[] };
        if (!mounted) return;
        const items = Array.isArray(payload.data) ? payload.data : [];
        setRankingSeries(items.filter((item) => item.federationSlug === federation.slug));
      } catch {
        if (!mounted) return;
        setRankingSeries([]);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [federation.slug]);

  const selectedFederation = sortedMembers.find((item) => item.documentId === selectedId) || sortedMembers[0] || null;
  const selectedTournaments = selectedFederation ? tournaments[selectedFederation.documentId] || [] : [];
  const cebLogoUrl = resolveLogoUrl(federation.logo) || "/img/logo/ceb.png";
  const selectedFederationLogoUrl = resolveLogoUrl(selectedFederation?.logo);
  const cebSeasonOptions = Array.from(
    new Set(
      (cebTournaments || [])
        .map((item) => item.season)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value)),
    ),
  ).sort((a, b) => b - a);
  const cebGameTypeOptions = Array.from(
    new Set(
      (cebTournaments || [])
        .map((item) => String(item.game_type || "").trim())
        .filter((value) => value.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b, "en"));
  const filteredCebTournaments = (cebTournaments || []).filter((item) => {
    const seasonMatch = selectedSeason === "all" || String(item.season || "") === selectedSeason;
    const gameTypeMatch = selectedGameType === "all" || String(item.game_type || "").trim() === selectedGameType;
    return seasonMatch && gameTypeMatch;
  });
  const upcomingCebTournaments = [...(cebTournaments || [])]
    .filter((item) => {
      const status = getStatus(item.start_date, item.end_date);
      return status === "Upcoming" || status === "Live";
    })
    .sort((a, b) => {
      const aTime = a.start_date ? new Date(a.start_date).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.start_date ? new Date(b.start_date).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
  const upcomingCalendarGroups = upcomingCebTournaments.reduce<
    Array<{ key: string; label: string; items: TournamentItem[] }>
  >((groups, item) => {
    const start = item.start_date ? new Date(item.start_date) : null;
    const key = start
      ? `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`
      : "date-pending";
    const existingGroup = groups.find((group) => group.key === key);
    if (existingGroup) {
      existingGroup.items.push(item);
      return groups;
    }
    groups.push({
      key,
      label: key === "date-pending" ? "Date pending" : formatMonthHeading(key),
      items: [item],
    });
    return groups;
  }, []);
  const leadershipMembers = CEB_BOARD_MEMBERS.slice(0, 6);
  const extendedBoardMembers = CEB_BOARD_MEMBERS.slice(6);

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 py-8 sm:px-6">
      <PresentationHero
        eyebrow="European Confederation"
        title={federation.name}
        description={
          heroView === "tournaments"
            ? "Browse the official tournament calendar organized directly by the CEB, including championships and major European events."
            : heroView === "rankings"
              ? "Access official CEB ranking pages built from published tournament standings, ranking points, and cumulative circuit averages."
            : heroView === "upcoming"
              ? "Track the next CEB events in a clean monthly calendar view, focused on upcoming and currently live competitions."
            : heroView === "board"
              ? "Meet the CEB leadership team through a dedicated board roster with portraits, roles, and direct contact details."
            : "Explore the European carom network through an interactive federation map. Select a country pin to inspect the national federation, review its tournaments, and browse its connected clubs."
        }
        actions={[]}
        actionSlot={
          <div className="inline-flex flex-wrap gap-2">
            {([
              ["tournaments", "Events"],
              ["rankings", "Rankings"],
              ["upcoming", "Upcoming"],
            ] as Array<[HeroView, string]>).map(([view, label]) => {
              const isActive = heroView === view;
              return (
                <button
                  key={view}
                  type="button"
                  onClick={() => setHeroView(view)}
                  className={`inline-flex rounded-full px-5 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-white text-slate-950"
                      : "border border-white/15 bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        }
        aside={
          <div className="grid gap-4">
            <div className="flex min-h-[180px] items-center justify-center rounded-[28px] border border-white/10 bg-white/10 p-6 backdrop-blur-sm">
              <img
                src={cebLogoUrl}
                alt={federation.logo?.name || `${federation.name} logo`}
                className="max-h-36 w-auto max-w-full object-contain"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[24px] border border-white/10 bg-slate-950/25 p-5 text-center backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Affiliated federations</div>
                <div className="mt-3 text-4xl font-semibold text-white">{sortedMembers.length}</div>
              </div>
              <button
                type="button"
                onClick={() => setHeroView("upcoming")}
                className="rounded-[24px] border border-white/10 bg-slate-950/25 p-5 text-center backdrop-blur-sm transition hover:bg-slate-950/35"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Upcoming Events</div>
              </button>
            </div>
          </div>
        }
      />

      {heroView === "network" ? (
      <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
        <SectionHeading
          eyebrow="Interactive map"
          title="National federations"
          description="Tap any federation pin on the Europe map to switch the content below between federation profile, official tournaments, and affiliated clubs."
        />

        <div className="grid gap-5 lg:grid-cols-[3fr_1fr]">
          <div className="rounded-[30px] border border-sky-100 bg-white p-3 sm:p-4">
            <div className="relative w-full overflow-hidden rounded-[24px] bg-white" style={{ minHeight: "740px" }}>
              <img
                src="/img/europe-map.webp"
                alt="Europe map"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_55%)]" />
              <div className="absolute bottom-4 left-0 top-16 z-10 hidden w-48 rounded-r-[28px] border border-l-0 border-white/35 bg-white/18 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur-xl lg:flex lg:flex-col">
                <div className="px-3 pb-1 pt-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-sky-950/75">
                  Countries
                </div>
                <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
                  {sortedMembers.map((member) => {
                    const isActive = member.documentId === selectedFederation?.documentId;
                    return (
                      <button
                        key={`map-list-${member.documentId}`}
                        type="button"
                        onClick={() => setSelectedId(member.documentId)}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition ${
                          isActive
                            ? "bg-white/55 text-slate-950"
                            : "text-slate-900 hover:bg-white/35"
                        }`}
                      >
                        <CountryFlag country={member.country || null} className="h-3.5 w-5 rounded-sm object-cover" />
                        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.04em]">
                          {member.country || "Country pending"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="absolute inset-0">
              {sortedMembers.map((member) => {
                const point = CEB_MEMBER_PIN_POSITIONS[member.slug as keyof typeof CEB_MEMBER_PIN_POSITIONS];
                if (!point) return null;
                const isActive = member.documentId === selectedFederation?.documentId;
                return (
                  <button
                    key={member.documentId}
                    type="button"
                    onClick={() => setSelectedId(member.documentId)}
                    className={`group absolute transition ${isActive ? "z-20" : "z-10"}`}
                    style={{
                      left: `${point.x}%`,
                      top: `${point.y}%`,
                      transform: `translate(calc(-50% + ${point.offsetX || 0}px), calc(-100% + ${point.offsetY || 0}px)) ${isActive ? "scale(1.08)" : "scale(1)"}`,
                      transformOrigin: "bottom center",
                    }}
                    aria-label={`Select ${member.name}`}
                  >
                    <span className="absolute bottom-[0.7rem] left-1/2 h-3 w-[2px] -translate-x-1/2 rounded-full bg-slate-900/55" />
                    <span className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-[3px] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.24)] sm:h-10 sm:w-10 ${isActive ? "border-sky-500 ring-4 ring-sky-200/85" : "border-white"}`}>
                      <CountryFlag country={member.country || null} className="h-full w-full object-cover" />
                    </span>
                    <span className="absolute bottom-[0.1rem] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 rounded-[2px] bg-white shadow-[0_6px_14px_rgba(15,23,42,0.2)]" />
                    <span className={`absolute bottom-[3.05rem] left-1/2 min-w-max -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold shadow-md transition sm:bottom-[3.3rem] ${isActive ? "bg-slate-950 text-white" : "bg-white/92 text-slate-700 opacity-0 group-hover:opacity-100"}`}>
                      {member.country || member.name}
                    </span>
                  </button>
                );
              })}
              </div>
              <div className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-white/70 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 shadow-sm backdrop-blur-sm sm:bottom-4 sm:left-4">
                CEB member map
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-sky-100 bg-sky-50/70 p-5">
              <div className="flex items-center gap-3">
                <CountryFlag country={selectedFederation?.country || null} className="h-7 w-10 rounded-md object-cover" />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                    {selectedFederation?.country || "Country pending"}
                  </div>
                  <div className="text-2xl font-semibold tracking-tight text-slate-950">
                    {selectedFederation?.name || "No federation selected"}
                  </div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-[22px] border border-white/70 bg-white p-4 text-center">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Clubs</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950">{selectedFederation?.clubCount || 0}</div>
                </div>
                <div className="rounded-[22px] border border-white/70 bg-white p-4 text-center">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Level</div>
                  <div className="mt-2 text-lg font-semibold capitalize text-slate-950">{selectedFederation?.level || "national"}</div>
                </div>
              </div>
            </div>

            {selectedFederationLogoUrl ? (
              <div
                key={`${selectedFederation?.documentId || "federation"}-${selectedFederationLogoUrl}`}
                className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]"
              >
                <div className="flex min-h-[164px] items-center justify-center rounded-[24px] border border-slate-200 bg-slate-50 p-6">
                  <img
                    key={selectedFederationLogoUrl}
                    src={selectedFederationLogoUrl}
                    alt={selectedFederation?.logo?.name || `${selectedFederation?.name || "Federation"} logo`}
                    className="max-h-28 w-auto max-w-full object-contain sm:max-h-32"
                  />
                </div>
              </div>
            ) : null}

            <div className="rounded-[28px] border border-black/5 bg-slate-950 p-5 text-white shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">How it works</div>
              <p className="mt-3 text-sm leading-7 text-white/75">
                The map is a federation selector. Each click swaps the profile panel below without leaving the CEB page.
              </p>
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {heroView === "tournaments" ? (
      <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Official calendar</div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{`${federation.name} tournaments`}</h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              Direct tournament calendar for events organized by the CEB itself.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex min-w-[180px] flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Season</span>
              <select
                value={selectedSeason}
                onChange={(event) => setSelectedSeason(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-300"
              >
                <option value="all">All seasons</option>
                {cebSeasonOptions.map((season) => (
                  <option key={season} value={String(season)}>
                    {season}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[180px] flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Game type</span>
              <select
                value={selectedGameType}
                onChange={(event) => setSelectedGameType(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-300"
              >
                <option value="all">All game types</option>
                {cebGameTypeOptions.map((gameType) => (
                  <option key={gameType} value={gameType}>
                    {gameType}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {loadingCebTournaments && cebTournaments === null ? (
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            Loading CEB tournaments...
          </div>
        ) : filteredCebTournaments.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCebTournaments.map((item) => {
              const status = getStatus(item.start_date, item.end_date);
              return (
                <Link
                  key={item.documentId}
                  href={buildTournamentHref(resolveTournamentCanonicalId(item), item.title, item.season, embedded)}
                  className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)] transition hover:border-sky-200 hover:bg-sky-50/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                        {item.game_type || "Tournament"}
                      </div>
                      <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">{item.title}</h3>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {status}
                    </span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span>Season {item.season || "-"}</span>
                    <span>{formatDate(item.start_date)}</span>
                    <span>{formatDate(item.end_date)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No CEB tournaments match the selected filters.
          </div>
        )}
      </section>
      ) : null}

      {heroView === "rankings" ? (
      <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="mb-6 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Official rankings</div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {`${federation.name} rankings`}
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-slate-600">
            Published ranking lists and circuit standings linked to the CEB competition calendar.
          </p>
        </div>

        {rankingSeries.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rankingSeries.map((series) => (
              <Link
                key={series.slug}
                href={`${embedded ? "/embed" : ""}/rankings/${series.slug}`}
                className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)] transition hover:border-sky-200 hover:bg-sky-50/30"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                  Ranking Series
                </div>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                  {series.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{series.description}</p>
                <div className="mt-5 text-sm font-semibold text-sky-700">Open ranking page</div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No public CEB rankings are available yet.
          </div>
        )}
      </section>
      ) : null}

      {heroView === "upcoming" ? (
      <section className="rounded-[32px] border border-black/5 bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_100%)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Upcoming events</div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">CEB competition calendar</h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              A month-by-month view of confirmed CEB events that are either upcoming or currently live, designed as a cleaner calendar snapshot than the full tournament listing.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-sky-100 bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">Schedule</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">Upcoming + Live</div>
              <div className="mt-1 text-sm text-slate-500">Completed tournaments stay in the full calendar only.</div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-950 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.12)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Navigation</div>
              <button
                type="button"
                onClick={() => setHeroView("tournaments")}
                className="mt-3 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Open full tournaments list
              </button>
            </div>
          </div>
        </div>

        {loadingCebTournaments && cebTournaments === null ? (
          <div className="rounded-[24px] border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
            Loading upcoming and live events...
          </div>
        ) : upcomingCalendarGroups.length > 0 ? (
          <div className="space-y-8">
            {upcomingCalendarGroups.map((group) => (
              <div key={group.key} className="rounded-[28px] border border-slate-200/80 bg-white/92 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.05)] sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Month</div>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{group.label}</h3>
                  </div>
                  <div className="rounded-full bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                    {group.items.length} event{group.items.length === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  {group.items.map((item) => {
                    const calendarDate = formatCalendarDay(item.start_date);
                    return (
                      <Link
                        key={item.documentId}
                        href={buildTournamentHref(resolveTournamentCanonicalId(item), item.title, item.season, embedded)}
                        className="grid gap-4 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_18px_48px_rgba(15,23,42,0.07)] sm:grid-cols-[90px_1fr]"
                      >
                        <div className="flex min-h-[90px] flex-col items-center justify-center rounded-[22px] bg-slate-950 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">{calendarDate.month}</div>
                          <div className="mt-2 text-4xl font-semibold leading-none">{calendarDate.day}</div>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                              {item.game_type || "Tournament"}
                            </span>
                            {item.season ? (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
                                Season {item.season}
                              </span>
                            ) : null}
                          </div>
                          <h4 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">{item.title}</h4>
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                            <span>{formatDate(item.start_date)}</span>
                            <span>{formatDate(item.end_date)}</span>
                          </div>
                          <div className="mt-4 text-sm font-semibold text-sky-700">Open event page</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
            No upcoming or live CEB events are available right now.
          </div>
        )}
      </section>
      ) : null}

      {heroView === "board" ? (
        <section
          id="ceb-board-members"
          className="rounded-[32px] border border-black/5 bg-[linear-gradient(180deg,rgba(248,250,252,0.96)_0%,rgba(239,246,255,0.96)_100%)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8"
        >
          <SectionHeading
            eyebrow="Leadership"
            title="CEB Board Members"
            description="The executive and board structure of the Confédération Européenne de Billard, presented as a dedicated roster with portraits and direct contact details."
          />

          <div className="grid gap-5 xl:grid-cols-3">
            {leadershipMembers.map((member) => (
              <article
                key={`${member.role}-${member.name}`}
                className="overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
              >
                <div className="relative aspect-[4/4.4] overflow-hidden bg-[linear-gradient(180deg,#dbeafe_0%,#eff6ff_100%)]">
                  <img
                    src={member.imageUrl}
                    alt={member.name}
                    className="h-full w-full object-cover"
                    style={member.imagePosition ? { objectPosition: member.imagePosition } : undefined}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent_0%,rgba(2,6,23,0.78)_100%)] p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">{member.role}</div>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">{member.name}</h3>
                    <div className="mt-1 text-sm text-white/80">{member.city}, {member.country}</div>
                  </div>
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                      {member.country}
                    </span>
                    {member.phone ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {member.phone}
                      </span>
                    ) : null}
                  </div>
                  <div className="grid gap-3 text-sm text-slate-600">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Location</div>
                      <div className="mt-1 font-medium text-slate-800">{member.city}, {member.country}</div>
                    </div>
                    {member.email ? (
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Email</div>
                        <a href={`mailto:${member.email}`} className="mt-1 block font-medium text-sky-700 hover:text-sky-900">
                          {member.email}
                        </a>
                      </div>
                    ) : null}
                    {member.fax ? (
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Fax</div>
                        <div className="mt-1 font-medium text-slate-800">{member.fax}</div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8">
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Board and communications</div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {extendedBoardMembers.map((member) => (
                <article
                  key={`${member.role}-${member.name}`}
                  className="flex gap-4 rounded-[26px] border border-white/70 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)]"
                >
                  <img
                    src={member.imageUrl}
                    alt={member.name}
                    className="h-28 w-24 flex-none rounded-[20px] object-cover"
                    style={member.imagePosition ? { objectPosition: member.imagePosition } : undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">{member.role}</div>
                    <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">{member.name}</h3>
                    <div className="mt-1 text-sm text-slate-600">{member.city}, {member.country}</div>
                    {member.phone ? <div className="mt-3 text-sm font-medium text-slate-700">{member.phone}</div> : null}
                    {member.email ? (
                      <a href={`mailto:${member.email}`} className="mt-2 block truncate text-sm font-medium text-sky-700 hover:text-sky-900">
                        {member.email}
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {heroView === "network" && selectedFederation ? (
        <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Federation profile</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{selectedFederation.name}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Review federation details, official tournament activity, and affiliated clubs from a single panel.
              </p>
            </div>
            <div className="w-full sm:w-auto">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Federation tabs
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(["details", "tournaments", "clubs"] as TabKey[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-2xl px-5 py-3 text-sm font-semibold capitalize transition ${
                    activeTab === tab
                      ? "bg-sky-600 text-white shadow-[0_10px_24px_rgba(2,132,199,0.28)]"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {tab === "details" ? "Federation details" : tab === "tournaments" ? "Official tournaments" : "Clubs"}
                </button>
              ))}
              </div>
            </div>
          </div>

          {activeTab === "details" ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {DETAIL_FIELDS.map(({ key, label }) => {
                const rawValue = selectedFederation[key];
                if (!rawValue) return null;
                const value =
                  key === "website" ? (
                    <a href={String(rawValue)} target="_blank" rel="noreferrer" className="text-sky-700 hover:text-sky-900">
                      {String(rawValue)}
                    </a>
                  ) : (
                    <span>{String(rawValue)}</span>
                  );

                return (
                  <div
                    key={key}
                    className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
                    <div className="mt-3 text-sm leading-7 text-slate-800">{value}</div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {activeTab === "tournaments" ? (
            <div className="mt-6">
              {loadingDocId === selectedFederation.documentId && !tournaments[selectedFederation.documentId] ? (
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                  Loading federation tournaments...
                </div>
              ) : selectedTournaments.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {selectedTournaments.map((item) => {
                    const status = getStatus(item.start_date, item.end_date);
                    return (
                      <Link
                        key={item.documentId}
                        href={buildTournamentHref(resolveTournamentCanonicalId(item), item.title, item.season, embedded)}
                        className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)] transition hover:border-sky-200 hover:bg-sky-50/30"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                              {item.game_type || "Tournament"}
                            </div>
                            <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">{item.title}</h3>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {status}
                          </span>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-600">
                          <span>Season {item.season || "-"}</span>
                          <span>{formatDate(item.start_date)}</span>
                          <span>{formatDate(item.end_date)}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                  No federation tournaments found for this organizer yet.
                </div>
              )}
            </div>
          ) : null}

          {activeTab === "clubs" ? (
            <div className="mt-6">
              {selectedFederation.clubs && selectedFederation.clubs.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {selectedFederation.clubs.map((club) => (
                    <Link
                      key={club.documentId}
                      href={buildClubHref(club.slug, club.documentId, embedded)}
                      className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)] transition hover:border-sky-200 hover:bg-sky-50/30"
                    >
                      <div className="flex items-center gap-3">
                        <CountryFlag country={selectedFederation.country || null} className="h-5 w-7 rounded object-cover" />
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                          {selectedFederation.country || "Club"}
                        </div>
                      </div>
                      <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">{club.name}</h3>
                      <div className="mt-2 text-sm text-slate-600">{club.city || club.address || "Club venue"}</div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                  No clubs are connected to this federation yet.
                </div>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

    </div>
  );
}
