"use client";

import React from "react";

const VERIFICATION_METHODS = [
  { value: "club-admin", label: "Club admin" },
  { value: "club-manager", label: "Club manager" },
  { value: "federation-admin", label: "Federation admin" },
  { value: "federation-manager", label: "Federation manager" },
];

type ExistingPlayer = {
  id?: number | string;
  documentId?: string;
  full_name?: string | null;
  fullName?: string | null;
  country?: string | null;
};

type VerificationEvent = {
  id?: number | string;
  documentId?: string;
  decision?: "approved" | "rejected" | null;
  verificationMethod?: string | null;
  reviewerIdentity?: string | null;
  club?: string | null;
  federation?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  candidatePlayer?: ExistingPlayer | null;
  finalPlayer?: ExistingPlayer | null;
};

type RequestRow = {
  id?: number | string;
  documentId?: string;
  displayName?: string | null;
  fullNameSubmitted?: string | null;
  country?: string | null;
  clubName?: string | null;
  mobile?: string | null;
  email?: string | null;
  status?: string | null;
  identityStatus?: string | null;
  accountCompletionStatus?: string | null;
  createdAt?: string | null;
  linkedAccount?: {
    documentId?: string | null;
    email?: string | null;
    fullName?: string | null;
    status?: string | null;
    emailVerifiedAt?: string | null;
  } | null;
  candidatePlayer?: ExistingPlayer | null;
  linkedPlayer?: ExistingPlayer | null;
  verificationHistory?: VerificationEvent[];
};

function playerLabel(player?: ExistingPlayer | null) {
  return player?.full_name || player?.fullName || "Unnamed player";
}

function formatDateTime(value?: string | null) {
  if (!value) return "Unknown time";
  return new Date(value).toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function identityLabel(value?: string | null) {
  if (value === "pending_review") return "Pending review";
  if (value === "verified") return "Verified";
  if (value === "rejected") return "Rejected";
  return "Temporary";
}

export default function PlayerEnrollmentRequestsAdminPage() {
  const [rows, setRows] = React.useState<RequestRow[]>([]);
  const [status, setStatus] = React.useState<string | null>(null);
  const [playerResults, setPlayerResults] = React.useState<Record<string, ExistingPlayer[]>>({});
  const [playerQuery, setPlayerQuery] = React.useState<Record<string, string>>({});
  const [selectedPlayerByRequest, setSelectedPlayerByRequest] = React.useState<Record<string, ExistingPlayer | null>>({});
  const [methodByRequest, setMethodByRequest] = React.useState<Record<string, string>>({});
  const [notesByRequest, setNotesByRequest] = React.useState<Record<string, string>>({});
  const [clubByRequest, setClubByRequest] = React.useState<Record<string, string>>({});
  const [federationByRequest, setFederationByRequest] = React.useState<Record<string, string>>({});
  const [historyByRequest, setHistoryByRequest] = React.useState<Record<string, VerificationEvent[]>>({});
  const [loadingHistory, setLoadingHistory] = React.useState<Record<string, boolean>>({});

  const load = React.useCallback(async () => {
    const res = await fetch("/api/admin/player-enrollment-requests", { cache: "no-store" });
    const data = await res.json().catch(() => ({ data: [] }));
    const nextRows = Array.isArray(data?.data) ? data.data : [];
    setRows(nextRows);
    setHistoryByRequest((prev) => {
      const next = { ...prev };
      for (const row of nextRows) {
        const requestId = String(row.documentId || row.id || "");
        if (requestId && Array.isArray(row.verificationHistory)) {
          next[requestId] = row.verificationHistory;
        }
      }
      return next;
    });
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

  const reviewPayload = (requestId: string, playerDocumentId?: string) => ({
    verificationMethod: methodByRequest[requestId] || VERIFICATION_METHODS[0].value,
    adminNotes: notesByRequest[requestId] || undefined,
    club: clubByRequest[requestId] || undefined,
    federation: federationByRequest[requestId] || undefined,
    ...(playerDocumentId ? { playerDocumentId } : {}),
  });

  const approve = async (requestId: string, playerDocumentId?: string) => {
    const res = await fetch(`/api/admin/player-enrollment-requests/${encodeURIComponent(requestId)}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reviewPayload(requestId, playerDocumentId)),
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      setStatus(errorText || "Approval failed.");
      return;
    }
    setStatus("Verification approved.");
    setSelectedPlayerByRequest((prev) => ({ ...prev, [requestId]: null }));
    setPlayerResults((prev) => ({ ...prev, [requestId]: [] }));
    setPlayerQuery((prev) => ({ ...prev, [requestId]: "" }));
    await load();
  };

  const reject = async (requestId: string) => {
    const res = await fetch(`/api/admin/player-enrollment-requests/${encodeURIComponent(requestId)}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reviewPayload(requestId)),
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      setStatus(errorText || "Rejection failed.");
      return;
    }
    setStatus("Verification rejected.");
    await load();
  };

  const loadHistory = async (requestId: string) => {
    setLoadingHistory((prev) => ({ ...prev, [requestId]: true }));
    try {
      const res = await fetch(`/api/admin/player-enrollment-requests/${encodeURIComponent(requestId)}/history`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({ data: [] }));
      setHistoryByRequest((prev) => ({
        ...prev,
        [requestId]: Array.isArray(data?.data) ? data.data : [],
      }));
    } finally {
      setLoadingHistory((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="text-xs uppercase tracking-[0.24em] text-cyan-700">Trusted Reviewer</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Official player verification queue</h1>
          <p className="mt-3 text-sm text-slate-600">
            Review temporary identities that already belong to verified accounts. You can link them to an existing
            canonical BT Player, create a new canonical player, or reject the official-link request while keeping the
            temporary identity active.
          </p>

          {status ? <div className="mt-4 rounded-2xl bg-cyan-50 px-4 py-3 text-sm text-cyan-900">{status}</div> : null}

          <div className="mt-8 space-y-4">
            {rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500">
                No pending player verification requests were found.
              </div>
            ) : (
              rows.map((row) => {
                const requestId = String(row.documentId || row.id || "");
                const matches = playerResults[requestId] || [];
                const history = historyByRequest[requestId] || [];
                const selectedPlayer = selectedPlayerByRequest[requestId] || null;

                return (
                  <div key={requestId} className="rounded-2xl border border-slate-200 p-5">
                    <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="text-xl font-semibold">{row.displayName || row.fullNameSubmitted}</div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {identityLabel(row.identityStatus)}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-slate-600">
                          Submitted official name: {row.fullNameSubmitted || "Not provided"}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {row.country || "Unknown country"} | {row.clubName || "Unknown club"}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {row.mobile || "No mobile"} | {row.email || "No email"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">Created: {formatDateTime(row.createdAt)}</div>

                        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                          <div className="font-medium text-slate-900">Linked account</div>
                          <div className="mt-2">{row.linkedAccount?.fullName || "Unnamed account owner"}</div>
                          <div>{row.linkedAccount?.email || "No email"}</div>
                          <div className="text-xs text-slate-500">
                            Account status: {row.linkedAccount?.status || "Unknown"} | Email verified:{" "}
                            {row.linkedAccount?.emailVerifiedAt ? formatDateTime(row.linkedAccount.emailVerifiedAt) : "No"}
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                          <div className="font-medium text-slate-900">Current candidate</div>
                          <div className="mt-2">
                            {row.candidatePlayer
                              ? `${playerLabel(row.candidatePlayer)} (${row.candidatePlayer.country || "Unknown country"})`
                              : "No candidate selected yet"}
                          </div>
                          <div className="mt-3 font-medium text-slate-900">Current final player</div>
                          <div className="mt-2">
                            {row.linkedPlayer
                              ? `${playerLabel(row.linkedPlayer)} (${row.linkedPlayer.country || "Unknown country"})`
                              : "No final player linked"}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-700">
                          Verification method
                          <select
                            value={methodByRequest[requestId] || VERIFICATION_METHODS[0].value}
                            onChange={(e) =>
                              setMethodByRequest((prev) => ({ ...prev, [requestId]: e.target.value }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
                          >
                            {VERIFICATION_METHODS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <input
                          value={playerQuery[requestId] || ""}
                          onChange={(e) => void searchPlayers(requestId, e.target.value)}
                          placeholder="Search existing BT Player"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
                        />

                        <div className="space-y-2">
                          {matches.map((player) => (
                            <button
                              key={String(player.documentId || player.id)}
                              type="button"
                              onClick={() =>
                                setSelectedPlayerByRequest((prev) => ({
                                  ...prev,
                                  [requestId]: player,
                                }))
                              }
                              className={`w-full rounded-xl border px-3 py-3 text-left text-sm ${
                                selectedPlayer?.documentId === player.documentId
                                  ? "border-emerald-300 bg-emerald-50"
                                  : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                              }`}
                            >
                              <div className="font-medium">{playerLabel(player)}</div>
                              <div className="text-slate-500">{player.country || "Unknown country"}</div>
                            </button>
                          ))}
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                          <div className="font-medium text-slate-900">Selected existing BT Player</div>
                          <div className="mt-2">
                            {selectedPlayer
                              ? `${playerLabel(selectedPlayer)} (${selectedPlayer.country || "Unknown country"})`
                              : "No player selected yet"}
                          </div>
                        </div>

                        <input
                          value={clubByRequest[requestId] || ""}
                          onChange={(e) => setClubByRequest((prev) => ({ ...prev, [requestId]: e.target.value }))}
                          placeholder="Club context (optional)"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
                        />

                        <input
                          value={federationByRequest[requestId] || ""}
                          onChange={(e) =>
                            setFederationByRequest((prev) => ({ ...prev, [requestId]: e.target.value }))
                          }
                          placeholder="Federation context (optional)"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
                        />

                        <textarea
                          value={notesByRequest[requestId] || ""}
                          onChange={(e) => setNotesByRequest((prev) => ({ ...prev, [requestId]: e.target.value }))}
                          placeholder="Reviewer notes"
                          rows={4}
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
                        />

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => void approve(requestId, String(selectedPlayer?.documentId || ""))}
                            disabled={!selectedPlayer?.documentId}
                            className="rounded-full border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Approve selected BT Player
                          </button>
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
                          <button
                            type="button"
                            onClick={() => void loadHistory(requestId)}
                            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
                          >
                            {loadingHistory[requestId] ? "Loading history..." : "Refresh history"}
                          </button>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="text-sm font-medium text-slate-900">Verification history</div>
                          {history.length === 0 ? (
                            <div className="mt-2 text-sm text-slate-500">No audit events yet.</div>
                          ) : (
                            <div className="mt-3 space-y-3">
                              {history.map((event) => (
                                <div
                                  key={String(event.documentId || event.id)}
                                  className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium text-slate-900">
                                      {event.decision === "approved" ? "Approved" : "Rejected"}
                                    </span>
                                    <span className="text-slate-500">{event.verificationMethod || "Unknown method"}</span>
                                  </div>
                                  <div className="mt-1 text-slate-600">
                                    Reviewer: {event.reviewerIdentity || "Unknown reviewer"} | {formatDateTime(event.createdAt)}
                                  </div>
                                  <div className="mt-1 text-slate-600">
                                    Candidate: {event.candidatePlayer ? playerLabel(event.candidatePlayer) : "None"} | Final:{" "}
                                    {event.finalPlayer ? playerLabel(event.finalPlayer) : "None"}
                                  </div>
                                  <div className="mt-1 text-slate-600">
                                    Club: {event.club || "None"} | Federation: {event.federation || "None"}
                                  </div>
                                  {event.notes ? <div className="mt-1 text-slate-700">{event.notes}</div> : null}
                                </div>
                              ))}
                            </div>
                          )}
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
