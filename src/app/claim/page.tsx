"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import {
  getTrustedDevicePlayer,
  getTrustedDeviceToken,
} from "@/lib/trusted-device";

function shortNonce(value: string | null | undefined) {
  if (!value) return null;
  return value.slice(0, 8);
}

function extractErrorText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = extractErrorText(item);
      if (text) return text;
    }
    return "";
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const directCandidates = [
      record.message,
      record.error,
      record.details,
      record.data,
    ];

    for (const candidate of directCandidates) {
      const text = extractErrorText(candidate);
      if (text) return text;
    }
  }

  return "";
}

export default function ClaimPage() {
  const params = useSearchParams();
  const nonce = params?.get("nonce") || "";
  const slot = params?.get("slot") || "p1";
  const screenId = params?.get("screenId") || "";
  const [trustedPlayerName, setTrustedPlayerName] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [debugLines, setDebugLines] = React.useState<string[]>([]);

  const pushDebug = React.useCallback((label: string, payload?: Record<string, unknown>) => {
    const line = payload ? `${label} ${JSON.stringify(payload)}` : label;
    console.log("[claim-debug]", line);
    setDebugLines((prev) => [...prev.slice(-7), line]);
  }, []);

  const presentClaimError = React.useCallback((message?: unknown) => {
    const text = extractErrorText(message);
    if (!text) {
      return "The scoreboard link could not be completed. Return to the scoreboard and scan a new QR code.";
    }
    if (/expired/i.test(text)) {
      return "This scoreboard link expired. Return to the scoreboard and scan the new QR code.";
    }
    if (/not found/i.test(text) || /claim link/i.test(text)) {
      return "This scoreboard link is no longer valid. Return to the scoreboard and scan a new QR code.";
    }
    if (/device not found/i.test(text)) {
      return "This phone is not linked yet. Continue to enrollment and try again.";
    }
    return text;
  }, []);

  React.useEffect(() => {
    const trusted = getTrustedDevicePlayer();
    setTrustedPlayerName(trusted?.fullName ?? null);
    pushDebug("page opened", {
      slot,
      screenId,
      nonce8: shortNonce(nonce),
      trustedPlayerName: trusted?.fullName ?? null,
      trustedPlayerDocumentId: trusted?.documentId ?? null,
      trustedEnrollmentRequestId: trusted?.enrollmentRequestId ?? null,
    });
  }, [nonce, pushDebug, screenId, slot]);

  const claimWithToken = React.useCallback(async (deviceToken: string) => {
    setBusy(true);
    setStatus(null);
    pushDebug("attempting trusted-device claim", {
      slot,
      screenId,
      nonce8: shortNonce(nonce),
      deviceTokenLast4: deviceToken.slice(-4),
    });
    try {
      const res = await fetch("/api/player-devices/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nonce, screenIdentifier: screenId, deviceToken }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        pushDebug("claim failed", {
          slot,
          screenId,
          nonce8: shortNonce(nonce),
          status: res.status,
          payload: data,
        });
        setStatus(presentClaimError(data || "Claim failed."));
        return;
      }
      pushDebug("claim succeeded", {
        slot,
        screenId,
        nonce8: shortNonce(nonce),
        payload: data,
      });
      setStatus("The scoreboard link was completed.");
      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          window.location.assign("/me");
        }, 700);
      }
    } catch (err) {
      pushDebug("claim exception", {
        slot,
        screenId,
        nonce8: shortNonce(nonce),
        error: err instanceof Error ? err.message : err,
      });
      setStatus(presentClaimError(err instanceof Error ? err.message : "Claim failed."));
    } finally {
      setBusy(false);
    }
  }, [nonce, presentClaimError, pushDebug, screenId, slot]);

  React.useEffect(() => {
    try {
      const deviceToken = getTrustedDeviceToken();
      if (nonce && screenId) {
        if (deviceToken) {
          void claimWithToken(deviceToken);
        } else if (typeof window !== "undefined") {
          pushDebug("no trusted device token, redirecting to enroll", {
            slot,
            screenId,
            nonce8: shortNonce(nonce),
          });
          window.location.replace(
            `/enroll?next=${encodeURIComponent("/me")}&nonce=${encodeURIComponent(nonce)}&slot=${encodeURIComponent(slot)}&screenId=${encodeURIComponent(screenId)}`,
          );
        }
      }
    } catch (err) {
      pushDebug("flow exception", {
        slot,
        screenId,
        nonce8: shortNonce(nonce),
        error: err instanceof Error ? err.message : err,
      });
      setStatus(presentClaimError(err instanceof Error ? err.message : "Claim flow failed."));
      setBusy(false);
    }
  }, [claimWithToken, nonce, presentClaimError, pushDebug, screenId, slot]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1e293b,#020617_60%)] px-5 py-8 text-white">
      <div className="mx-auto max-w-xl rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
        <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">Trusted Device Claim</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Player {slot === "p2" ? "2" : "1"} pairing</h1>
        <p className="mt-3 text-sm text-white/70">
          If your device is already linked, the claim will complete automatically. Otherwise, you will be redirected to the enrollment flow.
        </p>
        {!screenId ? (
          <div className="mt-4 rounded-2xl bg-red-500/15 px-4 py-3 text-sm">
            The screen ID is missing. The claim cannot be completed.
          </div>
        ) : null}

        {trustedPlayerName ? (
          <div className="mt-5 rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm">
            Linked device for: <span className="font-semibold">{trustedPlayerName}</span>
          </div>
        ) : null}

        {status ? <div className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-sm">{status}</div> : null}
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/75">
          {busy ? "Checking trusted device..." : "Waiting for automatic claim or redirect to enrollment."}
        </div>
        <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
          <div>debug nonce8={shortNonce(nonce) ?? "none"} slot={slot} screenId={screenId || "none"}</div>
          {debugLines.map((line, index) => (
            <div key={`${index}-${line}`} className="mt-1 break-all font-mono text-[11px] text-amber-50/90">
              {line}
            </div>
          ))}
        </div>
        {!busy && status && /scoreboard link|phone is not linked/i.test(status) ? (
          <div className="mt-4 text-sm text-white/70">
            If needed, return to the scoreboard, open a fresh QR and scan again.
          </div>
        ) : null}
      </div>
    </main>
  );
}
