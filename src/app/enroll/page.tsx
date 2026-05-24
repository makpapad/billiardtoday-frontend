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
  const inheritsClubFromScreen = Boolean(screenId.trim());
  const [trustedPlayerName, setTrustedPlayerName] = React.useState<string | null>(null);
  const [screenClubName, setScreenClubName] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [requestForm, setRequestForm] = React.useState({
    displayName: "",
    email: "",
  });

  React.useEffect(() => {
    const trusted = getTrustedDevicePlayer();
    setTrustedPlayerName(trusted?.displayName ?? trusted?.fullName ?? null);
  }, []);

  React.useEffect(() => {
    if (!screenId) {
      setScreenClubName(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/scoreboard/screens/by-identifier/${encodeURIComponent(screenId)}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const clubName =
          typeof data?.data?.club?.name === "string" && data.data.club.name.trim()
            ? data.data.club.name.trim()
            : null;
        setScreenClubName(clubName);
      })
      .catch(() => {
        if (!cancelled) setScreenClubName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [screenId]);

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
        setTrustedPlayerName(data.data.player.displayName ?? data.data.player.fullName ?? null);
      }
      setStatus(
        data.data.accountInstructionsEmailSent
          ? "You're in. We also sent an account link to your email."
          : "You're in. You can play now.",
      );
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
        <div className="text-xs uppercase tracking-[0.24em] text-amber-300">Player Setup</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Play now</h1>
        <p className="mt-3 text-sm text-white/70">
          Add your name and email. You can play immediately; account verification happens later.
        </p>
        {inheritsClubFromScreen ? (
          <div className="mt-4 rounded-2xl bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            {screenClubName ? `Club: ${screenClubName}` : "This scoreboard will add the club automatically."}
          </div>
        ) : null}

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
            value={requestForm.displayName}
            onChange={(e) => setRequestForm((prev) => ({ ...prev, displayName: e.target.value }))}
            placeholder="Your name"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />
          <input
            value={requestForm.email}
            onChange={(e) => setRequestForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="Email"
            type="email"
            autoComplete="email"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />
          <button
            type="button"
            disabled={
              busy ||
              !requestForm.displayName.trim() ||
              !requestForm.email.trim()
            }
            onClick={() => void submitEnrollmentRequest()}
            className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-medium text-slate-950 disabled:opacity-50"
          >
            Continue to scoreboard
          </button>
        </div>
      </div>
    </main>
  );
}
