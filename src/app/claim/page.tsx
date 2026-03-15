"use client";

import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getTrustedDevicePlayer,
  getTrustedDeviceToken,
} from "@/lib/trusted-device";

export default function ClaimPage() {
  const params = useSearchParams();
  const router = useRouter();
  const nonce = params.get("nonce") || "";
  const slot = params.get("slot") || "p1";
  const screenId = params.get("screenId") || "";
  const [trustedPlayerName, setTrustedPlayerName] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const trusted = getTrustedDevicePlayer();
    setTrustedPlayerName(trusted?.fullName ?? null);
  }, []);

  const claimWithToken = React.useCallback(async (deviceToken: string) => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/player-devices/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nonce, screenIdentifier: screenId, deviceToken }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus(data?.error || "Το claim απέτυχε.");
        return;
      }
      setStatus("Η σύνδεση με το scoreboard ολοκληρώθηκε.");
      setTimeout(() => router.push("/me"), 700);
    } finally {
      setBusy(false);
    }
  }, [nonce, router, screenId]);

  React.useEffect(() => {
    const deviceToken = getTrustedDeviceToken();
    if (nonce && screenId) {
      if (deviceToken) {
        void claimWithToken(deviceToken);
      } else {
        const next = `/claim?nonce=${encodeURIComponent(nonce)}&slot=${encodeURIComponent(slot)}&screenId=${encodeURIComponent(screenId)}`;
        router.replace(`/enroll?next=${encodeURIComponent("/me")}&nonce=${encodeURIComponent(nonce)}&slot=${encodeURIComponent(slot)}&screenId=${encodeURIComponent(screenId)}`);
        void next;
      }
    }
  }, [claimWithToken, nonce, router, screenId, slot]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1e293b,#020617_60%)] px-5 py-8 text-white">
      <div className="mx-auto max-w-xl rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
        <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">Trusted Device Claim</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Player {slot === "p2" ? "2" : "1"} pairing</h1>
        <p className="mt-3 text-sm text-white/70">
          Αν η συσκευή σου είναι ήδη συνδεδεμένη, το claim γίνεται αυτόματα. Αν όχι, θα μεταφερθείς στο enrollment flow.
        </p>
        {!screenId ? (
          <div className="mt-4 rounded-2xl bg-red-500/15 px-4 py-3 text-sm">
            Λείπει το screen id. Το claim δεν μπορεί να ολοκληρωθεί.
          </div>
        ) : null}

        {trustedPlayerName ? (
          <div className="mt-5 rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm">
            Συνδεδεμένη συσκευή για: <span className="font-semibold">{trustedPlayerName}</span>
          </div>
        ) : null}

        {status ? <div className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-sm">{status}</div> : null}
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/75">
          {busy ? "Γίνεται έλεγχος trusted device..." : "Αναμονή για αυτόματο claim ή redirect στο enrollment."}
        </div>
      </div>
    </main>
  );
}
