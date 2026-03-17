"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React from "react";
import { playerAccountAuth } from "@/lib/player-account-auth";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_38%,#f8fafc_72%,#ffffff_100%)] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Private Player Area</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Reset password</h1>
        <p className="mt-3 text-sm text-slate-600">
          Create a new password for your player account.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setNotice(null);
            if (!token) {
              setError("Password reset token is missing.");
              return;
            }
            if (password.length < 8) {
              setError("Password must be at least 8 characters.");
              return;
            }
            if (password !== confirmPassword) {
              setError("Passwords do not match.");
              return;
            }

            setIsSubmitting(true);
            try {
              await playerAccountAuth.resetPassword(token, password);
              setNotice("Password updated. You can now sign in with your new password.");
              setPassword("");
              setConfirmPassword("");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Password reset failed");
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            type="password"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
          />
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            type="password"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
          />
          {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          {notice ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Update password"}
            </button>
            <Link href="/account" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Back to account access
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
