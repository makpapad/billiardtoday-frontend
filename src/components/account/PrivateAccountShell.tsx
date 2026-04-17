"use client";

import Link from "next/link";
import React from "react";
import {
  playerAccountAuth,
  type PlayerAccountEnrollmentPreview,
  type PlayerAccountSummary,
} from "@/lib/player-account-auth";

export function statusLabel(status: PlayerAccountSummary["status"]) {
  if (status === "active_linked" || status === "active") return "Account verified and linked";
  if (status === "active_pending_player_review") return "Account verified, player review pending";
  if (status === "active_unlinked") return "Account verified, player unlinked";
  if (status === "pending_verification") return "Pending verification";
  if (status === "suspended" || status === "disabled") return "Suspended";
  return "Unknown";
}

export function identityStatusLabel(status?: string | null) {
  if (status === "verified") return "Verified";
  if (status === "pending_review") return "Pending review";
  if (status === "rejected") return "Rejected";
  if (status === "temporary") return "Temporary";
  if (status === "approved") return "Verified";
  if (status === "pending") return "Temporary";
  return status || "Unknown";
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
      hour12: false,
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
  const [fullName, setFullName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [enrollmentPreview, setEnrollmentPreview] = React.useState<PlayerAccountEnrollmentPreview | null>(null);
  const [isCheckingEnrollment, setIsCheckingEnrollment] = React.useState(false);
  const [hasEditedFullName, setHasEditedFullName] = React.useState(false);
  const [forgotPasswordNotice, setForgotPasswordNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (mode !== "register") return;
    const normalized = email.trim();
    if (!normalized) {
      setEnrollmentPreview(null);
      if (!hasEditedFullName) setFullName("");
      return;
    }

    const timeout = window.setTimeout(async () => {
      setIsCheckingEnrollment(true);
      try {
        const preview = await playerAccountAuth.getEnrollmentPreview(normalized);
        setEnrollmentPreview(preview);
        if (!hasEditedFullName) {
          setFullName(preview?.displayName || preview?.fullName || "");
        }
      } catch {
        setEnrollmentPreview(null);
      } finally {
        setIsCheckingEnrollment(false);
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [email, hasEditedFullName, mode]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setForgotPasswordNotice(null);
    try {
      if (mode === "register") {
        if (password.length < 8) {
          setError("Password must be at least 8 characters.");
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
      }

      const next =
        mode === "login"
          ? await playerAccountAuth.login(email, password)
          : await playerAccountAuth.register({
              email,
              fullName,
              password,
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
          Sign in with your account or create one from your enrollment details. Official player verification is a
          separate step.
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
          {mode === "login" ? (
            <div className="flex items-center justify-end">
              <Link href="/account/forgot-password" className="text-sm font-medium text-cyan-700 hover:text-cyan-800">
                Forgot password?
              </Link>
            </div>
          ) : null}
          {mode === "register" ? (
            <>
              <input
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setHasEditedFullName(true);
                }}
                placeholder="Account name"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              />
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                type="password"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              />
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                If you already enrolled from a scoreboard, use the same email address here to recover that enrollment
                context before creating the account.
                {isCheckingEnrollment ? " Checking enrollment..." : ""}
              </div>
              {enrollmentPreview?.displayName || enrollmentPreview?.fullName ? (
                <div className="rounded-2xl bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
                  Temporary enrollment found for{" "}
                  <span className="font-semibold">{enrollmentPreview.displayName || enrollmentPreview.fullName}</span>.
                  You can keep this account name or edit it before creating the account.
                </div>
              ) : null}
            </>
          ) : null}
          {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          {forgotPasswordNotice ? (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{forgotPasswordNotice}</div>
          ) : null}
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
              {account.player?.fullName ||
                account.enrollmentRequest?.displayName ||
                account.enrollmentRequest?.fullName ||
                account.email ||
                "Player account"}
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
            Your account ownership still needs email verification. Friendly matches and trusted devices are already
            available, but official player verification remains separate.
          </div>
        ) : null}

        {account.status === "active_unlinked" ? (
          <div className="mt-6 rounded-2xl bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
            Your account ownership is verified. You can use trusted devices and private account recovery, but no
            official player profile is linked yet.
          </div>
        ) : null}

        {account.status === "active_pending_player_review" ? (
          <div className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Your account ownership is verified. Your official player profile is still pending review.
          </div>
        ) : null}

        {account.status === "active_linked" ? (
          <div className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Your account ownership is verified and an official player profile is linked.
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
