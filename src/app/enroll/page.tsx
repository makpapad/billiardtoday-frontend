"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import {
  clearTrustedDeviceToken,
  getTrustedDevicePlayer,
  getTrustedDeviceToken,
  setTrustedDevicePlayer,
  setTrustedDeviceToken,
} from "@/lib/trusted-device";

export default function EnrollPage() {
  const params = useSearchParams();
  const next = params?.get("next") || "/me";
  const nonce = params?.get("nonce") || "";
  const slot = params?.get("slot") || "";
  const screenId = params?.get("screenId") || "";
  const [trustedPlayerName, setTrustedPlayerName] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [requestForm, setRequestForm] = React.useState({
    fullName: "",
    country: "",
    clubName: "",
    mobile: "",
    email: "",
  });

  React.useEffect(() => {
    const trusted = getTrustedDevicePlayer();
    setTrustedPlayerName(trusted?.fullName ?? null);
  }, []);

  const finish = React.useCallback(() => {
    if (typeof window === "undefined") return;
    if (nonce && slot && screenId) {
      window.location.assign(
        `/claim?nonce=${encodeURIComponent(nonce)}&slot=${encodeURIComponent(slot)}&screenId=${encodeURIComponent(screenId)}`,
      );
      return;
    }
    window.location.assign(next);
  }, [next, nonce, screenId, slot]);

  const submitEnrollmentRequest = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/player-devices/enrollment-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...requestForm,
          screenIdentifier: screenId || null,
          deviceLabel: typeof window !== "undefined" ? window.navigator.userAgent.slice(0, 80) : "browser",
          platform: typeof window !== "undefined" ? window.navigator.platform : "web",
          browser: typeof window !== "undefined" ? window.navigator.userAgent : "web",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.data?.deviceToken) {
        setStatus("Temporary enrollment failed.");
        return;
      }
      setTrustedDeviceToken(data.data.deviceToken);
      if (data.data.player) {
        setTrustedDevicePlayer(data.data.player);
        setTrustedPlayerName(data.data.player.fullName ?? null);
      }
      setStatus("Temporary enrollment was created. You can continue to the scoreboard now.");
      setTimeout(finish, 700);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Temporary enrollment failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a,#020617_60%)] px-5 py-8 text-white">
      <div className="mx-auto max-w-xl rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
        <div className="text-xs uppercase tracking-[0.24em] text-amber-300">Temporary Enrollment</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Play Now</h1>
        <p className="mt-3 text-sm text-white/70">
          Create a temporary player profile for this device. Official player verification happens later and is not part
          of this step.
        </p>

        {trustedPlayerName ? (
          <div className="mt-5 rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm">
            Current device profile: <span className="font-semibold">{trustedPlayerName}</span>
          </div>
        ) : null}

        {status ? <div className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-sm">{status}</div> : null}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={async () => {
              setBusy(true);
              setStatus(null);
              try {
                const deviceToken = getTrustedDeviceToken();
                if (deviceToken) {
                  await fetch("/api/player-devices/revoke-current", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ deviceToken }),
                  });
                }
              } catch {
                // Local reset still runs even if backend revoke fails.
              } finally {
                clearTrustedDeviceToken();
                setTrustedPlayerName(null);
                setStatus("This device profile was cleared.");
                setBusy(false);
              }
            }}
            disabled={busy}
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm disabled:opacity-60"
          >
            Reset device
          </button>
        </div>

        <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
          <input
            value={requestForm.fullName}
            onChange={(e) => setRequestForm((prev) => ({ ...prev, fullName: e.target.value }))}
            placeholder="Display or full name"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />
          <input
            value={requestForm.country}
            onChange={(e) => setRequestForm((prev) => ({ ...prev, country: e.target.value }))}
            placeholder="Country"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />
          <input
            value={requestForm.clubName}
            onChange={(e) => setRequestForm((prev) => ({ ...prev, clubName: e.target.value }))}
            placeholder="Club"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />
          <input
            value={requestForm.mobile}
            onChange={(e) => setRequestForm((prev) => ({ ...prev, mobile: e.target.value }))}
            placeholder="Mobile"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />
          <input
            value={requestForm.email}
            onChange={(e) => setRequestForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="Email"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />
          <button
            type="button"
            disabled={
              busy ||
              !requestForm.fullName.trim() ||
              !requestForm.country.trim() ||
              !requestForm.clubName.trim() ||
              !requestForm.mobile.trim() ||
              !requestForm.email.trim()
            }
            onClick={() => void submitEnrollmentRequest()}
            className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-medium text-slate-950 disabled:opacity-50"
          >
            Create temporary profile and continue
          </button>
        </div>
      </div>
    </main>
  );
}
