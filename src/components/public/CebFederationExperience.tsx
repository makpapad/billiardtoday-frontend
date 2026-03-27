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
};

type TournamentPayload = {
  data?: TournamentItem[];
};

type Props = {
  federation: Federation;
  members: Federation[];
};

type TabKey = "details" | "tournaments" | "clubs";

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

const getStatus = (startDate: string | null | undefined, endDate: string | null | undefined) => {
  const now = Date.now();
  const start = startDate ? new Date(startDate).getTime() : null;
  const end = endDate ? new Date(endDate).getTime() : null;
  if (start && start > now) return "Upcoming";
  if (end && end < now) return "Completed";
  return "Live";
};

const buildClubHref = (slug?: string | null, documentId?: string | null) => {
  const target = slug || documentId;
  return target ? `/clubs/${target}` : "#";
};

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

function EuropeBackdrop() {
  return (
    <svg viewBox="0 0 960 720" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="ceb-europe-fill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="55%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="960" height="720" rx="44" fill="#eff6ff" />
      <path
        d="M132 418c8-42 32-77 76-104l34-39 56-10 22-44 69-43 41 4 27-32 46-12 54 13 40 36 47-1 52 30 26 48-13 58-53 18-10 48 31 24-8 33-39 14-39-3-12 36-31 13-26 45-43 12-33-22-19-59-40-15-25-48-37-5-44 17-51-7-35 25-34-10-24-38-61-4-20-33 7-48z"
        fill="url(#ceb-europe-fill)"
        opacity="0.95"
      />
      <path
        d="M364 508l24 27-12 48 32 52 43 17 4 30-21 15-54-25-34-57 1-54-21-23 38-30z"
        fill="url(#ceb-europe-fill)"
        opacity="0.78"
      />
      <circle cx="725" cy="601" r="10" fill="#60a5fa" opacity="0.7" />
      <circle cx="748" cy="618" r="7" fill="#60a5fa" opacity="0.56" />
      <circle cx="131" cy="551" r="8" fill="#60a5fa" opacity="0.5" />
      <circle cx="862" cy="204" r="6" fill="#60a5fa" opacity="0.42" />
    </svg>
  );
}

export function CebFederationExperience({ federation, members }: Props) {
  const sortedMembers = [...members].sort((a, b) => a.name.localeCompare(b.name, "en"));
  const initialSelectedId = sortedMembers[0]?.documentId || null;
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [activeTab, setActiveTab] = useState<TabKey>("details");
  const [tournaments, setTournaments] = useState<Record<string, TournamentItem[]>>({});
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

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

  const selectedFederation = sortedMembers.find((item) => item.documentId === selectedId) || sortedMembers[0] || null;
  const selectedTournaments = selectedFederation ? tournaments[selectedFederation.documentId] || [] : [];
  const cebLogoUrl = resolveLogoUrl(federation.logo) || "/img/logo/ceb.png";

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 py-8 sm:px-6">
      <PresentationHero
        eyebrow="European Confederation"
        title={federation.name}
        description="Explore the European carom network through an interactive federation map. Select a country pin to inspect the national federation, review its tournaments, and browse its connected clubs."
        actions={[]}
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
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Member federations</div>
                <div className="mt-3 text-4xl font-semibold text-white">{sortedMembers.length}</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-slate-950/25 p-5 text-center backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Connected clubs</div>
                <div className="mt-3 text-4xl font-semibold text-white">
                  {sortedMembers.reduce((sum, item) => sum + (item.clubCount || 0), 0)}
                </div>
              </div>
            </div>
          </div>
        }
      />

      <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
        <SectionHeading
          eyebrow="Interactive map"
          title="National federation network"
          description="Tap any federation pin on the Europe map to switch the content below between federation profile, official tournaments, and affiliated clubs."
        />

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative min-h-[520px] overflow-hidden rounded-[30px] border border-sky-100 bg-[radial-gradient(circle_at_top,#ffffff_0%,#eef6ff_58%,#dbeafe_100%)] p-4 sm:p-6">
            <EuropeBackdrop />
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
                    className={`group absolute -translate-x-1/2 -translate-y-1/2 transition ${isActive ? "z-20 scale-110" : "z-10 hover:scale-105"}`}
                    style={{ left: `${point.x}%`, top: `${point.y}%` }}
                    aria-label={`Select ${member.name}`}
                  >
                    <span className="absolute left-1/2 top-[-0.9rem] h-5 w-[2px] -translate-x-1/2 rounded-full bg-sky-500/60" />
                    <span className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 bg-white shadow-lg ${isActive ? "border-sky-500 ring-4 ring-sky-200/80" : "border-white/90"}`}>
                      <CountryFlag country={member.country || null} className="h-full w-full object-cover" />
                    </span>
                    <span className={`absolute left-1/2 top-12 min-w-max -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold shadow-md transition ${isActive ? "bg-slate-950 text-white" : "bg-white/90 text-slate-700 opacity-0 group-hover:opacity-100"}`}>
                      {member.country || member.name}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-white/70 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 shadow-sm backdrop-blur-sm">
              CEB member map
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

            <div className="rounded-[28px] border border-black/5 bg-slate-950 p-5 text-white shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">How it works</div>
              <p className="mt-3 text-sm leading-7 text-white/75">
                The map is a federation selector. Each click swaps the profile panel below without leaving the CEB page.
              </p>
            </div>
          </div>
        </div>
      </section>

      {selectedFederation ? (
        <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Federation profile</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{selectedFederation.name}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Review federation details, official tournament activity, and affiliated clubs from a single panel.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["details", "tournaments", "clubs"] as TabKey[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
                    activeTab === tab
                      ? "bg-sky-600 text-white shadow-[0_10px_24px_rgba(2,132,199,0.28)]"
                      : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {tab}
                </button>
              ))}
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
                        href={buildTournamentHref(item.documentId, item.title, item.season)}
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
                      href={buildClubHref(club.slug, club.documentId)}
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
