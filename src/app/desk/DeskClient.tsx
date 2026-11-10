"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* Τύποι                                                              */
/* ------------------------------------------------------------------ */

type Stage = { documentId: string; title?: string | null; stageType?: string | null };
type DeskEvent = { documentId: string; title?: string | null; season?: number | null; stages: Stage[] };
type Schedule = {
  tournament: { documentId: string; title?: string | null; startDate?: string | null; endDate?: string | null };
  events: DeskEvent[];
};
type Me = {
  assignment: { id: number; displayName?: string | null; scope?: string | null };
  tournament?: { documentId: string; title?: string | null } | null;
};
type Match = {
  documentId: string;
  matchNumber?: number | null;
  groupLabel?: string | null;
  player1?: string | null;
  player2?: string | null;
  points?: [number | null, number | null];
  done?: boolean;
};

type Side = { points: number; innings: number; highRun: number };
type TableState = {
  sessionId: string;
  screenIdentifier: string;
  mode: "direct" | "screen";
  matchLabel: string;
  names: [string, string];
  p1: Side;
  p2: Side;
  active: 0 | 1;
  buffer: string;
  finished: boolean;
  saving: boolean;
  error: string | null;
};

const TOKEN_KEY = "desk.token";

/* ------------------------------------------------------------------ */
/* Μικρά βοηθήματα                                                    */
/* ------------------------------------------------------------------ */

async function api<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (json && (json?.error?.message || json?.error || json?.message)) || "Το αίτημα απέτυχε";
    throw new Error(typeof message === "string" ? message : "Το αίτημα απέτυχε");
  }
  return json as T;
}

function playerName(match: Match, side: 1 | 2): string {
  const value = side === 1 ? match.player1 : match.player2;
  return (value || (side === 1 ? "Παίκτης 1" : "Παίκτης 2")).trim();
}

function matchLabel(match: Match): string {
  return `Αγώνας ${match.matchNumber ?? match.documentId}`;
}

/* ------------------------------------------------------------------ */
/* Σελίδα                                                             */
/* ------------------------------------------------------------------ */

export default function DeskClient() {
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [eventId, setEventId] = useState<string>("");
  const [stageId, setStageId] = useState<string>("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [tableNo, setTableNo] = useState<number>(1);
  const [table, setTable] = useState<TableState | null>(null);
  const [mode, setMode] = useState<"point" | "total">("total");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* --- σύνδεση με κωδικό --- */
  const login = useCallback(async () => {
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) {
      setError("Γράψε τον κωδικό του χειριστή");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ data: Me; meta: { token: string } }>("/api/desk/login", null, {
        method: "POST",
        body: JSON.stringify({ code: clean }),
      });
      const nextToken = res?.meta?.token || null;
      if (!nextToken) throw new Error("Ο κωδικός δεν έδωσε πρόσβαση");
      window.sessionStorage.setItem(TOKEN_KEY, nextToken);
      setToken(nextToken);
      setMe(res.data);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Η είσοδος απέτυχε");
    } finally {
      setBusy(false);
    }
  }, [code]);

  const logout = useCallback(() => {
    window.sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setMe(null);
    setSchedule(null);
    setTable(null);
    setMatches([]);
  }, []);

  /* --- επαναφορά συνεδρίας --- */
  useEffect(() => {
    const stored = window.sessionStorage.getItem(TOKEN_KEY);
    if (!stored) return;
    setToken(stored);
    api<{ data: Me }>("/api/desk/me", stored)
      .then((res) => setMe(res.data))
      .catch(() => {
        window.sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
      });
  }, []);

  /* --- πρόγραμμα --- */
  useEffect(() => {
    if (!token) return;
    api<{ data: Schedule }>("/api/desk/schedule", token)
      .then((res) => {
        setSchedule(res.data);
        const firstEvent = res.data?.events?.[0];
        if (firstEvent) {
          setEventId(firstEvent.documentId);
          setStageId(firstEvent.stages?.[0]?.documentId || "");
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Το πρόγραμμα δεν φορτώθηκε"));
  }, [token]);

  /* --- αγώνες του stage --- */
  useEffect(() => {
    if (!stageId) {
      setMatches([]);
      return;
    }
    if (!token) return;
    api<{ data: Match[] }>(`/api/desk/matches?stageId=${encodeURIComponent(stageId)}`, token)
      .then((res) => setMatches(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setMatches([]));
  }, [stageId, token]);

  const currentEvent = useMemo(
    () => schedule?.events?.find((ev) => ev.documentId === eventId) || null,
    [schedule, eventId],
  );

  /* --- άνοιγμα τραπεζιού --- */
  const openTable = useCallback(
    async (match: Match) => {
      if (!token || !stageId) return;
      setBusy(true);
      setError(null);
      try {
        const opened = await api<{
          data: { sessionId: string; screenIdentifier: string; mode: "direct" | "screen" };
        }>("/api/desk/tables/open", token, {
          method: "POST",
          body: JSON.stringify({
            eventStageId: stageId,
            brMatchId: match.documentId,
            brMatchDocumentId: match.documentId,
            tableNumber: tableNo,
            players: [
              { name: playerName(match, 1) },
              { name: playerName(match, 2) },
            ],
            eventTitle: currentEvent?.title || null,
            stageTitle: currentEvent?.stages?.find((s) => s.documentId === stageId)?.title || null,
            matchNumber: match.matchNumber ?? null,
          }),
        });

        const sessionId = opened.data.sessionId;
        await api(`/api/desk/tables/${encodeURIComponent(sessionId)}/claim`, token, {
          method: "POST",
          body: JSON.stringify({}),
        });

        setTable({
          sessionId,
          screenIdentifier: opened.data.screenIdentifier,
          mode: opened.data.mode,
          matchLabel: matchLabel(match),
          names: [playerName(match, 1), playerName(match, 2)],
          p1: { points: 0, innings: 0, highRun: 0 },
          p2: { points: 0, innings: 0, highRun: 0 },
          active: 0,
          buffer: "",
          finished: false,
          saving: false,
          error: null,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Το τραπέζι δεν άνοιξε");
      } finally {
        setBusy(false);
      }
    },
    [token, stageId, tableNo, currentEvent],
  );

  /* --- αποστολή σκορ --- */
  const pushScore = useCallback(
    (next: TableState, finish = false) => {
      if (!token) return;
      setTable({ ...next, saving: true });
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          await api(`/api/desk/tables/${encodeURIComponent(next.sessionId)}/score`, token, {
            method: "POST",
            body: JSON.stringify({
              players: [
                { points: next.p1.points, innings: next.p1.innings, highRun: next.p1.highRun },
                { points: next.p2.points, innings: next.p2.innings, highRun: next.p2.highRun },
              ],
              finish,
            }),
          });
          setTable((prev) => (prev ? { ...prev, saving: false, error: null } : prev));
        } catch (err) {
          setTable((prev) =>
            prev
              ? { ...prev, saving: false, error: err instanceof Error ? err.message : "Το σκορ δεν στάλθηκε" }
              : prev,
          );
        }
      }, 250);
    },
    [token],
  );

  const addPoint = useCallback(() => {
    if (!table || table.finished) return;
    const key = table.active === 0 ? "p1" : "p2";
    const side = table[key];
    const next: TableState = {
      ...table,
      [key]: { ...side, points: side.points + 1, highRun: Math.max(side.highRun, 1) },
    };
    pushScore(next);
  }, [table, pushScore]);

  const pressDigit = useCallback(
    (digit: string) => {
      if (!table || table.finished) return;
      setTable({ ...table, buffer: (table.buffer + digit).slice(0, 3) });
    },
    [table],
  );

  const enterInning = useCallback(() => {
    if (!table || table.finished) return;
    const value = Number(table.buffer || 0);
    const key = table.active === 0 ? "p1" : "p2";
    const side = table[key];
    const next: TableState = {
      ...table,
      [key]: {
        points: side.points + value,
        innings: side.innings + 1,
        highRun: Math.max(side.highRun, value),
      },
      active: table.active === 0 ? 1 : 0,
      buffer: "",
    };
    pushScore(next);
  }, [table, pushScore]);

  const endInning = useCallback(() => {
    if (!table || table.finished) return;
    const key = table.active === 0 ? "p1" : "p2";
    const side = table[key];
    const next: TableState = {
      ...table,
      [key]: { ...side, innings: side.innings + 1 },
      active: table.active === 0 ? 1 : 0,
      buffer: "",
    };
    pushScore(next);
  }, [table, pushScore]);

  const endGame = useCallback(() => {
    if (!table || table.finished) return;
    const next: TableState = { ...table, finished: true, buffer: "" };
    pushScore(next, true);
  }, [table, pushScore]);

  const closeTable = useCallback(async () => {
    if (!table || !token) return;
    try {
      await api(`/api/desk/tables/${encodeURIComponent(table.sessionId)}/release`, token, {
        method: "POST",
        body: JSON.stringify({}),
      });
    } catch {
      /* το τραπέζι ελευθερώνεται ούτως ή άλλως μετά το end game */
    }
    setTable(null);
  }, [table, token]);

  /* ------------------------------------------------------------------ */
  /* Οθόνη                                                              */
  /* ------------------------------------------------------------------ */

  if (!token) {
    return (
      <main className="min-h-[100dvh] bg-[#0b0f14] px-4 py-10 text-slate-100">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-lg font-semibold tracking-wide">Event Desk</h1>
          <p className="mt-1 text-xs text-slate-400">
            Γράψε τον 6ψήφιο κωδικό που σου έδωσε ο σύλλογος.
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
            onKeyDown={(e) => {
              if (e.key === "Enter") void login();
            }}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="one-time-code"
            placeholder="ΚΩΔΙΚΟΣ"
            className="mt-6 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-4 text-center text-2xl font-mono tracking-[0.35em] text-slate-100 outline-none focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={() => void login()}
            disabled={busy}
            className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Έλεγχος…" : "Είσοδος"}
          </button>
          {error ? <p className="mt-3 text-xs text-rose-400">{error}</p> : null}
        </div>
      </main>
    );
  }

  if (table) {
    const activeSide = table.active === 0 ? table.p1 : table.p2;
    return (
      <main className="min-h-[100dvh] bg-[#0b0f14] px-3 pb-4 pt-3 text-slate-100">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
            <span>
              {table.matchLabel} · Τραπέζι {tableNo}
            </span>
            <span className={table.mode === "screen" ? "text-sky-400" : "text-emerald-400"}>
              {table.mode === "screen" ? `screen ${table.screenIdentifier}` : "direct"}
            </span>
          </div>

          <div className="mt-2 space-y-2">
            {([0, 1] as const).map((idx) => {
              const side = idx === 0 ? table.p1 : table.p2;
              const name = table.names[idx] || (idx === 0 ? "Παίκτης 1" : "Παίκτης 2");
              const isActive = table.active === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTable({ ...table, active: idx })}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left ${
                    isActive ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 bg-slate-900"
                  }`}
                >
                  <span className="text-sm font-medium">{name}</span>
                  <span className="flex items-baseline gap-3 font-mono">
                    <span className="text-2xl font-bold">{side.points}</span>
                    <span className="text-[11px] text-slate-400">
                      Inn {side.innings} · HR {side.highRun}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">
              {mode === "total" ? "Πόντοι στην παρτίδα" : "Τρέχον σερί"}
            </span>
            <span className="font-mono text-xl font-bold text-emerald-400">
              {mode === "total" ? table.buffer || "–" : activeSide.highRun}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => pressDigit(d)}
                className="rounded-xl border border-slate-700 bg-slate-900 py-4 font-mono text-xl font-semibold active:bg-slate-800"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setTable({ ...table, buffer: table.buffer.slice(0, -1) })}
              className="rounded-xl border border-slate-700 bg-slate-900 py-4 text-sm active:bg-slate-800"
            >
              ⌫
            </button>
            <button
              type="button"
              onClick={addPoint}
              className="rounded-xl border border-emerald-600 bg-emerald-600/20 py-4 text-sm font-semibold text-emerald-300 active:bg-emerald-600/30"
            >
              +1
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={enterInning}
              className="rounded-xl bg-emerald-600 py-4 text-sm font-semibold text-white active:bg-emerald-700"
            >
              Enter inning
            </button>
            <button
              type="button"
              onClick={endInning}
              className="rounded-xl border border-slate-600 bg-slate-800 py-4 text-sm font-semibold active:bg-slate-700"
            >
              End inning (0)
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode(mode === "total" ? "point" : "total")}
              className="rounded-xl border border-slate-700 bg-slate-900 py-3 text-[11px] uppercase tracking-wider text-slate-300"
            >
              {mode === "total" ? "Inning total" : "Point by point"}
            </button>
            <button
              type="button"
              onClick={endGame}
              disabled={table.finished}
              className="rounded-xl bg-rose-600 py-3 text-[11px] font-semibold uppercase tracking-wider text-white disabled:opacity-50"
            >
              {table.finished ? "Έληξε" : "End game"}
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>{table.saving ? "Αποστολή…" : table.error ? table.error : "Συγχρονισμένο"}</span>
            <button type="button" onClick={() => void closeTable()} className="underline">
              {table.finished ? "Κλείσιμο τραπεζιού" : "Άφησε το τραπέζι"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#0b0f14] px-4 py-6 text-slate-100">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-base font-semibold">{schedule?.tournament?.title || "Event Desk"}</h1>
            <p className="text-[11px] text-slate-400">
              {me?.assignment?.displayName || "Χειριστής"}
              {me?.assignment?.scope ? ` · ${me.assignment.scope}` : ""}
            </p>
          </div>
          <button type="button" onClick={logout} className="text-[11px] text-slate-400 underline">
            Έξοδος
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="text-[11px] uppercase tracking-wider text-slate-400">
            Διοργάνωση
            <select
              value={eventId}
              onChange={(e) => {
                const next = e.target.value;
                setEventId(next);
                const ev = schedule?.events?.find((row) => row.documentId === next);
                setStageId(ev?.stages?.[0]?.documentId || "");
              }}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              {(schedule?.events || []).map((ev) => (
                <option key={ev.documentId} value={ev.documentId}>
                  {ev.title || ev.documentId}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] uppercase tracking-wider text-slate-400">
            Φάση
            <select
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              {(currentEvent?.stages || []).map((st) => (
                <option key={st.documentId} value={st.documentId}>
                  {st.title || st.documentId}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-wider text-slate-400">
            Τραπέζι
            <input
              type="number"
              min={1}
              value={tableNo}
              onChange={(e) => setTableNo(Math.max(1, Number(e.target.value) || 1))}
              className="ml-2 w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-center text-sm text-slate-100"
            />
          </label>
        </div>

        {error ? <p className="mt-3 text-xs text-rose-400">{error}</p> : null}

        <div className="mt-4 space-y-2">
          {matches.length === 0 ? (
            <p className="text-xs text-slate-500">Δεν υπάρχουν αγώνες σε αυτή τη φάση.</p>
          ) : (
            matches.map((match) => (
              <div
                key={match.documentId}
                className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-3 py-3"
              >
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    {matchLabel(match)}
                  </p>
                  <p className="text-sm">
                    {playerName(match, 1)} <span className="text-slate-500">vs</span>{" "}
                    {playerName(match, 2)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void openTable(match)}
                  disabled={busy}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Άνοιγμα
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
