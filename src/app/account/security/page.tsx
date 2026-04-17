"use client";

import React from "react";
import {
  AccountAccessCard,
  formatDateTime,
  ownershipLabel,
  PrivateAccountShell,
} from "@/components/account/PrivateAccountShell";
import { useAccountSession } from "@/components/account/AccountSessionProvider";
import {
  playerAccountAuth,
  type PlayerAccountSecurity,
} from "@/lib/player-account-auth";

export default function AccountSecurityPage() {
  const { account, setAccount, isLoading } = useAccountSession();
  const [security, setSecurity] = React.useState<PlayerAccountSecurity | null>(null);
  const [mobile, setMobile] = React.useState("");
  const [code, setCode] = React.useState("");
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isStarting, setIsStarting] = React.useState(false);
  const [isCompleting, setIsCompleting] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const loadSecurity = React.useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const next = await playerAccountAuth.security();
      setSecurity(next);
      if (next.account && next.account.id !== account?.id) {
        setAccount(next.account);
      }
      setMobile(next.phoneVerification.mobile || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Security data could not be loaded.");
    } finally {
      setIsRefreshing(false);
    }
  }, [account?.id, setAccount]);

  React.useEffect(() => {
    if (!account) return;
    void loadSecurity();
  }, [account?.id, loadSecurity]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_38%,#f8fafc_72%,#ffffff_100%)] px-4 py-8 text-slate-950">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          Loading security settings...
        </div>
      </main>
    );
  }

  if (!account) {
    return <AccountAccessCard onAuthenticated={async (next) => setAccount(next)} />;
  }

  const phoneOtpEnabled = Boolean(security?.authOptions.phoneOtp.enabled);

  return (
    <PrivateAccountShell account={account} setAccount={setAccount} activeHref="/account/security">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Security</h2>
          <p className="mt-1 text-sm text-slate-600">
            Manage account ownership proofs and recovery methods. Official player verification remains separate.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadSecurity()}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {notice ? <div className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
          <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Current ownership</div>
          <h3 className="mt-2 text-xl font-semibold">{ownershipLabel(account)}</h3>
          <p className="mt-2 text-sm text-slate-600">
            Ownership proofs can secure login recovery and reduce spam, but they do not create or approve an official
            player profile.
          </p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Email</div>
          <div className="mt-3 text-sm text-slate-700">
            {account.emailVerifiedAt
              ? `Verified on ${formatDateTime(account.emailVerifiedAt) || account.emailVerifiedAt}.`
              : "Not verified yet."}
          </div>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Social sign-in</div>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <div>
              Google: {security?.authOptions.socialProviders.google.clientId ? "Ready to start" : "Not configured"}
            </div>
            <div>
              Facebook: {security?.authOptions.socialProviders.facebook.appId ? "Ready to start" : "Not configured"}
            </div>
            <div className="text-xs text-slate-500">
              Provider readiness is exposed in this phase, but official player verification still requires trusted
              review.
            </div>
          </div>
        </article>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5">
        <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700">Phone OTP</div>
        <h3 className="mt-2 text-xl font-semibold">Verify a phone number</h3>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Add a verified phone to strengthen account recovery and ownership. This does not verify an official player
          identity.
        </p>

        {!phoneOtpEnabled ? (
          <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Phone OTP is not configured on this environment yet.
          </div>
        ) : (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setNotice(null);
                setError(null);
                setIsStarting(true);
                try {
                  const result = await playerAccountAuth.startPhoneVerification(mobile);
                  setNotice(
                    result.alreadyVerified
                      ? `This phone is already verified as ${result.mobileMasked || "your current number"}.`
                      : `Verification code sent to ${result.mobileMasked || "your phone"}.`,
                  );
                  await loadSecurity();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Phone verification start failed.");
                } finally {
                  setIsStarting(false);
                }
              }}
              className="space-y-4"
            >
              <input
                value={mobile}
                onChange={(event) => setMobile(event.target.value)}
                placeholder="Mobile number"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              />
              <div className="text-xs text-slate-500">
                Use an internationally reachable number when possible. You can request a new code after a short
                cooldown.
              </div>
              <button
                type="submit"
                disabled={isStarting}
                className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isStarting ? "Sending code..." : "Send verification code"}
              </button>
            </form>

            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setNotice(null);
                setError(null);
                setIsCompleting(true);
                try {
                  const verified = await playerAccountAuth.completePhoneVerification(code);
                  setAccount(verified);
                  setCode("");
                  setNotice("Phone number verified.");
                  await loadSecurity();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Phone verification failed.");
                } finally {
                  setIsCompleting(false);
                }
              }}
              className="space-y-4 rounded-3xl bg-slate-50/80 p-5"
            >
              <div className="text-sm text-slate-700">
                {security?.phoneVerification.verifiedAt
                  ? `Verified as ${security.phoneVerification.mobileMasked || "your current number"} on ${formatDateTime(security.phoneVerification.verifiedAt) || security.phoneVerification.verifiedAt}.`
                  : security?.phoneVerification.pending
                    ? `Pending verification for ${security.phoneVerification.mobileMasked || "your current number"}.`
                    : "No pending phone verification code."}
              </div>
              {security?.phoneVerification.sentAt ? (
                <div className="text-xs text-slate-500">
                  Last code sent: {formatDateTime(security.phoneVerification.sentAt) || security.phoneVerification.sentAt}
                  {security.phoneVerification.expiresAt
                    ? ` | Expires: ${formatDateTime(security.phoneVerification.expiresAt) || security.phoneVerification.expiresAt}`
                    : ""}
                </div>
              ) : null}
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="6-digit code"
                inputMode="numeric"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              />
              <button
                type="submit"
                disabled={isCompleting}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCompleting ? "Verifying..." : "Confirm code"}
              </button>
            </form>
          </div>
        )}
      </section>
    </PrivateAccountShell>
  );
}
