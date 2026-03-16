"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React from "react";
import { playerAccountAuth, type PlayerAccountSummary } from "@/lib/player-account-auth";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";

  const [account, setAccount] = React.useState<PlayerAccountSummary | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setError(null);

      if (!token) {
        setError("Missing verification token.");
        setIsLoading(false);
        return;
      }

      try {
        const next = await playerAccountAuth.verifyEmail(token);
        setAccount(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Email verification failed");
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, [token]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_38%,#f8fafc_72%,#ffffff_100%)] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Private Player Area</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Email verification</h1>

        {isLoading ? <p className="mt-4 text-sm text-slate-600">Verifying your email...</p> : null}

        {!isLoading && account ? (
          <>
            <div className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Your email is now verified for <span className="font-semibold">{account.email}</span>.
            </div>
            <div className="mt-6">
              <Link
                href="/account"
                className="inline-flex rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950"
              >
                Open account
              </Link>
            </div>
          </>
        ) : null}

        {!isLoading && !account && error ? (
          <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
      </div>
    </main>
  );
}
