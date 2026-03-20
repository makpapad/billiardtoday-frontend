"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React from "react";
import {
  playerAccountAuth,
  type PlayerAccountClaimInfo,
  type PlayerAccountSummary,
} from "@/lib/player-account-auth";

function friendlyStatus(status: string | null) {
  if (status === "approved") return "Approved";
  if (status === "pending") return "Pending";
  if (status === "rejected") return "Rejected";
  if (status === "merged") return "Merged";
  return status || "Unknown";
}

export default function CompleteProfilePage() {
  const searchParams = useSearchParams();
  const claimToken = searchParams?.get("claim")?.trim() || "";

  const [claimInfo, setClaimInfo] = React.useState<PlayerAccountClaimInfo | null>(null);
  const [account, setAccount] = React.useState<PlayerAccountSummary | null>(null);
  const [email, setEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setError(null);

      if (!claimToken) {
        setClaimInfo(null);
        setIsLoading(false);
        return;
      }

      try {
        const next = await playerAccountAuth.getClaimInfo(claimToken);
        setClaimInfo(next);
        setEmail(next.email || "");
        setFullName(next.fullName || "");
      } catch (err) {
        setClaimInfo(null);
        setError(err instanceof Error ? err.message : "Claim lookup failed");
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, [claimToken]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!claimToken) {
      setError("Missing claim token");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const next = await playerAccountAuth.completeClaim({ claimToken, email, password, fullName });
      setAccount(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account creation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_38%,#f8fafc_72%,#ffffff_100%)] px-4 py-8 text-slate-950">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          Loading profile completion...
        </div>
      </main>
    );
  }

  if (account) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_38%,#f8fafc_72%,#ffffff_100%)] px-4 py-8 text-slate-950">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Private Player Area</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Account created</h1>
          <p className="mt-3 text-sm text-slate-600">
            Your profile access is now active. You can continue to your private account area.
          </p>
          <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Linked player</div>
            <div className="mt-2 text-lg font-semibold text-slate-950">
              {account.player?.fullName || account.player?.documentId || "Pending player"}
            </div>
          </div>
          <div className="mt-6">
            <Link
              href="/account"
              className="inline-flex rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950"
            >
              Open account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_38%,#f8fafc_72%,#ffffff_100%)] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Private Player Area</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Complete your profile</h1>
        <p className="mt-3 text-sm text-slate-600">
          Finish your account setup to access your private player area later from any device.
        </p>

        {!claimToken ? (
          <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            Missing claim token. Open this page from the profile completion link.
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {claimInfo ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Player</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">{claimInfo.fullName || "Pending player"}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Status</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">{friendlyStatus(claimInfo.status)}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Club</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">{claimInfo.clubName || "Not provided"}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Country</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">{claimInfo.country || "Not provided"}</div>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Full name"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
          />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            type="email"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
          />
          <div className="text-xs text-slate-500">
            Use at least 8 characters. Tournament history can be added after approval if your player link is still pending.
          </div>
          <button
            type="submit"
            disabled={!claimToken || isSubmitting}
            className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}
