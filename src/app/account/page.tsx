"use client";

import React from "react";
import {
  playerAccountAuth,
  type PlayerAccountDashboard,
  type PlayerAccountDevice,
  type PlayerAccountFriendlyMatch,
  type PlayerAccountTournamentParticipation,
  type PlayerAccountSummary,
} from "@/lib/player-account-auth";

function statusLabel(status: PlayerAccountSummary["status"]) {
  if (status === "active") return "Active";
  if (status === "pending_verification") return "Pending verification";
  if (status === "disabled") return "Disabled";
  return "Unknown";
}

function formatDateTime(value?: string | null) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function AccountPage() {
  const [account, setAccount] = React.useState<PlayerAccountSummary | null>(null);
  const [dashboard, setDashboard] = React.useState<PlayerAccountDashboard | null>(null);
  const [devices, setDevices] = React.useState<PlayerAccountDevice[]>([]);
  const [friendlyMatches, setFriendlyMatches] = React.useState<PlayerAccountFriendlyMatch[]>([]);
  const [tournaments, setTournaments] = React.useState<PlayerAccountTournamentParticipation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshingData, setIsRefreshingData] = React.useState(false);
  const [isResendingVerification, setIsResendingVerification] = React.useState(false);
  const [verificationNotice, setVerificationNotice] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [error, setError] = React.useState<string | null>(null);
  const [dataError, setDataError] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [playerDocumentId, setPlayerDocumentId] = React.useState("");
  const [enrollmentRequestId, setEnrollmentRequestId] = React.useState("");

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
    const run = async () => {
      setIsLoading(true);
      try {
        const current = await playerAccountAuth.me();
        setAccount(current);
        if (current) {
          await loadPrivateData();
        }
      } finally {
        setIsLoading(false);
      }
    };
    void run();
  }, [loadPrivateData]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setVerificationNotice(null);
    try {
      const next =
        mode === "login"
          ? await playerAccountAuth.login(email, password)
          : await playerAccountAuth.register({
              email,
              password,
              playerDocumentId: playerDocumentId || null,
              enrollmentRequestId: enrollmentRequestId || null,
            });
      setAccount(next);
      await loadPrivateData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  };

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
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_38%,#f8fafc_72%,#ffffff_100%)] px-4 py-8 text-slate-950">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Private Player Area</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Account Access</h1>
          <p className="mt-3 text-sm text-slate-600">
            Sign in with your player account or create one linked to a player or enrollment request.
          </p>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-full px-4 py-2 text-sm font-medium ${mode === "login" ? "bg-slate-950 text-white" : "border border-slate-200 text-slate-700"}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`rounded-full px-4 py-2 text-sm font-medium ${mode === "register" ? "bg-slate-950 text-white" : "border border-slate-200 text-slate-700"}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
            />
            {mode === "register" ? (
              <>
                <input
                  value={playerDocumentId}
                  onChange={(e) => setPlayerDocumentId(e.target.value)}
                  placeholder="Player documentId"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                />
                <input
                  value={enrollmentRequestId}
                  onChange={(e) => setEnrollmentRequestId(e.target.value)}
                  placeholder="Enrollment request documentId"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                />
              </>
            ) : null}
            {error ? (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            ) : null}
            <button
              type="submit"
              className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950"
            >
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_38%,#f8fafc_72%,#ffffff_100%)] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-5xl rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Private Player Area</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {account.player?.fullName || account.enrollmentRequest?.fullName || account.email || "Player account"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">{account.email}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              playerAccountAuth.logout();
              setAccount(null);
              setDashboard(null);
              setDevices([]);
              setFriendlyMatches([]);
              setTournaments([]);
            }}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Sign out
          </button>
        </div>

        {!account.emailVerifiedAt ? (
          <div className="mt-6 rounded-2xl bg-amber-50 px-4 py-4 text-sm text-amber-900">
            <div className="font-semibold">Email verification pending</div>
            <p className="mt-2">Verify your email to secure account recovery and future account actions.</p>
            <button
              type="button"
              onClick={async () => {
                setVerificationNotice(null);
                setError(null);
                setIsResendingVerification(true);
                try {
                  await playerAccountAuth.resendVerificationEmail({ email: account.email });
                  setVerificationNotice("Verification email sent.");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Verification email resend failed");
                } finally {
                  setIsResendingVerification(false);
                }
              }}
              className="mt-3 rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-900"
            >
              {isResendingVerification ? "Sending..." : "Resend verification email"}
            </button>
            {verificationNotice ? <div className="mt-3 text-sm text-emerald-700">{verificationNotice}</div> : null}
          </div>
        ) : null}

        {account.status === "pending_verification" ? (
          <div className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Your account is currently in partial access mode. Friendly matches and devices are already available. Public
            tournament identity will be added after verification and player linking are completed.
          </div>
        ) : null}

        {error ? <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {dataError ? <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{dataError}</div> : null}

        <div className="mt-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Private dashboard</h2>
            <p className="mt-1 text-sm text-slate-600">
              Friendly match history and trusted devices are now available in this private player area.
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

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
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
            <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Player card</div>
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
                  {playerCard?.fullName || account.player?.fullName || account.enrollmentRequest?.fullName || "Player account"}
                </h3>
                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  <div>{playerCard?.country || account.player?.country || "Country not set yet"}</div>
                  <div>Player ID: {playerCard?.documentId || account.player?.documentId || "Pending"}</div>
                  <div>Account email: {account.email || "Not available"}</div>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Account state</div>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-4">
                <span>Status</span>
                <span className="font-semibold text-slate-950">{statusLabel(account.status)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Email verification</span>
                <span className="font-semibold text-slate-950">{account.emailVerifiedAt ? "Verified" : "Pending"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Player link</span>
                <span className="font-semibold text-slate-950">{account.player?.documentId || "Pending"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Enrollment status</span>
                <span className="font-semibold text-slate-950">{account.enrollmentRequest?.status || "Not linked"}</span>
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

        <section className="mt-10">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-xl font-semibold">Tournaments</h2>
            <p className="text-sm text-slate-500">Private tournament view for the player linked to this account.</p>
          </div>
          <div className="mt-4 space-y-3">
            {tournaments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                {account.player?.documentId
                  ? "No tournament participations were found for this player yet."
                  : "Tournament history will appear here after your account is linked to a verified player profile."}
              </div>
            ) : (
              tournaments.map((participation) => (
                <article key={participation.id} className="rounded-3xl border border-slate-200 bg-white px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-base font-medium text-slate-950">
                        {participation.tournament || "Tournament"}
                      </div>
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
            <h2 className="text-xl font-semibold">Friendly matches</h2>
            <p className="text-sm text-slate-500">Private history for completed non-live matches.</p>
          </div>
          <div className="mt-4 space-y-3">
            {friendlyMatches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                No friendly matches have been recorded for this account yet.
              </div>
            ) : (
              friendlyMatches.map((match) => (
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
                    <span className="rounded-full bg-white px-3 py-1">Screen: {match.screenIdentifier || "Unknown"}</span>
                    <span className="rounded-full bg-white px-3 py-1">HR {match.player1_high_run ?? 0}</span>
                    <span className="rounded-full bg-white px-3 py-1">HR {match.player2_high_run ?? 0}</span>
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
            <p className="text-sm text-slate-500">Devices linked to this player account or enrollment profile.</p>
          </div>
          <div className="mt-4 space-y-3">
            {devices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                No trusted devices have been linked yet.
              </div>
            ) : (
              devices.map((device) => (
                <article key={String(device.id)} className="rounded-3xl border border-slate-200 bg-white px-5 py-4">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-950">
                      {device.deviceLabel || device.platform || "Unknown device"}
                    </div>
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
      </div>
    </main>
  );
}
