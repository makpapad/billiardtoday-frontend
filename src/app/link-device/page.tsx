"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getTrustedDevicePlayer, getTrustedDeviceToken } from "@/lib/trusted-device";
import { playerAccountAuth } from "@/lib/player-account-auth";

export default function LinkDevicePage() {
  const params = useSearchParams();
  const linkToken = params?.get("token") || "";
  const [status, setStatus] = React.useState<string>("Checking trusted device...");
  const [trustedName, setTrustedName] = React.useState<string | null>(null);
  const [isBusy, setIsBusy] = React.useState(true);

  React.useEffect(() => {
    const trusted = getTrustedDevicePlayer();
    setTrustedName(trusted?.fullName ?? null);
  }, []);

  React.useEffect(() => {
    const run = async () => {
      if (!linkToken) {
        setStatus("The link token is missing.");
        setIsBusy(false);
        return;
      }

      const deviceToken = getTrustedDeviceToken();
      if (!deviceToken) {
        if (typeof window !== "undefined") {
          const next = `/link-device?token=${encodeURIComponent(linkToken)}`;
          window.location.replace(`/enroll?next=${encodeURIComponent(next)}`);
        }
        return;
      }

      try {
        await playerAccountAuth.completeDeviceLink({ linkToken, deviceToken });
        setStatus("The account was linked successfully. You can return to the computer now.");
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Device linking failed.");
      } finally {
        setIsBusy(false);
      }
    };

    void run();
  }, [linkToken]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a,#020617_60%)] px-5 py-8 text-white">
      <div className="mx-auto max-w-xl rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
        <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">Account Pairing</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Link this phone to your account</h1>
        <p className="mt-3 text-sm text-white/70">
          This step confirms that the phone already enrolled on the scoreboard belongs to the account waiting on your computer.
        </p>

        {trustedName ? (
          <div className="mt-5 rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm">
            Trusted device found for: <span className="font-semibold">{trustedName}</span>
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/80">
          {status}
        </div>

        {!isBusy ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/me" className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950">
              Open my profile
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white"
            >
              Retry
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
