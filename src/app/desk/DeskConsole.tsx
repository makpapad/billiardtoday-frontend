"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DeskLivePublisher, type DeskLiveState } from "@/lib/deskLive";
import "./desk-console.css";

/* ------------------------------------------------------------------ */
/* Τύποι                                                              */
/* ------------------------------------------------------------------ */

export type Stage = { documentId: string; title?: string | null; stageType?: string | null };
export type DeskEvent = { documentId: string; title?: string | null; stages: Stage[] };
export type Schedule = {
  tournament: { documentId: string; title?: string | null; startDate?: string | null; endDate?: string | null };
  events: DeskEvent[];
};
export type Match = {
  documentId: string;
  matchNumber?: number | null;
  groupNumber?: number | null;
  groupLabel?: string | null;
  player1?: string | null;
  player2?: string | null;
  done?: boolean;
};

type Side = { points: number; run: number; hr: number; hr2: number; innings: number };
type InningEntry = { inning: number; player1?: { pt: number; tot: number }; player2?: { pt: number; tot: number } };

type TableState = {
  no: number;
  match: Match | null;
  sessionId: string | null;
  screenId: string | null;
  mode: "direct" | "screen";
  online: boolean;
  paused: boolean;
  finished: boolean;
  saving: boolean;
  active: 0 | 1;
  buffer: string;
  p1: Side;
  p2: Side;
  /** Το Live γράφει μόνο όταν ανάψει το κουμπί — μέχρι τότε δεν στέλνεται τίποτα. */
  liveOn: boolean;
  openedAt: number | null;
  history: Array<{ p1: Side; p2: Side; active: 0 | 1 }>;
  /** Φύλλο αγώνα: το σερί κάθε παίκτη ανά στεκιά (όπως στο χάρτινο φύλλο). */
  detail: InningEntry[];
};

const MAX_TABLES = 8;

function emptyTable(no: number): TableState {
  return {
    no,
    match: null,
    sessionId: null,
    screenId: null,
    mode: "direct",
    online: false,
    paused: false,
    finished: false,
    saving: false,
    active: 0,
    buffer: "",
    p1: { points: 0, run: 0, hr: 0, hr2: 0, innings: 0 },
    p2: { points: 0, run: 0, hr: 0, hr2: 0, innings: 0 },
    liveOn: false,
    openedAt: null,
    history: [],
    detail: [],
  };
}

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
    const raw = json?.error?.message ?? json?.error ?? json?.message ?? "Το αίτημα απέτυχε";
    throw new Error(typeof raw === "string" ? raw : "Το αίτημα απέτυχε");
  }
  return json as T;
}

function matchTitle(match: Match, seq?: number): string {
  const group = match.groupNumber ? `Group ${match.groupNumber} · ` : "";
  const no = match.matchNumber ?? seq ?? null;
  return no ? `${group}Match ${no}` : group.replace(/ · $/, "");
}

/* ------------------------------------------------------------------ */
/* Κονσόλα                                                            */
/* ------------------------------------------------------------------ */

export default function DeskConsole({
  token,
  schedule,
  operatorName,
  onLogout,
}: {
  token: string;
  schedule: Schedule;
  operatorName: string;
  onLogout: () => void;
}) {
  const [tables, setTables] = useState<TableState[]>([1, 2, 3, 4].map(emptyTable));
  const [selected, setSelected] = useState(1);
  const [entryMode, setEntryMode] = useState<"total" | "point">("total");
  const [log, setLog] = useState<Array<{ text: string; at: string }>>([]);
  const [eventId, setEventId] = useState<string>(schedule.events?.[0]?.documentId || "");
  const [stageId, setStageId] = useState<string>(schedule.events?.[0]?.stages?.[0]?.documentId || "");
  const [matches, setMatches] = useState<Match[]>([]);
  const [pickForTable, setPickForTable] = useState<number | null>(null);
  const [tourneyOpen, setTourneyOpen] = useState(false);
  const [publicOpen, setPublicOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const live = useRef<DeskLivePublisher | null>(null);

  useEffect(() => {
    if (!live.current) live.current = new DeskLivePublisher();
    return () => live.current?.close();
  }, []);

  /** Το Live δεν παίρνει σκορ από το Strapi — θέλει το ίδιο μήνυμα με τη φυσική οθόνη. */
  const publishLive = useCallback((table: TableState, liveRuns?: [number, number]) => {
    if (!table.sessionId || !table.screenId || !table.match) return;
    if (!table.liveOn) return;
    const state: DeskLiveState = {
      screenId: table.screenId,
      sessionId: table.sessionId,
      clubId: null,
      names: [table.match.player1 || "Player A", table.match.player2 || "Player B"],
      points: [table.p1.points, table.p2.points],
      innings: [table.p1.innings, table.p2.innings],
      highRuns: [table.p1.hr, table.p2.hr],
      runs: [table.p1.run, table.p2.run],
      liveRuns,
      inningsDetail: table.detail,
      active: table.active,
    };
    live.current?.send(state);
  }, []);

  const event = useMemo(
    () => schedule.events?.find((ev) => ev.documentId === eventId) || null,
    [schedule, eventId],
  );
  const stage = useMemo(
    () => event?.stages?.find((st) => st.documentId === stageId) || null,
    [event, stageId],
  );
  const current = tables.find((t) => t.no === selected) || tables[0];

  const pushLog = useCallback((text: string) => {
    const at = new Date().toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" });
    setLog((prev) => [{ text, at }, ...prev].slice(0, 40));
  }, []);

  /* αγώνες της φάσης */
  useEffect(() => {
    if (!stageId) {
      setMatches([]);
      return;
    }
    api<{ data: Match[] }>(`/api/desk/matches?stageId=${encodeURIComponent(stageId)}`, token)
      .then((res) => setMatches(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setMatches([]));
  }, [stageId, token]);

  /* σκορ: αποστολή με debounce ανά τραπέζι */
  const pushScore = useCallback(
    (next: TableState, finish = false) => {
      setTables((prev) => prev.map((t) => (t.no === next.no ? next : t)));
      if (!next.sessionId) return;
      publishLive(next);
      const marked: TableState = { ...next, saving: true };
      setTables((prev) => prev.map((t) => (t.no === next.no ? marked : t)));
      const timer = saveTimers.current[next.no];
      if (timer) clearTimeout(timer);
      saveTimers.current[next.no] = setTimeout(async () => {
        try {
          await api(`/api/desk/tables/${encodeURIComponent(next.sessionId as string)}/score`, token, {
            method: "POST",
            body: JSON.stringify({
              players: [
                { points: next.p1.points, innings: next.p1.innings, highRun: next.p1.hr, run: next.p1.run, liveRun: 0 },
                { points: next.p2.points, innings: next.p2.innings, highRun: next.p2.hr, run: next.p2.run, liveRun: 0 },
              ],
              inningsDetail: next.detail,
              finish,
            }),
          });
          setTables((prev) => prev.map((t) => (t.no === next.no ? { ...t, saving: false } : t)));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Το σκορ δεν στάλθηκε";
          setError(message);
          setTables((prev) => prev.map((t) => (t.no === next.no ? { ...t, saving: false } : t)));
        }
      }, 250);
    },
    [token, publishLive],
  );

  /** Ό,τι γράφεται στο πληκτρολόγιο φαίνεται ζωντανά στο Live (liveRun), όπως στη φυσική οθόνη. */
  const updateBuffer = useCallback(
    (mutate: (value: string) => string) => {
      setTables((prev) =>
        prev.map((t) => {
          if (t.no !== selected) return t;
          const next: TableState = { ...t, buffer: mutate(t.buffer).slice(0, 3) };
          const liveRuns: [number, number] = [0, 0];
          liveRuns[next.active === 0 ? 0 : 1] = Number(next.buffer || 0);
          publishLive(next, liveRuns);
          return next;
        }),
      );
    },
    [selected, publishLive],
  );

  const withHistory = (table: TableState): TableState => ({
    ...table,
    history: [
      { p1: { ...table.p1 }, p2: { ...table.p2 }, active: table.active },
      ...table.history,
    ].slice(0, 20),
  });

  /* --- άνοιγμα αγώνα σε τραπέζι --- */
  const openMatch = useCallback(
    async (tableNo: number, match: Match, seq?: number) => {
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
            players: [{ name: match.player1 }, { name: match.player2 }],
            eventTitle: event?.title || null,
            stageTitle: stage?.title || null,
            matchNumber: match.matchNumber ?? seq ?? null,
          }),
        });
        const sessionId = opened.data.sessionId;
        await api(`/api/desk/tables/${encodeURIComponent(sessionId)}/claim`, token, {
          method: "POST",
          body: JSON.stringify({}),
        });
        setTables((prev) =>
          prev.map((t) =>
            t.no === tableNo
              ? {
                  ...emptyTable(tableNo),
                  match,
                  p1: { points: 0, run: 0, hr: 0, hr2: 0, innings: 1 },
                  sessionId,
                  screenId: opened.data.screenIdentifier,
                  mode: opened.data.mode,
                  online: true,
                  openedAt: Date.now(),
                }
              : t,
          ),
        );
        setSelected(tableNo);
        setPickForTable(null);
        publishLive({
          ...emptyTable(tableNo),
          match,
          sessionId,
          screenId: opened.data.screenIdentifier,
        });
        pushLog(`T${tableNo} · ${match.player1} vs ${match.player2} — άνοιξε`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Το τραπέζι δεν άνοιξε");
      }
    },
    [token, stageId, event, stage, pushLog, publishLive],
  );

  /* --- ενέργειες σκορ (ροή όπως το χάρτινο φύλλο) ---
     - ο 1ος παίκτης ξεκινά με στεκιά 1, ο 2ος με 0· όταν αλλάζει η σειρά, ο επόμενος παίρνει στεκιά
     - οι πόντοι γράφονται στο ΣΕΡΙ (run), όχι στο σκορ
     - με ENTER το σερί περνά στους πόντους και αλλάζει η σειρά                                  */
  const pendingRun = useCallback((table: TableState): number => {
    const typed = Math.max(0, Math.trunc(Number(table.buffer) || 0));
    if (table.buffer !== "") return typed;
    const side = table.active === 0 ? table.p1 : table.p2;
    return side.run;
  }, []);

  const closeTurn = useCallback((table: TableState, runValue: number): TableState => {
    const idx = table.active;
    const key = idx === 0 ? "p1" : "p2";
    const otherKey = idx === 0 ? "p2" : "p1";
    const side = table[key];
    const other = table[otherKey];
    const prevHr = side.hr ?? 0;
    const prevHr2 = side.hr2 ?? 0;
    const nextHr = runValue >= prevHr ? runValue : prevHr;
    const nextHr2 = runValue >= prevHr ? prevHr : runValue > prevHr2 ? runValue : prevHr2;
    const sideKey = idx === 0 ? "player1" : "player2";
    const inningNo = Math.max(1, side.innings);
    const previous = table.detail.find((row) => row.inning === inningNo) ?? { inning: inningNo };
    const entry = { ...previous, [sideKey]: { pt: runValue, tot: side.points + runValue } };
    const detail = [...table.detail.filter((row) => row.inning !== inningNo), entry].sort(
      (a, b) => a.inning - b.inning,
    );
    return {
      ...table,
      detail,
      [key]: { ...side, points: side.points + runValue, run: 0, hr: nextHr, hr2: nextHr2 },
      /* ο επόμενος ξεκινά τη δική του στεκιά */
      [otherKey]: { ...other, innings: Math.max(1, other.innings + 1) },
      active: idx === 0 ? 1 : 0,
      buffer: "",
    };
  }, []);

  const commitTurn = useCallback(() => {
    if (!current?.sessionId || current.finished) return;
    const run = pendingRun(current);
    const next = withHistory(closeTurn(current, run));
    pushLog(`T${current.no} · ${run} πόντοι στο σκορ — αλλαγή σειράς`);
    pushScore(next);
  }, [current, pendingRun, withHistory, closeTurn, pushScore, pushLog]);

  const addPoint = useCallback(() => {
    if (!current?.sessionId || current.finished) return;
    const key = current.active === 0 ? "p1" : "p2";
    const side = current[key];
    const typed = Math.max(0, Math.trunc(Number(current.buffer) || 0));
    const next = withHistory({
      ...current,
      [key]: { ...side, run: (current.buffer !== "" ? typed : side.run) + 1 },
      buffer: "",
    });
    pushLog(`T${current.no} · +1 στο σερί`);
    pushScore(next);
  }, [current, pushScore, pushLog, withHistory]);

  const undo = useCallback(() => {
    if (!current?.sessionId || current.history.length === 0) return;
    const [last, ...rest] = current.history;
    const next: TableState = {
      ...current,
      p1: last.p1,
      p2: last.p2,
      active: last.active,
      buffer: "",
      history: rest,
    };
    pushLog(`T${current.no} · undo`);
    pushScore(next);
  }, [current, pushScore, pushLog]);

  const togglePause = useCallback(() => {
    if (!current) return;
    setTables((prev) => prev.map((t) => (t.no === current.no ? { ...t, paused: !t.paused } : t)));
    pushLog(`T${current.no} · ${current.paused ? "συνέχεια" : "παύση"}`);
  }, [current, pushLog]);

  const endGame = useCallback(() => {
    if (!current?.sessionId || current.finished) return;
    const next: TableState = { ...current, finished: true, buffer: "", saving: true };
    pushLog(`T${current.no} · τέλος αγώνα`);
    pushScore(next, true);
  }, [current, pushScore, pushLog]);

  const closeTable = useCallback(
    async (no: number) => {
      const table = tables.find((t) => t.no === no);
      if (!table?.sessionId) {
        setTables((prev) => prev.map((t) => (t.no === no ? emptyTable(no) : t)));
        return;
      }
      try {
        await api(`/api/desk/tables/${encodeURIComponent(table.sessionId)}/release`, token, {
          method: "POST",
          body: JSON.stringify({}),
        });
      } catch {
        /* το τραπέζι ελευθερώνεται ούτως ή άλλως μετά το end game */
      }
      setTables((prev) => prev.map((t) => (t.no === no ? emptyTable(no) : t)));
    },
    [tables, token],
  );

  /* πληκτρολόγιο: 0-9, Enter, Space, U */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current?.sessionId) return;
      if (/^[0-9]$/.test(e.key)) {
        updateBuffer((value) => value + e.key);
        return;
      }
      if (e.key === "Enter") {
        if (entryMode === "point") addPoint();
        else commitTurn();
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        commitTurn();
        return;
      }
      if (e.key.toLowerCase() === "u") undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, entryMode, addPoint, commitTurn, undo]);

  const addTable = () => {
    if (tables.length >= MAX_TABLES) return;
    const nextNo = Math.max(...tables.map((t) => t.no)) + 1;
    setTables((prev) => [...prev, emptyTable(nextNo)]);
    setSelected(nextNo);
  };

  const gridClass = `grid gridlen-${Math.min(tables.length, 8)}`;
  const activeName = current?.active === 0 ? current?.match?.player1 : current?.match?.player2;

  useEffect(() => {
    setTourneyOpen(false);
  }, [eventId, stageId]);

  return (
    <div className={`bt-desk${entryMode === "point" ? " mode-point" : ""}`}>
      <header className="topbar">
        <div className="brand">
          <span className="ball" /> BILLIARD TODAY
        </div>
        <div className="event">
          <b>{schedule.tournament?.title || "Event Desk"}</b>
          <span>
            {event?.title || ""}
            {stage?.title ? ` · ${stage.title}` : ""} · {operatorName}
          </span>
        </div>
        <div className="grow" />
        <button type="button" className="ghost" onClick={() => setTourneyOpen(true)}>
          Change tournament
        </button>
        <div className="pill">
          <span className={error ? "dot off" : "dot"} /> <span>{error ? "Σφάλμα" : "Συγχρονισμένο"}</span>
        </div>
        <div className="pill">
          <span>{tables.length}</span> tables
        </div>
        <button type="button" className="ghost" onClick={addTable} disabled={tables.length >= MAX_TABLES}>
          + Table
        </button>
        <button type="button" className="ghost" onClick={onLogout}>
          Έξοδος
        </button>
        <button type="button" className="primary" onClick={() => setPublicOpen(true)}>
          Public view
        </button>
      </header>

      <div className="body">
        <main className="tables">
          <div className={gridClass}>
            {tables.map((table) => {
              const isSel = table.no === selected;
              if (!table.match) {
                return (
                  <article
                    key={table.no}
                    className={`card emptycard${isSel ? " sel" : ""}`}
                    onClick={() => setSelected(table.no)}
                  >
                    <div className="chead">
                      <div className="chead-main">
                        <span className="tno">TABLE {table.no}</span>
                        <span className="chip done">EMPTY</span>
                      </div>
                      <div className="chead-sub">
                        <span className="sid">DIRECT · no screen</span>
                        <span className="lbl2" style={{ marginLeft: "auto" }}>
                          source
                        </span>
                      </div>
                    </div>
                    <div className="emptybody">
                      <span>Κανένας αγώνας σε αυτό το τραπέζι</span>
                      <button
                        type="button"
                        className="pickbtn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(table.no);
                          setPickForTable(table.no);
                        }}
                      >
                        Open match on table {table.no}
                      </button>
                    </div>
                  </article>
                );
              }
              const chip = table.finished ? "done" : table.paused ? "pause" : "live";
              const chipText = table.finished ? "DONE" : table.paused ? "PAUSED" : "LIVE";
              const hasScreens = false;
              return (
                <article
                  key={table.no}
                  className={`card${isSel ? " sel" : ""}`}
                  onClick={() => setSelected(table.no)}
                >
                  <div className="chead">
                    <div className="chead-main">
                      <span className="tno">TABLE {table.no}</span>
                      <span className="cmeta">{matchTitle(table.match)}</span>
                      <span className={`chip ${chip}`}>{chipText}</span>
                    </div>
                    <div className="chead-sub">
                      <span className="sid">
                        <span className={`dotg${table.online ? "" : " off"}`} />
                        {table.screenId || "no screen"}
                      </span>
                      <span className="lbl2" style={{ marginLeft: "auto" }}>
                        source
                      </span>
                      <div className="seg locked">
                        <button type="button" disabled className={table.mode === "screen" ? "on" : ""}>
                          Screen
                        </button>
                        <button
                          type="button"
                          disabled
                          className={table.mode === "direct" ? "on direct" : ""}
                        >
                          Direct
                        </button>
                      </div>
                    </div>
                    <div className="modehint">
                      {hasScreens
                        ? "locked — the screen owns the points; the desk only sends commands"
                        : "direct — the desk writes the live score"}
                    </div>
                  </div>

                  {([0, 1] as const).map((idx) => {
                    const side = idx === 0 ? table.p1 : table.p2;
                    const name = (idx === 0 ? table.match?.player1 : table.match?.player2) || `Player ${idx + 1}`;
                    return (
                      <div key={idx} className={`prow${table.active === idx && !table.finished ? " act" : ""}`}>
                        <span className="bar" />
                        <div className="pinfo">
                          <div className="pname">{name}</div>
                          <div className="pstats">
                            <div className="st">
                              <b>{side.innings}</b>
                              <span>INN</span>
                            </div>
                            <div className="st">
                              <b>{side.hr}</b>
                              <span>HR</span>
                            </div>
                          </div>
                        </div>
                        <div className="sc">
                          <span className="pts">{side.points}</span>
                          <span className="run">{side.run}</span>
                        </div>
                      </div>
                    );
                  })}

                  <div className="cfoot">
                    <span className="timer">
                      {table.openedAt
                        ? `${String(Math.floor((Date.now() - table.openedAt) / 60000)).padStart(2, "0")}′`
                        : "—"}
                    </span>
                    <button
                      type="button"
                      className={`livebtn${table.liveOn ? " on" : ""}`}
                      title={table.liveOn ? "Το Live δείχνει τον αγώνα" : "Άναψε το Live για να φαίνεται ο αγώνας"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(table.no);
                        const next: TableState = { ...table, liveOn: !table.liveOn };
                        setTables((prev) => prev.map((t) => (t.no === table.no ? next : t)));
                        if (next.liveOn) {
                          publishLive(next);
                          pushLog(`T${table.no} · Live on`);
                        } else {
                          pushLog(`T${table.no} · Live off`);
                        }
                      }}
                    >
                      {table.liveOn ? "LIVE ●" : "LIVE"}
                    </button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setSelected(table.no); }}>
                      Χειριστήριο
                    </button>
                    <button type="button" className="save" onClick={(e) => { e.stopPropagation(); setSelected(table.no); endGame(); }}>
                      {table.finished ? "Κλειστό" : "End game"}
                    </button>
                  </div>

                  {table.finished ? (
                    <div className="winner">
                      <b>
                        Νικητής:{" "}
                        {table.p1.points === table.p2.points
                          ? "ισοπαλία"
                          : table.p1.points > table.p2.points
                            ? table.match?.player1
                            : table.match?.player2}
                      </b>
                      <span>
                        {table.p1.points} – {table.p2.points}
                      </span>
                      <button
                        type="button"
                        className="pickbtn"
                        onClick={(e) => {
                          e.stopPropagation();
                          void closeTable(table.no);
                        }}
                      >
                        Free table
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </main>

        <aside className="desk">
          <div className="desk-head">
            <div className="k">QUICK ENTRY</div>
            <div className="t">Table {current?.no}</div>
            <div className="p">{activeName || "—"}</div>
            <div className="src">{current?.match ? `${matchTitle(current.match)} · ${current.screenId || ""}` : "—"}</div>
          </div>
          <div className="modes">
            <button
              type="button"
              className={entryMode === "total" ? "on" : ""}
              onClick={() => setEntryMode("total")}
            >
              Inning total
            </button>
            <button
              type="button"
              className={entryMode === "point" ? "on" : ""}
              onClick={() => setEntryMode("point")}
            >
              Point by point
            </button>
          </div>
          <div className="display">
            <div className="lbl">
              {entryMode === "point" ? (
                <>
                  CURRENT
                  <br />
                  RUN
                </>
              ) : (
                <>
                  POINTS
                  <br />
                  IN INNING
                </>
              )}
            </div>
            <div className={`val${current && pendingRun(current) > 0 ? "" : " empty"}`}>
              {current ? pendingRun(current) || "–" : "–"}
            </div>
          </div>
          <div className="pointpad">
            <button type="button" id="plus1" onClick={addPoint}>
              +1 POINT
            </button>
            <button type="button" id="endInn" onClick={() => commitTurn()}>
              END INNING ⏎
            </button>
          </div>
          <div className="keys">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => updateBuffer((value) => value + k)}
              >
                {k}
              </button>
            ))}
            <button
              type="button"
              className="del"
              onClick={() => updateBuffer((value) => value.slice(0, -1))}
            >
              ⌫
            </button>
            <button
              type="button"
              onClick={() => updateBuffer((value) => value + "0")}
            >
              0
            </button>
            <button type="button" className="enter" onClick={() => commitTurn()}>
              ENTER ⏎
            </button>
          </div>
          <div className="quick">
            <button type="button" id="qVoid" onClick={() => commitTurn()}>
              Inning without points (Space)
            </button>
            <button type="button" id="qUndo" onClick={undo}>
              Undo (U)
            </button>
            <button type="button" id="qPause" onClick={togglePause}>
              {current?.paused ? "Resume table" : "Pause table"}
            </button>
          </div>
          <div className="log">
            <h4>LAST ENTRIES</h4>
            <div>
              {log.length === 0 ? (
                <div>
                  No entries yet <em>—</em>
                </div>
              ) : (
                log.map((row, i) => (
                  <div key={`${row.at}-${i}`}>
                    {row.text}
                    <em>{row.at}</em>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="hint">
            type the run + <span className="kbd">⏎</span> to enter · <span className="kbd">U</span> undo ·{" "}
            <span className="kbd">Space</span> inning without points
          </div>
        </aside>
      </div>

      {/* επιλογή αγώνα */}
      <div className={`picker${pickForTable ? " on" : ""}`}>
        <div className="picker-box">
          <div className="picker-head">
            <div>
              <b>Open match on table {pickForTable}</b>
              <div className="sub">
                {event?.title} · {stage?.title}
              </div>
            </div>
            <div style={{ flex: 1 }} />
            <button type="button" className="ghost" onClick={() => setPickForTable(null)}>
              Close
            </button>
          </div>
          <div className="picker-list">
            {(() => {
              const counters = new Map<number, number>();
              return matches.map((match) => {
                const key = Number(match.groupNumber ?? 0);
                const seq = (counters.get(key) ?? 0) + 1;
                counters.set(key, seq);
                return (
                  <div
                    key={match.documentId}
                    className="mrow"
                    onClick={() => pickForTable && void openMatch(pickForTable, match, seq)}
                  >
                    <div className="g">{match.groupNumber ? `GRP ${match.groupNumber}` : "—"}</div>
                    <div className="p">
                      {match.player1} <span style={{ color: "#8b98a9" }}>vs</span> {match.player2}
                      <small>{matchTitle(match, seq)}</small>
                    </div>
                    <button type="button" className="pickbtn">
                      Open
                    </button>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* επιλογή διοργάνωσης/φάσης */}
      <div className={`picker${tourneyOpen ? " on" : ""}`}>
        <div className="picker-box">
          <div className="picker-head">
            <div>
              <b>Choose tournament</b>
              <div className="sub">Οι αγώνες και τα τραπέζια φορτώνονται από τη διοργάνωση που θα διαλέξεις</div>
            </div>
            <div style={{ flex: 1 }} />
            <button type="button" className="ghost" onClick={() => setTourneyOpen(false)}>
              Close
            </button>
          </div>
          <div className="picker-list">
            {(schedule.events || []).map((ev) => (
              <div
                key={ev.documentId}
                className="mrow"
                onClick={() => {
                  setEventId(ev.documentId);
                  setStageId(ev.stages?.[0]?.documentId || "");
                }}
              >
                <div className="g">3-C</div>
                <div className="p">
                  {ev.title}
                  <small>{(ev.stages || []).map((st) => st.title).join(" · ")}</small>
                </div>
                <button type="button" className="pickbtn">
                  Open
                </button>
              </div>
            ))}
            <div style={{ padding: "12px 16px", fontSize: 12, color: "#8b98a9" }}>
              Φάσεις: <b>{stage?.title || "—"}</b>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "0 16px 16px" }}>
              {(event?.stages || []).map((st) => (
                <button
                  key={st.documentId}
                  type="button"
                  className={st.documentId === stageId ? "primary" : ""}
                  onClick={() => {
                    setStageId(st.documentId);
                    setTourneyOpen(false);
                  }}
                >
                  {st.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* δημόσια προβολή */}
      <div className={`overlay${publicOpen ? " on" : ""}`}>
        <div className="ov-top">
          <h2>Live scores</h2>
          <span>
            {event?.title} · {stage?.title}
          </span>
          <div style={{ flex: 1 }} />
          <button type="button" className="ghost" onClick={() => setPublicOpen(false)}>
            Close
          </button>
        </div>
        <div className="ov-grid">
          {tables
            .filter((t) => t.match)
            .map((t) => (
              <div key={t.no} className="ov-card">
                <div className="h">
                  TABLE {t.no} · {matchTitle(t.match as Match)}
                </div>
                <div className={`ov-row${t.active === 0 ? " act" : ""}`}>
                  <span className="n">{t.match?.player1}</span>
                  <span className="i">{t.p1.innings}</span>
                  <span className="s">{t.p1.points}</span>
                </div>
                <div className={`ov-row${t.active === 1 ? " act" : ""}`}>
                  <span className="n">{t.match?.player2}</span>
                  <span className="i">{t.p2.innings}</span>
                  <span className="s">{t.p2.points}</span>
                </div>
              </div>
            ))}
        </div>
        <div className="ov-foot">billiardtoday.com live view · updates automatically</div>
      </div>

      {error ? (
        <div style={{ position: "fixed", left: 12, bottom: 12, zIndex: 90, background: "#2b0f12", border: "1px solid #7f1d1d", color: "#fecaca", padding: "8px 12px", borderRadius: 8, fontSize: 12 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
