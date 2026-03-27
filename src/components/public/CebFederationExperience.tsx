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
          <div className="relative min-h-[520px] overflow-hidden rounded-[30px] border border-sky-100 bg-white p-4 sm:p-6">
            <img
              src="/img/europe-map.webp"
              alt="Europe map"
              className="absolute inset-0 h-full w-full object-contain"
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_55%)]" />
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
                    <span className="absolute bottom-[0.85rem] left-1/2 h-4 w-[2px] -translate-x-1/2 rounded-full bg-slate-900/55" />
                    <span className={`relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-[3px] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.24)] ${isActive ? "border-sky-500 ring-4 ring-sky-200/85" : "border-white"}`}>
                      <CountryFlag country={member.country || null} className="h-full w-full object-cover" />
                    </span>
                    <span className="absolute bottom-[0.2rem] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 rounded-[2px] bg-white shadow-[0_6px_14px_rgba(15,23,42,0.2)]" />
                    <span className={`absolute bottom-[3.6rem] left-1/2 min-w-max -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold shadow-md transition ${isActive ? "bg-slate-950 text-white" : "bg-white/92 text-slate-700 opacity-0 group-hover:opacity-100"}`}>
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
