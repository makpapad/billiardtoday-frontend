"use client";

import React from "react";

type RequestRow = {
  id?: number | string;
  documentId?: string;
  fullName?: string;
  country?: string;
  clubName?: string;
  mobile?: string;
  email?: string;
  createdAt?: string;
};

type ExistingPlayer = {
  id?: number | string;
  documentId?: string;
  full_name?: string;
  country?: string | null;
};

export default function PlayerEnrollmentRequestsAdminPage() {
  const [rows, setRows] = React.useState<RequestRow[]>([]);
  const [status, setStatus] = React.useState<string | null>(null);
  const [playerResults, setPlayerResults] = React.useState<Record<string, ExistingPlayer[]>>({});
  const [playerQuery, setPlayerQuery] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    const res = await fetch("/api/admin/player-enrollment-requests", { cache: "no-store" });
    const data = await res.json().catch(() => ({ data: [] }));
    setRows(Array.isArray(data?.data) ? data.data : []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const searchPlayers = async (requestId: string, query: string) => {
    setPlayerQuery((prev) => ({ ...prev, [requestId]: query }));
    if (query.trim().length < 2) {
      setPlayerResults((prev) => ({ ...prev, [requestId]: [] }));
      return;
    }

    const params = new URLSearchParams();
    params.set("filters[$or][0][full_name][$containsi]", query);
    params.set("filters[$or][1][full_name_en][$containsi]", query);
    const res = await fetch(`/api/admin/tournament/players?${params.toString()}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({ data: [] }));
    setPlayerResults((prev) => ({ ...prev, [requestId]: Array.isArray(data?.data) ? data.data : [] }));
  };

  const approve = async (requestId: string, playerDocumentId?: string) => {
    const res = await fetch(`/api/admin/player-enrollment-requests/${encodeURIComponent(requestId)}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(playerDocumentId ? { playerDocumentId } : {}),
    });
    if (!res.ok) {
      setStatus("Το approve απέτυχε.");
      return;
    }
    setStatus("Το request εγκρίθηκε.");
    await load();
  };

  const reject = async (requestId: string) => {
    const res = await fetch(`/api/admin/player-enrollment-requests/${encodeURIComponent(requestId)}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      setStatus("Το reject απέτυχε.");
      return;
    }
    setStatus("Το request απορρίφθηκε.");
    await load();
  };

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="text-xs uppercase tracking-[0.24em] text-cyan-700">Admin Helper</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Player enrollment requests</h1>
          <p className="mt-3 text-sm text-slate-600">
            Εδώ εγκρίνεις pending requests και είτε δημιουργείς νέο BT Player είτε τα συνδέεις με υπάρχον.
          </p>

          {status ? <div className="mt-4 rounded-2xl bg-cyan-50 px-4 py-3 text-sm text-cyan-900">{status}</div> : null}

          <div className="mt-8 space-y-4">
            {rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500">
                Δεν υπάρχουν pending requests.
              </div>
            ) : (
              rows.map((row) => {
                const requestId = String(row.documentId || row.id || "");
                const matches = playerResults[requestId] || [];
                return (
                  <div key={requestId} className="rounded-2xl border border-slate-200 p-5">
                    <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                      <div>
                        <div className="text-xl font-semibold">{row.fullName}</div>
                        <div className="mt-2 text-sm text-slate-600">
                          {row.country} • {row.clubName}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {row.mobile} • {row.email}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {row.createdAt
                            ? new Date(row.createdAt).toLocaleString("el-GR", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              })
                            : ""}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <input
                          value={playerQuery[requestId] || ""}
                          onChange={(e) => void searchPlayers(requestId, e.target.value)}
                          placeholder="Αναζήτηση υπάρχοντος BT Player"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
                        />
                        <div className="space-y-2">
                          {matches.map((player) => (
                            <button
                              key={String(player.documentId || player.id)}
                              type="button"
                              onClick={() => void approve(requestId, String(player.documentId || ""))}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm hover:bg-slate-100"
                            >
                              <div className="font-medium">{player.full_name}</div>
                              <div className="text-slate-500">{player.country || "Unknown country"}</div>
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => void approve(requestId)}
                            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
                          >
                            Create new BT Player
                          </button>
                          <button
                            type="button"
                            onClick={() => void reject(requestId)}
                            className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
