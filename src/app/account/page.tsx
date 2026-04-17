"use client";

import Link from "next/link";
import React from "react";
import {
  AccountAccessCard,
  identityStatusLabel,
  PrivateAccountShell,
  formatDateTime,
  statusLabel,
} from "@/components/account/PrivateAccountShell";
import { useAccountSession } from "@/components/account/AccountSessionProvider";
import {
  playerAccountAuth,
  type PlayerAccountDashboard,
  type PlayerAccountDevice,
  type PlayerAccountFriendlyMatch,
  type PlayerAccountTournamentParticipation,
} from "@/lib/player-account-auth";

export default function AccountPage() {
  const { account, setAccount, isLoading } = useAccountSession();
  const [dashboard, setDashboard] = React.useState<PlayerAccountDashboard | null>(null);
  const [devices, setDevices] = React.useState<PlayerAccountDevice[]>([]);
  const [friendlyMatches, setFriendlyMatches] = React.useState<PlayerAccountFriendlyMatch[]>([]);
  const [tournaments, setTournaments] = React.useState<PlayerAccountTournamentParticipation[]>([]);
  const [isRefreshingData, setIsRefreshingData] = React.useState(false);
  const [dataError, setDataError] = React.useState<string | null>(null);
  const [deviceLink, setDeviceLink] = React.useState<{ linkUrl: string; expiresAt: string | null } | null>(null);
  const [isPreparingDeviceLink, setIsPreparingDeviceLink] = React.useState(false);

  const loadPrivateData = React.useCallback(async () => {
    setIsRefreshingData(true);
    setDataError(null);
    try {
      const [dashboardData, devicesData, friendlyMatchesData, tournamentsData] = await Promise.all([
        playerAccountAuth.dashboard(),
        playerAccountAuth.devices(),
        playerAccountAuth.friendlyMatches(),
        playerAccountAuth.tournaments(),
      ]);
      setDashboard(dashboardData);
      setDevices(devicesData);
      setFriendlyMatches(friendlyMatchesData);
      setTournaments(tournamentsData);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : "Private account data could not be loaded.");
    } finally {
      setIsRefreshingData(false);
    }
  }, []);

  React.useEffect(() => {
    if (!account) return;
    void loadPrivateData();
  }, [account, loadPrivateData]);

  React.useEffect(() => {
    if (!account || account.player?.documentId) {
      setDeviceLink(null);
      return;
    }

    const run = async () => {
      setIsPreparingDeviceLink(true);
      try {
        const data = await playerAccountAuth.startDeviceLink();
        setDeviceLink({ linkUrl: data.linkUrl, expiresAt: data.expiresAt });
      } catch {
        setDeviceLink(null);
      } finally {
        setIsPreparingDeviceLink(false);
      }
    };

    void run();
  }, [account]);

  const summaryStats = dashboard?.stats || {
    friendlyMatches: friendlyMatches.length,
    tournaments: tournaments.length,
    activeDevices: devices.filter((device) => device.isActive).length,
    totalDevices: devices.length,
    wins: 0,
  };
  const playerCard = dashboard?.playerCard || null;
  const latestFriendlyMatches =
    dashboard?.latestFriendlyMatches?.length ? dashboard.latestFriendlyMatches : friendlyMatches.slice(0, 5);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_38%,#f8fafc_72%,#ffffff_100%)] px-4 py-8 text-slate-950">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          Loading account...
        </div>
      </main>
    );
  }

  if (!account) {
    return <AccountAccessCard onAuthenticated={async (next) => setAccount(next)} />;
  }

  return (
    <PrivateAccountShell account={account} setAccount={setAccount} activeHref="/account">
      {dataError ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{dataError}</div> : null}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Overview</h2>
          <p className="mt-1 text-sm text-slate-600">
            Your private account summary across tournaments, friendly matches and trusted devices.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadPrivateData()}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
        >
          {isRefreshingData ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-5">
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Friendly matches</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{summaryStats.friendlyMatches}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Wins</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{summaryStats.wins}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Tournaments</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{summaryStats.tournaments}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Trusted devices</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{summaryStats.totalDevices}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Active devices</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{summaryStats.activeDevices}</div>
        </div>
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
          <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Current profile</div>
          <div className="mt-4 flex items-start gap-4">
            {playerCard?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={playerCard.photoUrl}
                alt={playerCard.fullName || "Player"}
                className="h-20 w-20 rounded-3xl object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-200 text-2xl font-semibold text-slate-600">
                {(playerCard?.fullName || account.email || "P").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-xl font-semibold text-slate-950">
                {playerCard?.displayName ||
                  playerCard?.fullName ||
                  account.player?.fullName ||
                  account.enrollmentRequest?.displayName ||
                  account.enrollmentRequest?.fullName ||
                  "Player account"}
              </h3>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <div>{playerCard?.country || account.player?.country || "Country not set yet"}</div>
                <div>Official player ID: {playerCard?.documentId || account.player?.documentId || "Not verified yet"}</div>
                <div>Account email: {account.email || "Not available"}</div>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Account state</div>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-4">
              <span>Account status</span>
              <span className="font-semibold text-slate-950">{statusLabel(account.status)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Account ownership</span>
              <span className="font-semibold text-slate-950">
                {account.emailVerifiedAt ? "Verified by email" : "Pending email verification"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Official player profile</span>
              <span className="font-semibold text-slate-950">
                {account.player?.documentId
                  ? account.player.documentId
                  : account.status === "active_pending_player_review"
                    ? "Pending review"
                    : "Not verified yet"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Identity status</span>
              <span className="font-semibold text-slate-950">
                {identityStatusLabel(account.enrollmentRequest?.identityStatus || account.enrollmentRequest?.status)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Profile completion</span>
              <span className="font-semibold text-slate-950">
                {account.enrollmentRequest?.accountCompletionStatus || "Completed"}
              </span>
            </div>
          </div>
        </article>
      </section>

      {!account.player?.documentId ? (
        <section className="mt-8 rounded-3xl border border-cyan-200 bg-cyan-50/70 p-5">
          <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Scoreboard pairing</div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Link your enrolled phone</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            If you already enrolled from a scoreboard on your phone, scan this QR with that same phone to attach the
            trusted device and temporary identity to this account.
          </p>

          <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr]">
            <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-cyan-100 bg-white p-4">
              {deviceLink?.linkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(deviceLink.linkUrl)}`}
                  alt="Pair your enrolled phone with this account"
                  className="h-[220px] w-[220px] rounded-2xl"
                />
              ) : (
                <div className="px-4 text-center text-sm text-slate-500">
                  {isPreparingDeviceLink ? "Preparing QR..." : "QR is not available right now."}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-white px-4 py-4 text-sm text-slate-700">
                1. Open the camera on the phone that you already used on the scoreboard.
                <br />
                2. Scan this QR.
                <br />
                3. If that phone is already enrolled, this account can reuse that trusted device without auto-claiming
                any new official player identity.
              </div>
              {deviceLink?.linkUrl ? (
                <div className="rounded-2xl bg-white px-4 py-4 text-sm text-slate-700">
                  <div className="font-medium text-slate-950">Pairing link</div>
                  <div className="mt-2 break-all text-slate-600">{deviceLink.linkUrl}</div>
                  {deviceLink.expiresAt ? (
                    <div className="mt-3 text-xs text-slate-500">Expires: {formatDateTime(deviceLink.expiresAt)}</div>
                  ) : null}
                </div>
              ) : null}
              <button
                type="button"
                onClick={async () => {
                  setIsPreparingDeviceLink(true);
                  try {
                    const data = await playerAccountAuth.startDeviceLink();
                    setDeviceLink({ linkUrl: data.linkUrl, expiresAt: data.expiresAt });
                  } catch (err) {
                    setDataError(err instanceof Error ? err.message : "Pairing link could not be created.");
                  } finally {
                    setIsPreparingDeviceLink(false);
                  }
                }}
                className="rounded-full border border-cyan-200 bg-white px-4 py-2 text-sm font-medium text-cyan-900"
              >
                {isPreparingDeviceLink ? "Refreshing QR..." : "Refresh QR"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-10 grid gap-4 lg:grid-cols-3">
        <Link href="/account/tournaments" className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 transition hover:border-cyan-300 hover:bg-white">
          <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Section</div>
          <h2 className="mt-2 text-xl font-semibold">Tournaments</h2>
          <p className="mt-2 text-sm text-slate-600">Review full tournament history, positions and match results.</p>
        </Link>
        <Link href="/account/friendly" className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 transition hover:border-cyan-300 hover:bg-white">
          <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Section</div>
          <h2 className="mt-2 text-xl font-semibold">Friendly Matches</h2>
          <p className="mt-2 text-sm text-slate-600">See completed private matches recorded after gameplay ends.</p>
        </Link>
        <Link href="/account/devices" className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 transition hover:border-cyan-300 hover:bg-white">
          <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Section</div>
          <h2 className="mt-2 text-xl font-semibold">Devices</h2>
          <p className="mt-2 text-sm text-slate-600">Manage and review trusted devices linked to your player account.</p>
        </Link>
      </section>

      <section className="mt-10">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-xl font-semibold">Tournament snapshot</h2>
          <Link href="/account/tournaments" className="text-sm text-cyan-700">
            Open tournaments page
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {tournaments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                {account.player?.documentId
                  ? "No tournament participations were found for this player yet."
                  : "Tournament history will appear here after a verified player profile is connected to this account."}
              </div>
          ) : (
            tournaments.slice(0, 3).map((participation) => (
              <article key={participation.id} className="rounded-3xl border border-slate-200 bg-white px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-base font-medium text-slate-950">{participation.tournament || "Tournament"}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {[participation.year, participation.gameType, participation.position].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">
                    {participation.totalMatches} matches · {participation.wins} wins · {participation.losses} losses
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-full bg-slate-50 px-3 py-1">AVG {participation.avgPerInning.toFixed(3)}</span>
                  <span className="rounded-full bg-slate-50 px-3 py-1">H.R. {participation.highestRun}</span>
                  <span className="rounded-full bg-slate-50 px-3 py-1">Position {participation.position}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-xl font-semibold">Latest friendly matches</h2>
          <Link href="/account/friendly" className="text-sm text-cyan-700">
            Open friendly matches page
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {friendlyMatches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
              No friendly matches have been recorded for this account yet.
            </div>
          ) : (
            friendlyMatches.slice(0, 5).map((match) => (
              <article key={String(match.id)} className="rounded-3xl border border-slate-200 bg-slate-50/70 px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-base font-medium text-slate-950">
                      {match.player1Name || "Player 1"} vs {match.player2Name || "Player 2"}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      Score: {match.player1_points ?? 0} - {match.player2_points ?? 0}
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">{formatDateTime(match.reportedAt) || "Date not available"}</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-full bg-white px-3 py-1">Club: {match.clubName || "Unknown"}</span>
                  {match.tableLabel ? <span className="rounded-full bg-white px-3 py-1">Table: {match.tableLabel}</span> : null}
                  <span className="rounded-full bg-white px-3 py-1">Screen: {match.screenIdentifier || "Unknown"}</span>
                  <span className="rounded-full bg-white px-3 py-1">P1 HR {match.player1_high_run ?? 0}</span>
                  <span className="rounded-full bg-white px-3 py-1">P2 HR {match.player2_high_run ?? 0}</span>
                  {match.winner ? (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Winner: {match.winner}</span>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-xl font-semibold">Trusted devices</h2>
          <Link href="/account/devices" className="text-sm text-cyan-700">
            Open devices page
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {devices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
              No trusted devices have been linked yet.
            </div>
          ) : (
            devices.slice(0, 4).map((device) => (
              <article key={String(device.id)} className="rounded-3xl border border-slate-200 bg-white px-5 py-4">
                <div className="min-w-0">
                  <div className="font-medium text-slate-950">{device.deviceLabel || device.platform || "Unknown device"}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {[device.platform, device.browser].filter(Boolean).join(" · ") || "No platform details yet"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-50 px-3 py-1">token ****{device.deviceTokenLast4 || "----"}</span>
                    {device.appVersion ? (
                      <span className="rounded-full bg-slate-50 px-3 py-1">App {device.appVersion}</span>
                    ) : null}
                    {device.lastUsedAt ? (
                      <span className="rounded-full bg-slate-50 px-3 py-1">{formatDateTime(device.lastUsedAt)}</span>
                    ) : null}
                    <span
                      className={`rounded-full px-3 py-1 ${
                        device.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {device.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {latestFriendlyMatches.length > 0 ? (
        <section className="mt-10">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-xl font-semibold">Latest activity</h2>
            <p className="text-sm text-slate-500">Recent private activity from friendly matches.</p>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {latestFriendlyMatches.map((match) => (
              <article key={`latest-${String(match.id)}`} className="rounded-3xl border border-slate-200 bg-slate-50/70 px-5 py-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-700">Friendly</div>
                <div className="mt-2 text-base font-medium text-slate-950">
                  {match.player1Name || "Player 1"} vs {match.player2Name || "Player 2"}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {match.player1_points ?? 0} - {match.player2_points ?? 0}
                </div>
                <div className="mt-3 text-xs text-slate-500">{formatDateTime(match.reportedAt) || "Date not available"}</div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </PrivateAccountShell>
  );
}
