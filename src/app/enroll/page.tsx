"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  clearTrustedDeviceToken,
  getTrustedDevicePlayer,
  setTrustedDevicePlayer,
  setTrustedDeviceToken,
} from "@/lib/trusted-device";

type PlayerRow = {
  documentId: string;
  fullName: string;
  country?: string | null;
};

export default function EnrollPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/me";
  const nonce = params.get("nonce") || "";
  const slot = params.get("slot") || "";
  const screenId = params.get("screenId") || "";
  const [trustedPlayerName, setTrustedPlayerName] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<PlayerRow[]>([]);
  const [status, setStatus] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [showRequestForm, setShowRequestForm] = React.useState(false);
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

  React.useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const run = async () => {
      const res = await fetch(`/api/players/search?q=${encodeURIComponent(query.trim())}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({ data: [] }));
      setResults(Array.isArray(data?.data) ? data.data : []);
    };
    void run();
    return () => controller.abort();
  }, [query]);

  const finish = React.useCallback(() => {
    if (nonce && slot && screenId) {
      router.push(`/claim?nonce=${encodeURIComponent(nonce)}&slot=${encodeURIComponent(slot)}&screenId=${encodeURIComponent(screenId)}`);
      return;
    }
    router.push(next);
  }, [next, nonce, router, screenId, slot]);

  const registerDevice = async (playerDocumentId: string) => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/player-devices/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerDocumentId,
          deviceLabel: typeof window !== "undefined" ? window.navigator.userAgent.slice(0, 80) : "browser",
          platform: typeof window !== "undefined" ? window.navigator.platform : "web",
          browser: typeof window !== "undefined" ? window.navigator.userAgent : "web",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.data?.deviceToken) {
        setStatus("Η σύνδεση συσκευής απέτυχε.");
        return;
      }
      setTrustedDeviceToken(data.data.deviceToken);
      if (data.data.player) {
        setTrustedDevicePlayer(data.data.player);
        setTrustedPlayerName(data.data.player.fullName ?? null);
      }
      setStatus("Η συσκευή συνδέθηκε επιτυχώς.");
      setTimeout(finish, 600);
    } finally {
      setBusy(false);
    }
  };

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
        setStatus("Η προσωρινή εγγραφή απέτυχε.");
        return;
      }
      setTrustedDeviceToken(data.data.deviceToken);
      if (data.data.player) {
        setTrustedDevicePlayer(data.data.player);
        setTrustedPlayerName(data.data.player.fullName ?? null);
      }
      setStatus("Η προσωρινή εγγραφή καταχωρήθηκε και μπορείς να παίξεις άμεσα.");
      setTimeout(finish, 700);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a,#020617_60%)] px-5 py-8 text-white">
      <div className="mx-auto max-w-xl rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
        <div className="text-xs uppercase tracking-[0.24em] text-amber-300">Trusted Device Enrollment</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Σύνδεση συσκευής</h1>
        <p className="mt-3 text-sm text-white/70">
          Επίλεξε τον σωστό BT Player μία φορά. Από το επόμενο scan η συσκευή θα κάνει instant claim.
        </p>

        {trustedPlayerName ? (
          <div className="mt-5 rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm">
            Τρέχουσα σύνδεση: <span className="font-semibold">{trustedPlayerName}</span>
          </div>
        ) : null}

        {status ? <div className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-sm">{status}</div> : null}

        <div className="mt-6 flex gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Αναζήτηση BT Player"
            className="flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
          />
          <button
            type="button"
            onClick={() => {
              clearTrustedDeviceToken();
              setTrustedPlayerName(null);
              setStatus("Η συσκευή αποσυνδέθηκε.");
            }}
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm"
          >
            Reset
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {results.map((player) => (
            <button
              key={player.documentId}
              type="button"
              disabled={busy}
              onClick={() => void registerDevice(player.documentId)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10 disabled:opacity-60"
            >
              <div className="font-medium">{player.fullName}</div>
              {player.country ? <div className="mt-1 text-sm text-white/60">{player.country}</div> : null}
            </button>
          ))}
        </div>

        <div className="mt-6 border-t border-white/10 pt-6">
          <button
            type="button"
            onClick={() => setShowRequestForm((prev) => !prev)}
            className="text-sm text-cyan-300 underline underline-offset-4"
          >
            Δεν βρίσκω τον παίκτη μου
          </button>

          {showRequestForm ? (
            <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
              <input
                value={requestForm.fullName}
                onChange={(e) => setRequestForm((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="Full name"
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
                Προσωρινή εγγραφή και play now
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
