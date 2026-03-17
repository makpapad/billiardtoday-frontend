"use client";

import Link from "next/link";
import React from "react";
import { playerAccountAuth } from "@/lib/player-account-auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_38%,#f8fafc_72%,#ffffff_100%)] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Private Player Area</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Forgot password</h1>
        <p className="mt-3 text-sm text-slate-600">
          Enter your account email and we will send you a password reset link.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setNotice(null);
            setIsSubmitting(true);
            try {
              await playerAccountAuth.forgotPassword(email);
              setNotice("If this email exists, a password reset link has been sent.");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Password reset request failed");
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
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
              {isSubmitting ? "Sending..." : "Send reset link"}
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
