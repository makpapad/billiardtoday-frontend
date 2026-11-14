"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DeskLivePublisher, type DeskLiveState } from "@/lib/deskLive";
import {
  DeskMatchControls,
  DeskToolsToggle,
  emptyDeskTools,
  resetClockAfterPoint,
  tickTools,
  type DeskToolsValue,
} from "@/components/desk/DeskMatchControls";
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
/** Ανοιχτός αγώνας όπως τον επιστρέφει το desk API (για «Συνέχεια»). */
export type OpenTable = {
  sessionId: string;
  screenIdentifier?: string | null;
  tableNumber?: number | null;
  status?: string | null;
  isPublic?: boolean;
  brMatchId?: string | null;
  brMatchDocumentId?: string | null;
  matchNumber?: number | null;
  eventStageId?: string | null;
  eventTitle?: string | null;
  stageTitle?: string | null;
  targetPoints?: number | null;
  equalInnings?: boolean;
  players?: Array<{ name?: string | null; points?: number; innings?: number; hr?: number; run?: number }>;
  claim?: { assignmentId?: number | null; displayName?: string | null; deviceId?: string | null; at?: number | null } | null;
  /** Σειρά παικτών (Swap) και ποιος έχει τη σειρά, όπως τα άφησε το προηγούμενο desk. */
  view?: { order?: number[] | null; active?: number | null } | null;
  updatedAt?: string | null;
};

export type Match = {
  documentId: string;
  matchNumber?: number | null;
  groupNumber?: number | null;
  groupLabel?: string | null;
  player1?: string | null;
  player2?: string | null;
  done?: boolean;
  /** Σε ποιο τραπέζι παίζεται τώρα (null/undefined = ελεύθερος). */
  openOn?: string | null;
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
  /** Το τραπέζι το συνέχισε άλλη συσκευή: κλειδώνει μέχρι να το ξαναπάρουμε. */
  locked?: boolean;
  finished: boolean;
  saving: boolean;
  active: 0 | 1;
  buffer: string;
  p1: Side;
  p2: Side;
  /** Το Live γράφει μόνο όταν ανάψει το κουμπί — μέχρι τότε δεν στέλνεται τίποτα. */
  liveOn: boolean;
  /** Ποια πλευρά του ΑΓΩΝΑ είναι ο κάθε παίκτης (1/2). */
  sides: [1 | 2, 1 | 2];
  /** Σε πόσους πόντους παίζεται (από τη φάση) και αν μετράνε ίσες στεκιές. */
  targetPoints: number | null;
  equalInnings: boolean;
  openedAt: number | null;
  /** Κάθε βήμα κρατά ΟΛΗ την κατάσταση (και στεκιές/ρολόι), ώστε το Undo να γυρνά πίσω σωστά. */
  history: Array<{ p1: Side; p2: Side; active: 0 | 1; detail?: InningEntry[]; tools?: DeskToolsValue }>;
  /** Φύλλο αγώνα: το σερί κάθε παίκτη ανά στεκιά (όπως στο χάρτινο φύλλο). */
  detail: InningEntry[];
  /** Ρολόι βολών + timeouts: ό,τι δείχνει εδώ πάει ζωντανά στο Live. */
  tools: DeskToolsValue;
};

/** Ίσες στεκιές στο τέλος: η τελευταία αλλαγή σειράς χρεώνει στεκιά σε όποιον
 *  ΔΕΝ θα ξαναπαίξει. Όταν ο αγώνας κλείνει, κανείς δεν παίζει άλλη στεκιά,
 *  άρα και οι δύο μένουν με όσες συμπληρώθηκαν (π.χ. 33/33, όχι 34/33). */
function equalizeInnings<T extends { p1: { innings: number }; p2: { innings: number } }>(table: T): T {
  const a = table.p1.innings;
  const b = table.p2.innings;
  if (Math.abs(a - b) !== 1) return table;
  const value = Math.min(a, b);
  return { ...table, p1: { ...table.p1, innings: value }, p2: { ...table.p2, innings: value } };
}

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
    locked: false,
    finished: false,
    saving: false,
    active: 0,
    buffer: "",
    p1: { points: 0, run: 0, hr: 0, hr2: 0, innings: 0 },
    p2: { points: 0, run: 0, hr: 0, hr2: 0, innings: 0 },
    liveOn: false,
    openedAt: null,
    history: [],
    sides: [1, 2],
    targetPoints: null,
    equalInnings: false,
    detail: [],
    tools: { ...emptyDeskTools },
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
  /* Ξεκινά με ΕΝΑ τραπέζι — τα υπόλοιπα μπαίνουν με «+ Table» μόνο αν χρειαστούν. */
  const [tables, setTables] = useState<TableState[]>(() => [emptyTable(1)]);
  const [selected, setSelected] = useState(1);

  const [log, setLog] = useState<Array<{ text: string; at: string }>>([]);
  const [eventId, setEventId] = useState<string>(schedule.events?.[0]?.documentId || "");
  const [stageId, setStageId] = useState<string>(schedule.events?.[0]?.stages?.[0]?.documentId || "");
  const [matches, setMatches] = useState<Match[]>([]);
  const [pickForTable, setPickForTable] = useState<number | null>(null);
  const [tourneyOpen, setTourneyOpen] = useState(false);
  const [publicOpen, setPublicOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  /*
   * Κάθε συσκευή έχει το δικό της αναγνωριστικό: το «Συνέχεια» γράφει ποιος
   * κρατά το τραπέζι τώρα, και η προηγούμενη συσκευή κλειδώνει (δεν ξαναγράφει
   * σκορ κατά λάθος).
   */
  const deviceId = useRef<string>("");
  useEffect(() => {
    try {
      let id = window.localStorage.getItem("desk.device.v1");
      if (!id) {
        id = `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
        window.localStorage.setItem("desk.device.v1", id);
      }
      deviceId.current = id;
    } catch {
      deviceId.current = `d${Date.now().toString(36)}`;
    }
  }, []);

  const [openList, setOpenList] = useState<OpenTable[]>([]);
  const [resumeOpen, setResumeOpen] = useState(false);

  /* Τα ανοιχτά τραπέζια δεν χάνονται με ανανέωση σελίδας. */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("desk.tables.v1");
      if (!raw) return;
      const saved = JSON.parse(raw) as { tables?: TableState[]; selected?: number };
      if (Array.isArray(saved.tables) && saved.tables.some((t) => t?.sessionId)) {
        setTables(
          saved.tables.map((t) => ({
            ...t,
            history: Array.isArray(t?.history) ? t.history : [],
            /* Παλιά αποθηκευμένα τραπέζια δεν έχουν `tools`. */
            tools: { ...emptyDeskTools, ...(t?.tools ?? {}) },
          })),
        );
        if (saved.selected) setSelected(saved.selected);
      }
      /*
       * Το τραπέζι ισχύει μόνο όσο υπάρχει η session. Αν σβήστηκε στο μεταξύ
       * (καθάρισμα από το admin), το desk κρατούσε φάντασμα και ο αγώνας δεν
       * μπορούσε να ξαναμπεί στη θέση του — ούτε με refresh.
       */
      saved.tables
        ?.filter((t) => t?.sessionId)
        .forEach((table) => {
          void api(`/api/desk/tables/${encodeURIComponent(String(table.sessionId))}/claim`, token, {
            method: "POST",
            body: JSON.stringify({}),
          }).catch((err) => {
            const message = err instanceof Error ? err.message : "";
            if (/δεν βρέθηκε/i.test(message)) {
              setTables((prev) => prev.map((row) => (row.no === table.no ? emptyTable(row.no) : row)));
            }
          });
        });
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    try {
      const payload = {
        selected,
        /* Το history αποθηκεύεται: αλλιώς μετά από refresh/reload το Undo ήταν νεκρό. */
        tables: tables.map((t) => ({ ...t, history: t.history.slice(0, 30), saving: false, buffer: "" })),
      };
      window.localStorage.setItem("desk.tables.v1", JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [tables, selected]);
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
      /* Ρολόι: κρυφό όταν δεν είναι αναμμένο (0), αλλιώς ό,τι έμεινε. */
      totalBlocks: table.tools.clockVisible ? table.tools.clockTotal : 0,
      progress: table.tools.clockVisible
        ? Math.max(0, table.tools.clockTotal - table.tools.clockRemaining)
        : 0,
      timeoutsUsed: [table.tools.timeoutsA, table.tools.timeoutsB],
      maxTimeouts: [
        table.tools.timeoutsVisible ? table.tools.timeoutsMax : 0,
        table.tools.timeoutsVisible ? table.tools.timeoutsMax : 0,
      ],
    };
    live.current?.send(state);
  }, []);

  const tablesRef = useRef<TableState[]>([]);
  useEffect(() => {
    tablesRef.current = tables;
  }, [tables]);

  /** Ρολόι/timeouts: ίδιο μονοπάτι με το σκορ — γράφεται και φεύγει στο Live. */
  const updateTools = useCallback(
    (patch: Partial<DeskToolsValue>) => {
      const table = tablesRef.current.find((t) => t.no === selected);
      if (!table || table.locked) return;
      const next: TableState = { ...table, tools: { ...table.tools, ...patch } };
      setTables((prev) => prev.map((t) => (t.no === selected ? next : t)));
      publishLive(next);
    },
    [selected, publishLive],
  );

  /* Κάθε δευτερόλεπτο: κατεβάζει το ρολόι όσων τρέχουν και το στέλνει στο Live. */
  useEffect(() => {
    const id = window.setInterval(() => {
      const changed = tablesRef.current
        .filter((t) => !t.locked && t.tools?.clockVisible && t.tools?.clockRunning)
        .map((t) => ({ ...t, tools: tickTools(t.tools, t.active) }));
      if (changed.length === 0) return;
      setTables((prev) => prev.map((t) => changed.find((row) => row.no === t.no) ?? t));
      changed.forEach((t) => publishLive(t));
    }, 1000);
    return () => window.clearInterval(id);
  }, [publishLive]);

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

  /* --- ανοιχτοί αγώνες: «Συνέχεια» από άλλη συσκευή --- */
  const fetchOpen = useCallback(async () => {
    try {
      const res = await api<{ data: OpenTable[] }>("/api/desk/tables", token);
      const rows = Array.isArray(res?.data) ? res.data : [];
      setOpenList(rows);
      return rows;
    } catch {
      return [] as OpenTable[];
    }
  }, [token]);

  /**
   * Παίρνει το σκορ από τη βάση για τα τραπέζια που έχουν ήδη session τοπικά.
   * Η βάση είναι η αλήθεια: αν ο αγώνας προχώρησε από άλλη συσκευή (ή έμεινε
   * πίσω ένα POST), το desk δείχνει ό,τι είναι γραμμένο, όχι την παλιά εικόνα.
   */
  const adoptFromApi = useCallback((rows: OpenTable[]) => {
    if (rows.length === 0) return;
    /* Αν κάποιο σκορ είναι στον δρόμο (debounce), μη το πατήσεις με παλιότερη εικόνα. */
    if (tablesRef.current.some((t) => t.saving)) return;
    setTables((prev) =>
      prev.map((table) => {
        if (!table.sessionId || !table.match) return table;
        const row = rows.find((item) => item.sessionId === table.sessionId);
        if (!row) return table;
        /* Το API έχει σταθερή σειρά πλευρών· η σειρά του desk (Swap) έρχεται στο `view`. */
        const order = Array.isArray(row.view?.order) && row.view.order.length === 2 ? row.view.order : [1, 2];
        const canonical = row.players ?? [];
        const first = order[0] === 2 ? canonical[1] : canonical[0];
        const second = order[0] === 2 ? canonical[0] : canonical[1];
        const sameOrder = (order[0] === 2 ? 2 : 1) === table.sides[0];
        const same =
          (Number(first?.points) || 0) === table.p1.points &&
          (Number(second?.points) || 0) === table.p2.points &&
          (Number(first?.innings) || 0) === table.p1.innings &&
          (Number(second?.innings) || 0) === table.p2.innings &&
          (Number(first?.hr) || 0) === table.p1.hr &&
          (Number(second?.hr) || 0) === table.p2.hr;
        /* Το κρατά άλλη συσκευή → κλειδώνει (τα κουμπιά σβήνουν) μέχρι να το ξαναπάρουμε. */
        const claimDevice = row.claim?.deviceId ?? null;
        const locked = Boolean(claimDevice && deviceId.current && claimDevice !== deviceId.current);
        if (same && sameOrder && locked === Boolean(table.locked)) return table;
        return {
          ...table,
          locked,
          /* Η άλλη συσκευή έκανε Swap: παίρνουμε τη δική της σειρά. */
          sides: (order[0] === 2 ? [2, 1] : [1, 2]) as [1 | 2, 1 | 2],
          active: sameOrder ? table.active : Number(row.view?.active) === 1 ? 1 : 0,
          match: sameOrder
            ? table.match
            : {
                ...table.match,
                player1: first?.name ?? table.match.player1,
                player2: second?.name ?? table.match.player2,
              },
          p1: {
            points: Number(first?.points) || 0,
            run: Number(first?.run) || 0,
            hr: Number(first?.hr) || 0,
            hr2: table.p1.hr2,
            innings: Number(first?.innings) || table.p1.innings,
          },
          p2: {
            points: Number(second?.points) || 0,
            run: Number(second?.run) || 0,
            hr: Number(second?.hr) || 0,
            hr2: table.p2.hr2,
            innings: Number(second?.innings) || table.p2.innings,
          },
          liveOn: row.isPublic === true ? true : table.liveOn,
        };
      }),
    );
  }, []);

  useEffect(() => {
    void fetchOpen().then((rows) => {
      if (rows.length === 0) return;
      adoptFromApi(rows);
      /* Άνοιξε από άλλη συσκευή ή μετά από κλείσιμο: δείξε αμέσως τι συνεχίζεται. */
      const local = new Set(tablesRef.current.map((t) => t.sessionId).filter(Boolean) as string[]);
      if (rows.some((row) => !local.has(row.sessionId))) setResumeOpen(true);
    });
    /*
     * Μόλις το desk πάρει focus (γύρισμα καρτέλας, κλικ στο παράθυρο) ξαναρωτά
     * τη βάση: φέρνει ό,τι γράφτηκε αλλού και κλειδώνει το τραπέζι αν το πήρε
     * άλλη συσκευή.
     */
    const onFocus = () => {
      if (document.visibilityState === "hidden") return;
      void fetchOpen().then((rows) => adoptFromApi(rows));
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [fetchOpen, adoptFromApi]);

  /**
   * Παίρνει το τραπέζι στην τρέχουσα συσκευή και φορτώνει το σκορ από τη βάση.
   * Όποιος το επιλέξει τελευταίος συνεχίζει· η προηγούμενη συσκευή κλειδώνει.
   */
  const resumeTable = useCallback(
    async (row: OpenTable) => {
      setError(null);
      try {
        await api(`/api/desk/tables/${encodeURIComponent(row.sessionId)}/claim`, token, {
          method: "POST",
          body: JSON.stringify({ deviceId: deviceId.current }),
        });
        const players = Array.isArray(row.players) ? row.players : [];
        /*
         * Το API κρατά τους παίκτες σε σταθερή σειρά πλευρών. Το προηγούμενο desk
         * μπορεί να είχε κάνει Swap — παίρνουμε τη δική του σειρά και τον ενεργό.
         */
        const order = Array.isArray(row.view?.order) && row.view?.order.length === 2 ? row.view.order : [1, 2];
        const [first, second] = order[0] === 2 ? [players[1] ?? {}, players[0] ?? {}] : [players[0] ?? {}, players[1] ?? {}];
        const tableNo = Number(row.tableNumber) || Math.max(0, ...tables.map((t) => t.no)) + 1;
        const hydrated: TableState = {
          ...emptyTable(tableNo),
          match: {
            documentId: String(row.brMatchDocumentId || row.brMatchId || row.sessionId),
            matchNumber: row.matchNumber ?? null,
            player1: first.name ?? "",
            player2: second.name ?? "",
          },
          p1: {
            points: Number(first.points) || 0,
            /* Το σερί που δεν έχει περαστεί ακόμη στους πόντους έρχεται κι αυτό. */
            run: Number(first.run) || 0,
            hr: Number(first.hr) || 0,
            hr2: 0,
            innings: Number(first.innings) || 1,
          },
          p2: {
            points: Number(second.points) || 0,
            run: Number(second.run) || 0,
            hr: Number(second.hr) || 0,
            hr2: 0,
            innings: Number(second.innings) || 0,
          },
          sessionId: row.sessionId,
          screenId: row.screenIdentifier ?? null,
          mode: "direct",
          online: true,
          liveOn: row.isPublic === true,
          sides: (order[0] === 2 ? [2, 1] : [1, 2]) as [1 | 2, 1 | 2],
          active: Number(row.view?.active) === 1 ? 1 : 0,
          targetPoints: row.targetPoints ?? null,
          equalInnings: row.equalInnings === true,
          openedAt: Date.now(),
          history: [],
        };
        setTables((prev) =>
          prev.some((t) => t.no === tableNo)
            ? prev.map((t) => (t.no === tableNo ? hydrated : t))
            : [...prev, hydrated],
        );
        setSelected(tableNo);
        setResumeOpen(false);
        pushLog(`T${tableNo} · συνέχεια: ${first.name} – ${second.name} (${first.points ?? 0}-${second.points ?? 0})`);
        publishLive(hydrated);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ο αγώνας δεν συνεχίστηκε");
      }
    },
    [token, tables, pushLog, publishLive],
  );

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
              deviceId: deviceId.current,
              /* Θέση παικτών/ενεργός όπως τα βλέπει το desk — για «Συνέχεια» αλλού. */
              view: { order: next.sides, active: next.active },
              players: [
                { side: next.sides[0], points: next.p1.points, innings: next.p1.innings, highRun: next.p1.hr, run: next.p1.run, liveRun: next.active === 0 ? Number(next.buffer || 0) : 0 },
                { side: next.sides[1], points: next.p2.points, innings: next.p2.innings, highRun: next.p2.hr, run: next.p2.run, liveRun: next.active === 1 ? Number(next.buffer || 0) : 0 },
              ],
              inningsDetail: next.detail,
              finish,
            }),
          });
          setTables((prev) => prev.map((t) => (t.no === next.no ? { ...t, saving: false } : t)));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Το σκορ δεν στάλθηκε";
          setError(message);
          /*
           * Το τραπέζι συνεχίζεται αλλού: κλειδώνει η οθόνη (τα κουμπιά σβήνουν)
           * και δεν σβήνεται τίποτα — «Πάρε τον έλεγχο» ή refresh το επαναφέρει.
           */
          if (/άλλη συσκευή/i.test(message)) {
            void fetchOpen().then((rows) => adoptFromApi(rows));
            setTables((prev) =>
              prev.map((t) => (t.no === next.no ? { ...t, saving: false, locked: true } : t)),
            );
            return;
          }
          /* Η session σβήστηκε (π.χ. καθάρισμα από το admin): ελευθερώνουμε το τραπέζι. */
          if (/δεν βρέθηκε/i.test(message)) {
            setTables((prev) => prev.map((t) => (t.no === next.no ? emptyTable(next.no) : t)));
            return;
          }
          setTables((prev) => prev.map((t) => (t.no === next.no ? { ...t, saving: false } : t)));
        }
      }, 250);
    },
    [token, publishLive, fetchOpen],
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
      {
        p1: { ...table.p1 },
        p2: { ...table.p2 },
        active: table.active,
        detail: table.detail.map((row) => ({ ...row })),
        tools: { ...table.tools },
      },
      ...table.history,
    ].slice(0, 30),
  });

  /* --- άνοιγμα αγώνα σε τραπέζι --- */
  const openMatch = useCallback(
    async (tableNo: number, match: Match, seq?: number) => {
      setError(null);
      try {
        const opened = await api<{
          data: {
            sessionId: string;
            screenIdentifier: string;
            mode: "direct" | "screen";
            targetPoints?: number | null;
            equalInnings?: boolean;
          };
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
          body: JSON.stringify({ deviceId: deviceId.current }),
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
                  targetPoints: opened.data.targetPoints ?? null,
                  equalInnings: opened.data.equalInnings === true,
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
    const next = withHistory({
      ...closeTurn(current, run),
      tools: resetClockAfterPoint(current.tools),
    });
    pushLog(`T${current.no} · ${run} πόντοι στο σκορ — αλλαγή σειράς`);
    pushScore(next);
  }, [current, pendingRun, withHistory, closeTurn, pushScore, pushLog]);

  /** +N πόντοι στον ενεργό παίκτη — αντί για αριθμητικό πληκτρολόγιο. */
  const addPoints = useCallback(
    (n: number) => {
      if (!current?.sessionId || current.finished || current.locked) return;
      const key = current.active === 0 ? "p1" : "p2";
      const side = current[key];
      const next = withHistory({
        ...current,
        [key]: { ...side, run: side.run + n },
        buffer: "",
        tools: resetClockAfterPoint(current.tools),
      });
      pushScore(next);
    },
    [current, pushScore, withHistory],
  );

  /** Αλλαγή πλευρών: τα ονόματα, τα σκορ και το φύλλο ακολουθούν. */
  const swapPlayers = useCallback(() => {
    if (!current?.match || current.finished || current.locked) return;
    const next = withHistory({
      ...current,
      match: {
        ...current.match,
        player1: current.match.player2,
        player2: current.match.player1,
      },
      p1: current.p2,
      p2: current.p1,
      sides: [current.sides[1], current.sides[0]] as [1 | 2, 1 | 2],
      active: (current.active === 0 ? 1 : 0) as 0 | 1,
      detail: current.detail.map((row) => ({
        inning: row.inning,
        player1: row.player2,
        player2: row.player1,
      })),
      buffer: "",
    });
    pushScore(next);
  }, [current, pushScore, withHistory]);

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
    if (!current?.sessionId || current.history.length === 0 || current.locked) return;
    const [last, ...rest] = current.history;
    const next: TableState = {
      ...current,
      p1: last.p1,
      p2: last.p2,
      active: last.active,
      detail: last.detail ? last.detail.map((row) => ({ ...row })) : current.detail,
      tools: last.tools ? { ...last.tools } : current.tools,
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
    const next: TableState = equalizeInnings({ ...current, finished: true, buffer: "", saving: true });
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

  /** Παίρνει πίσω το τραπέζι από άλλη συσκευή (ίδιος κωδικός, τελευταίος κερδίζει). */
  const takeControl = useCallback(
    async (no: number) => {
      const table = tablesRef.current.find((t) => t.no === no);
      if (!table?.sessionId) return;
      try {
        await api(`/api/desk/tables/${encodeURIComponent(table.sessionId)}/claim`, token, {
          method: "POST",
          body: JSON.stringify({ deviceId: deviceId.current }),
        });
        setTables((prev) => prev.map((t) => (t.no === no ? { ...t, locked: false } : t)));
        pushLog(`T${no} · πήρε τον έλεγχο`);
        void fetchOpen();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ο έλεγχος δεν ανακτήθηκε");
      }
    },
    [token, pushLog, fetchOpen],
  );

  /* πληκτρολόγιο: 0-9, Enter, Space, U */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current?.sessionId || current.locked) return;
      if (/^[0-9]$/.test(e.key)) {
        updateBuffer((value) => value + e.key);
        return;
      }
      if (e.key === "Enter") {
        commitTurn();
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
  }, [current, addPoint, commitTurn, undo]);

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
    <div className="bt-desk">
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
          <span>{tables.length}</span> {tables.length === 1 ? "table" : "tables"}
        </div>
        <button type="button" className="ghost" onClick={addTable} disabled={tables.length >= MAX_TABLES}>
          + Table
        </button>
        <button type="button" className="ghost" onClick={onLogout}>
          Έξοδος
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            void fetchOpen();
            setResumeOpen(true);
          }}
        >
          Ανοιχτοί αγώνες{openList.length ? ` (${openList.length})` : ""}
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
                        <span className="sid">no screen</span>
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
                    </div>
                    <div className="chead-sub">
                      <span className="sid">
                        <span className={`dotg${table.online ? "" : " off"}`} />
                        {table.screenId || "no screen"}
                      </span>
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
                          <span className="run">
                            {table.active === idx && !table.finished ? pendingRun(table) : side.run}
                          </span>
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
                        if (next.sessionId) {
                          void api(
                            `/api/desk/tables/${encodeURIComponent(next.sessionId)}/visibility`,
                            token,
                            { method: "POST", body: JSON.stringify({ isPublic: next.liveOn }) },
                          ).catch(() => {
                            /* αν αποτύχει, το Live κρύβεται μόνο προσωρινά */
                          });
                        }
                        if (next.liveOn) {
                          publishLive(next);
                          pushLog(`T${table.no} · Live on`);
                        } else {
                          if (next.sessionId && next.screenId && next.match) {
                            live.current?.stop({
                              screenId: next.screenId,
                              sessionId: next.sessionId,
                              names: [
                                next.match.player1 || "Player A",
                                next.match.player2 || "Player B",
                              ],
                              points: [next.p1.points, next.p2.points],
                              innings: [next.p1.innings, next.p2.innings],
                              highRuns: [next.p1.hr, next.p2.hr],
                              active: next.active,
                            });
                          }
                          pushLog(`T${table.no} · Live off`);
                        }
                      }}
                    >
                      {table.liveOn ? "LIVE ●" : "LIVE"}
                    </button>

                    <button type="button" className="save" onClick={(e) => { e.stopPropagation(); setSelected(table.no); endGame(); }}>
                      {table.finished ? "Κλειστό" : "End game"}
                    </button>
                    {/* Αφήνει το τραπέζι σε αυτή τη συσκευή· ο αγώνας μένει ανοιχτός για «Συνέχεια» αλλού. */}
                    <button
                      type="button"
                      className="leave"
                      title="Αφήνει το τραπέζι — ο αγώνας μένει ανοιχτός για συνέχεια από άλλη συσκευή"
                      onClick={(e) => {
                        e.stopPropagation();
                        void closeTable(table.no);
                      }}
                    >
                      Άφησε
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
            <div className="k">{operatorName}</div>
            <div className="t">Table {current?.no}</div>
            <div className="p">{activeName || "—"}</div>
            <div className="src">{current?.match ? `${matchTitle(current.match)} · ${current.screenId || ""}` : "—"}</div>
          </div>
          <div className="display">
            <div className="lbl">
              CURRENT
              <br />
              RUN
            </div>
            <div className={`val${current && pendingRun(current) > 0 ? "" : " empty"}`}>
              {current ? pendingRun(current) || "–" : "–"}
            </div>
          </div>
          <div className="keys">
              {[1, 3, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => addPoints(n)}
                  disabled={!current?.sessionId || Boolean(current?.finished) || Boolean(current?.locked)}
                >
                  +{n}
                </button>
              ))}
              <button
                type="button"
                className="enter"
                onClick={() => commitTurn()}
                disabled={!current?.sessionId || Boolean(current?.finished) || Boolean(current?.locked)}
              >
                ENTER ⏎
              </button>
            </div>
            <div className="quick">
              <button type="button" id="qUndo" onClick={undo} disabled={Boolean(current?.locked)}>
                Undo (U)
              </button>
              <button type="button" id="qSwap" onClick={swapPlayers} disabled={Boolean(current?.locked)}>
                Swap players
              </button>
              <div id="qClock">
                <DeskToolsToggle
                  value={current?.tools ?? emptyDeskTools}
                  onChange={updateTools}
                  disabled={!current?.sessionId || Boolean(current?.finished) || Boolean(current?.locked)}
                />
              </div>
            </div>
          <div className="matchtools">
            <DeskMatchControls
              value={current?.tools ?? emptyDeskTools}
              onChange={updateTools}
              disabled={!current?.sessionId || Boolean(current?.finished) || Boolean(current?.locked)}
              hideMaster
            />
          </div>
          {current?.locked ? (
            <div className="lockedbar">
              <b>Κλειδωμένο</b> — ο αγώνας συνεχίζεται σε άλλη συσκευή.
              <button type="button" className="ghost" onClick={() => void takeControl(current.no)}>
                Πάρε τον έλεγχο
              </button>
            </div>
          ) : null}
          <div className="hint">
            <span className="kbd">+1/+3/+5</span> πόντοι · <span className="kbd">⏎</span> τέλος στεκιάς ·{" "}
            <span className="kbd">U</span> undo
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
              /* Η αρίθμηση μέσα στον όμιλο μένει σταθερή (1..n σε ΟΛΟΥΣ τους αγώνες),
                 αλλιώς κρύβοντας παιγμένους αλλάζει το «Αγώνας Y» των υπόλοιπων. */
              const numbered = matches.map((match) => {
                const key = Number(match.groupNumber ?? 0);
                const seq = (counters.get(key) ?? 0) + 1;
                counters.set(key, seq);
                return { match, seq };
              });
              /* Μόνο ό,τι δεν έχει παιχτεί και δεν παίζεται τώρα σε τραπέζι. */
              const playable = numbered.filter(
                ({ match }) => !match.openOn && !match.done,
              );
              if (playable.length === 0) {
                return (
                  <div className="mrow">
                    <div className="g">—</div>
                    <div className="p">
                      Δεν έμεινε άπαιχτος αγώνας σε αυτή τη φάση
                      <small>Όλοι έχουν παιχτεί ή βρίσκονται σε τραπέζι</small>
                    </div>
                  </div>
                );
              }
              return playable.map(({ match, seq }) => (
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
              ));
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

      {/* ανοιχτοί αγώνες — «Συνέχεια» από άλλη συσκευή */}
      <div className={`overlay${resumeOpen ? " on" : ""}`}>
        <div className="ov-top">
          <h2>Συνέχεια αγώνα</h2>
          <span>Διάλεξε αγώνα — συνεχίζει από εδώ, με το σκορ που είναι στη βάση</span>
          <div style={{ flex: 1 }} />
          <button type="button" className="ghost" onClick={() => setResumeOpen(false)}>
            Close
          </button>
        </div>
        <div className="ov-grid">
          {openList.length === 0 ? (
            <div className="ov-card">
              <div className="h">Κανένας ανοιχτός αγώνας</div>
            </div>
          ) : (
            openList.map((row) => {
              const p1 = row.players?.[0];
              const p2 = row.players?.[1];
              const mine = row.claim?.deviceId && row.claim.deviceId === deviceId.current;
              return (
                <div key={row.sessionId} className="ov-card">
                  <div className="h">
                    TABLE {row.tableNumber ?? "—"} · {p1?.name ?? "—"} – {p2?.name ?? "—"}
                  </div>
                  <div className="ov-row">
                    <span className="n">{p1?.name ?? "—"}</span>
                    <span className="i">{p1?.innings ?? 0}</span>
                    <span className="s">{p1?.points ?? 0}</span>
                  </div>
                  <div className="ov-row">
                    <span className="n">{p2?.name ?? "—"}</span>
                    <span className="i">{p2?.innings ?? 0}</span>
                    <span className="s">{p2?.points ?? 0}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderTop: "1px solid #131b26" }}>
                    <span style={{ fontSize: 11, color: "#6b7787" }}>
                      {row.status === "in_progress" ? "LIVE" : "προετοιμασία"}
                      {row.isPublic ? " ●" : ""} · {mine ? "αυτή η συσκευή" : row.claim?.displayName ?? "ελεύθερο"}
                    </span>
                    <button type="button" className="primary" style={{ marginLeft: "auto" }} onClick={() => void resumeTable(row)}>
                      Συνέχεια
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="ov-foot">Όποιος επιλέξει τελευταίος συνεχίζει — η άλλη συσκευή κλειδώνει.</div>
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
