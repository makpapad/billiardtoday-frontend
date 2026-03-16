"use client";

import React from "react";
import { useAccountSession } from "@/components/account/AccountSessionProvider";
import {
  AccountAccessCard,
  PrivateAccountShell,
  formatDateTime,
} from "@/components/account/PrivateAccountShell";
import { playerAccountAuth, type PlayerAccountDevice } from "@/lib/player-account-auth";

export default function AccountDevicesPage() {
  const { account, setAccount, isLoading } = useAccountSession();
  const [devices, setDevices] = React.useState<PlayerAccountDevice[]>([]);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const loadDevices = React.useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const data = await playerAccountAuth.devices();
      setDevices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trusted devices could not be loaded.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    if (!account) return;
    void loadDevices();
  }, [account, loadDevices]);

  const revokeDevice = async (deviceId: number | string) => {
    const key = String(deviceId);
    setRevokingId(key);
    setError(null);
    setNotice(null);
    try {
      const updated = await playerAccountAuth.revokeDevice(deviceId);
      setDevices((prev) =>
        prev.map((device) => (String(device.id) === String(updated.id) ? { ...device, ...updated } : device)),
      );
      setNotice("The device was revoked.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Device revoke failed.");
    } finally {
      setRevokingId(null);
    }
  };

  if (isLoading) {
    return <main className="min-h-screen px-4 py-8">Loading account...</main>;
  }

  if (!account) {
    return <AccountAccessCard onAuthenticated={async (next) => setAccount(next)} />;
  }

  return (
    <PrivateAccountShell account={account} setAccount={setAccount} activeHref="/account/devices">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Trusted Devices</h2>
          <p className="mt-1 text-sm text-slate-600">Devices linked to this player account or enrollment profile.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadDevices()}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {notice ? <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}

      <div className="mt-6 space-y-4">
        {devices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
            No trusted devices have been linked yet.
          </div>
        ) : (
          devices.map((device) => (
            <article key={String(device.id)} className="rounded-3xl border border-slate-200 bg-white px-5 py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-slate-950">
                    {device.deviceLabel || device.platform || "Unknown device"}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {[device.platform, device.browser].filter(Boolean).join(" · ") || "No platform details yet"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      device.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {device.isActive ? "Active" : "Inactive"}
                  </span>
                  {device.isActive ? (
                    <button
                      type="button"
                      onClick={() => void revokeDevice(String(device.id ?? ""))}
                      className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                      {revokingId === String(device.id) ? "Revoking..." : "Revoke"}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-50 px-3 py-1">token ****{device.deviceTokenLast4 || "----"}</span>
                {device.appVersion ? (
                  <span className="rounded-full bg-slate-50 px-3 py-1">App {device.appVersion}</span>
                ) : null}
                {device.lastUsedAt ? (
                  <span className="rounded-full bg-slate-50 px-3 py-1">{formatDateTime(device.lastUsedAt)}</span>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </PrivateAccountShell>
  );
}
