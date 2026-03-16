"use client";

import Link from "next/link";
import React from "react";
import { playerAccountAuth, type PlayerAccountSummary } from "@/lib/player-account-auth";

export function statusLabel(status: PlayerAccountSummary["status"]) {
  if (status === "active") return "Active";
  if (status === "pending_verification") return "Pending verification";
  if (status === "disabled") return "Disabled";
  return "Unknown";
}

export function formatDateTime(value?: string | null) {
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

export function usePlayerAccountSession() {
  const [account, setAccount] = React.useState<PlayerAccountSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const run = async () => {
      const cached = playerAccountAuth.getAccount();
      if (cached) {
        setAccount(cached);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
      try {
        const current = await playerAccountAuth.me();
        if (current) {
          setAccount(current);
        } else if (!cached) {
          setAccount(null);
        }
      } finally {
        setIsLoading(false);
      }
    };
    void run();
  }, []);

  return { account, setAccount, isLoading };
}

export type PlayerAccountSessionState = ReturnType<typeof usePlayerAccountSession>;

export function AccountAccessCard({
  onAuthenticated,
}: {
  onAuthenticated: (account: PlayerAccountSummary) => void | Promise<void>;
}) {
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [error, setError] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [playerDocumentId, setPlayerDocumentId] = React.useState("");
  const [enrollmentRequestId, setEnrollmentRequestId] = React.useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
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
      await onAuthenticated(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  };

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
          {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          <button type="submit" className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950">
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}

const NAV_ITEMS = [
  { href: "/account", label: "Overview" },
  { href: "/account/tournaments", label: "Tournaments" },
  { href: "/account/friendly", label: "Friendly Matches" },
  { href: "/account/devices", label: "Devices" },
];

export function PrivateAccountShell({
  account,
  setAccount,
  activeHref,
  children,
}: {
  account: PlayerAccountSummary;
  setAccount: React.Dispatch<React.SetStateAction<PlayerAccountSummary | null>>;
  activeHref: string;
  children: React.ReactNode;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [isResendingVerification, setIsResendingVerification] = React.useState(false);
  const [verificationNotice, setVerificationNotice] = React.useState<string | null>(null);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_38%,#f8fafc_72%,#ffffff_100%)] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
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
            Your account is currently in partial access mode. Friendly matches and devices are already available.
            Tournament identity will be added after verification and player linking are completed.
          </div>
        ) : null}

        {error ? <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <nav className="mt-6 flex flex-wrap gap-2">
          {NAV_ITEMS.map((item) => {
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  active ? "bg-slate-950 text-white" : "border border-slate-200 text-slate-700"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
