"use client";

import Link from "next/link";
import React from "react";

type DashboardData = {
  account?: {
    email?: string | null;
    fullName?: string | null;
    status?: string | null;
    documentId?: string | null;
    identityStatus?: string | null;
    officialPlayerName?: string | null;
    linkedPlayerDocumentId?: string | null;
  } | null;
  stats?: {
    friendlyMatches?: number;
    tournaments?: number;
    activeDevices?: number;
    totalDevices?: number;
    wins?: number;
    official?: {
      totalMatches?: number;
      totalWins?: number;
      totalLosses?: number;
      avgPerInning?: number | string | null;
      highestRun?: number;
    } | null;
  } | null;
  playerCard?: {
    displayName?: string | null;
    officialPlayerName?: string | null;
    documentId?: string | null;
    country?: string | null;
    photoUrl?: string | null;
    identityStatus?: string | null;
    isTemporary?: boolean;
  } | null;
  latestFriendlyMatches?: Array<{
    id?: number | string;
    documentId?: string;
    matchDateTime?: string | null;
    reportedAt?: string | null;
    venueName?: string | null;
    clubName?: string | null;
    player1Name?: string | null;
    player2Name?: string | null;
    player1_points?: number | null;
    player2_points?: number | null;
    winner?: string | null;
  }>;
  latestTournaments?: Array<{
    id?: number | string;
    documentId?: string;
    tournament?: string | null;
    year?: number | string | null;
    gameType?: string | null;
    totalMatches?: number;
    wins?: number;
    losses?: number;
    avgPerInning?: number | string | null;
    highestRun?: number;
  }>;
  devices?: Array<{
    id?: number | string;
    documentId?: string;
    deviceLabel?: string | null;
    platform?: string | null;
    browser?: string | null;
    isActive?: boolean;
    lastUsedAt?: string | null;
  }>;
  adminView?: {
    readOnly?: boolean;
    reviewerIdentity?: string | null;
    reviewerUserId?: number | string | null;
    requestedIdentifier?: string | null;
  };
};

type Props = {
  params: Promise<{ id: string }>;
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatAverage(value?: number | string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return parsed.toFixed(3).replace(".", ",");
}

function formatScore(player1?: number | null, player2?: number | null) {
  if (player1 == null || player2 == null) return "-";
  return `${player1}-${player2}`;
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

export default function AdminPlayerAccountDashboardPage({ params }: Props) {
  const resolvedParams = React.use(params);
  const id = resolvedParams.id;
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/player-accounts/${encodeURIComponent(id)}/dashboard`, {
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error?.message || payload?.error || `Request failed: ${res.status}`);
      }
      setData(payload?.data || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const playerCard = data?.playerCard;
  const account = data?.account;
  const official = data?.stats?.official;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Admin read-only player account</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Player account dashboard</h1>
            <div className="mt-1 text-sm text-slate-600">Identifier: {id}</div>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/player-enrollment-requests" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">
              Enrollment requests
            </Link>
            <button type="button" onClick={() => void load()} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-10 text-center text-sm text-slate-600 shadow-sm">Loading player account dashboard...</div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">{error}</div>
        ) : data ? (
          <div className="space-y-6">
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-200 text-3xl font-semibold text-slate-700">
                  {playerCard?.photoUrl ? (
                    <img src={playerCard.photoUrl} alt={playerCard.displayName || "Player"} className="h-full w-full object-cover" />
                  ) : (
                    (playerCard?.displayName || account?.fullName || "?").slice(0, 1)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-3xl font-semibold tracking-tight">{playerCard?.displayName || account?.fullName || "Player account"}</h2>
                  <div className="mt-2 text-sm text-slate-600">
                    Official: {playerCard?.officialPlayerName || account?.officialPlayerName || "-"} | {playerCard?.country || "-"}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    Account: {account?.email || "-"} | {account?.status || "-"} | {playerCard?.identityStatus || account?.identityStatus || "-"}
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Read-only admin view
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <StatCard label="Friendly" value={data.stats?.friendlyMatches ?? 0} />
              <StatCard label="Wins" value={data.stats?.wins ?? 0} />
              <StatCard label="Tournaments" value={data.stats?.tournaments ?? 0} />
              <StatCard label="Official matches" value={official?.totalMatches ?? 0} />
              <StatCard label="Official AVG" value={formatAverage(official?.avgPerInning)} />
              <StatCard label="Active devices" value={data.stats?.activeDevices ?? 0} />
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold">Latest friendly matches</h3>
                <div className="mt-4 divide-y divide-slate-200">
                  {(data.latestFriendlyMatches || []).map((match) => (
                    <div key={match.documentId || match.id} className="py-3 text-sm">
                      <div className="font-semibold">{match.player1Name || "-"} vs {match.player2Name || "-"}</div>
                      <div className="mt-1 text-slate-600">
                        {formatDateTime(match.matchDateTime || match.reportedAt)} | {match.venueName || match.clubName || "-"} |{" "}
                        {formatScore(match.player1_points, match.player2_points)}
                      </div>
                    </div>
                  ))}
                  {!data.latestFriendlyMatches?.length ? <div className="py-3 text-sm text-slate-500">No friendly matches.</div> : null}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold">Latest tournaments</h3>
                <div className="mt-4 divide-y divide-slate-200">
                  {(data.latestTournaments || []).map((tournament) => (
                    <div key={tournament.documentId || tournament.id} className="py-3 text-sm">
                      <div className="font-semibold">{tournament.tournament || "-"}</div>
                      <div className="mt-1 text-slate-600">
                        {tournament.gameType || "-"} | {tournament.year || "-"} | Matches {tournament.totalMatches ?? 0} | W{" "}
                        {tournament.wins ?? 0} L {tournament.losses ?? 0} | AVG {formatAverage(tournament.avgPerInning)} | HR{" "}
                        {tournament.highestRun ?? 0}
                      </div>
                    </div>
                  ))}
                  {!data.latestTournaments?.length ? <div className="py-3 text-sm text-slate-500">No tournaments.</div> : null}
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold">Trusted devices</h3>
              <div className="mt-4 divide-y divide-slate-200">
                {(data.devices || []).map((device) => (
                  <div key={device.documentId || device.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <div className="font-semibold">{device.deviceLabel || device.documentId || device.id}</div>
                    <div className="text-slate-600">
                      {device.isActive ? "Active" : "Inactive"} | {device.platform || "-"} {device.browser || ""} |{" "}
                      {formatDateTime(device.lastUsedAt)}
                    </div>
                  </div>
                ))}
                {!data.devices?.length ? <div className="py-3 text-sm text-slate-500">No trusted devices.</div> : null}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
