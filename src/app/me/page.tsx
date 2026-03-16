"use client";

import React from "react";
import {
  clearTrustedDeviceToken,
  getTrustedDevicePlayer,
  getTrustedDeviceToken,
  setTrustedDevicePlayer,
} from "@/lib/trusted-device";

type FriendlyMatch = {
  id?: number | string;
  player1Name?: string;
  player2Name?: string;
  player1_points?: number;
  player2_points?: number;
  player1_high_run?: number;
  player2_high_run?: number;
  reportedAt?: string;
};

type TrustedDeviceRow = {
  id?: number | string;
  deviceLabel?: string | null;
  platform?: string | null;
  browser?: string | null;
  appVersion?: string | null;
  lastUsedAt?: string | null;
  isActive?: boolean;
  deviceTokenLast4?: string | null;
};

function formatLocalDate(value?: string | null) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString("el-GR");
  } catch {
    return value;
  }
}

export default function MePage() {
  const [player, setPlayer] = React.useState<any>(null);
  const [matches, setMatches] = React.useState<FriendlyMatch[]>([]);
  const [devices, setDevices] = React.useState<TrustedDeviceRow[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = React.useState<number | string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    const token = getTrustedDeviceToken();
    const cachedPlayer = getTrustedDevicePlayer();
    if (cachedPlayer) setPlayer(cachedPlayer);
    if (!token) {
      setStatus("There is no trusted device token on this device.");
      return;
    }

    const run = async () => {
      const [resolvedRes, matchesRes, devicesRes] = await Promise.all([
        fetch("/api/player-devices/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceToken: token }),
        }),
        fetch(`/api/me/friendly-matches?deviceToken=${encodeURIComponent(token)}`, {
          cache: "no-store",
        }),
        fetch(`/api/me/devices?deviceToken=${encodeURIComponent(token)}`, {
          cache: "no-store",
        }),
      ]);

      const resolvedData = await resolvedRes.json().catch(() => null);
      const matchesData = await matchesRes.json().catch(() => null);
      const devicesData = await devicesRes.json().catch(() => null);

      if (resolvedData?.data?.player) {
        setPlayer(resolvedData.data.player);
        setTrustedDevicePlayer(resolvedData.data.player);
      }
      setMatches(Array.isArray(matchesData?.data) ? matchesData.data : []);
      setDevices(Array.isArray(devicesData?.data) ? devicesData.data : []);
      setCurrentDeviceId(devicesData?.meta?.currentDeviceId ?? null);
    };

    void run();
  }, []);

  const revokeDevice = async (deviceId: number | string) => {
    const token = getTrustedDeviceToken();
    if (!token) return;

    const res = await fetch("/api/me/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, deviceToken: token }),
    });

    if (!res.ok) {
      setStatus("Device revocation failed.");
      return;
    }

    if (String(deviceId) === String(currentDeviceId)) {
      clearTrustedDeviceToken();
      window.location.reload();
      return;
    }

    setDevices((prev) =>
      prev.map((device) =>
        String(device.id) === String(deviceId) ? { ...device, isActive: false } : device,
      ),
    );
    setStatus("The device was revoked.");
  };

  const activeDevices = devices.filter((device) => device.isActive).length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_38%,#f8fafc_72%,#ffffff_100%)] px-4 py-5 text-slate-900 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-700 sm:text-xs">
                Private Player Area
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
                {player?.fullName || "Unknown player"}
              </h1>
              {player?.country ? <p className="mt-2 text-sm text-slate-600">{player.country}</p> : null}
              {player?.isTemporary ? (
                <div className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  Pending admin approval
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => {
                clearTrustedDeviceToken();
                window.location.reload();
              }}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium sm:w-auto sm:rounded-full sm:px-5 sm:py-2"
            >
              Unlink device
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Matches</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{matches.length}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Devices</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{devices.length}</div>
            </div>
            <div className="col-span-2 rounded-2xl bg-slate-50 px-4 py-3 sm:col-span-1">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Active</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{activeDevices}</div>
            </div>
          </div>

          {status ? (
            <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{status}</div>
          ) : null}

          {player?.isTemporary ? (
            <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Your details were saved as temporary. You can play normally, but an admin must approve and connect your
              profile to a regular BT Player.
            </div>
          ) : null}

          <section className="mt-8 sm:mt-10">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-xl font-semibold">Friendly matches</h2>
              <p className="text-sm text-slate-500">Latest history on this trusted player profile.</p>
            </div>

            <div className="mt-4 space-y-3">
              {matches.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                  There are no friendly matches for this device yet.
                </div>
              ) : (
                matches.map((match) => (
                  <article
                    key={String(match.id)}
                    className="rounded-3xl border border-slate-200 bg-slate-50/70 px-4 py-4 sm:px-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-base font-medium text-slate-950">
                          {match.player1Name} vs {match.player2Name}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          Score: {match.player1_points ?? 0} - {match.player2_points ?? 0}
                        </div>
                      </div>
                      {match.reportedAt ? (
                        <div className="text-xs text-slate-500 sm:text-right">{formatLocalDate(match.reportedAt)}</div>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-white px-3 py-1">HR {match.player1_high_run ?? 0}</span>
                      <span className="rounded-full bg-white px-3 py-1">HR {match.player2_high_run ?? 0}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="mt-10 sm:mt-12">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-xl font-semibold">Trusted devices</h2>
              <p className="text-sm text-slate-500">Revoke access for old or lost devices.</p>
            </div>

            <div className="mt-4 space-y-3">
              {devices.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                  There are no other registered devices.
                </div>
              ) : (
                devices.map((device) => (
                  <article
                    key={String(device.id)}
                    className="rounded-3xl border border-slate-200 bg-white px-4 py-4 sm:px-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-950">
                          {device.deviceLabel || device.platform || "Unknown device"}
                          {String(device.id) === String(currentDeviceId) ? " • current" : ""}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {[device.platform, device.browser].filter(Boolean).join(" • ")}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-slate-50 px-3 py-1">
                            token ****{device.deviceTokenLast4 || "----"}
                          </span>
                          {device.lastUsedAt ? (
                            <span className="rounded-full bg-slate-50 px-3 py-1">
                              {formatLocalDate(device.lastUsedAt)}
                            </span>
                          ) : null}
                          {!device.isActive ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1">inactive</span>
                          ) : null}
                        </div>
                      </div>

                      {device.isActive ? (
                        <button
                          type="button"
                          onClick={() => void revokeDevice(String(device.id ?? ""))}
                          className="w-full rounded-2xl border border-red-200 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50 sm:w-auto sm:rounded-full sm:px-4 sm:py-2"
                        >
                          Revoke
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
