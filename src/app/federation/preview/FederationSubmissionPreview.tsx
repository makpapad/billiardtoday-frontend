"use client";

import { type KeyboardEvent, useMemo, useRef, useState } from "react";
import "./mockup.css";

type Row = {
  rank: number | null;
  name: string;
  umb: string | null;
  note: string;
  points?: number | null;
};

type Season = { key?: string; season: string; label: string; scale?: number[] };

type GridRow = {
  rank: number | null;
  name: string;
  note: string;
  positionedUmb: string;
  position: string;
};

type Message = { tone: "info" | "ok"; text: string } | null;

type Props = {
  federation: string;
  federationName: string;
  edition: string;
  defaultSeason: string;
  seasons: Season[];
  players: Row[];
};

const OTHER = "__other__";

const pointsFor = (position: number) =>
  position === 1 ? 40 : position === 2 ? 27 : position <= 4 ? 19 : position <= 8 ? 13 : position <= 16 ? 8 : position <= 32 ? 4 : 0;

const normalise = (value: string) => (value || "").toUpperCase().replace(/[^A-Z ]+/g, " ").replace(/\s+/g, " ").trim();

/** Ψάχνει επώνυμο ή/και όνομα: χωρίς τόνους, χωρίς διάκριση πεζών/κεφαλαίων. */
const foldName = (value: string) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0370-\u03ff ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const DEMO_PASTE = `1 ATHANASIOU Michalis
2 FELEKIDIS Panagiotis
3 PAPAKONSTANTINOU Kostas
4 KOKKORIS Kostantinos
5 BALOGIANNIS Apostolos`;

/** Ό,τι θα έφερνε πίσω ένα συμπληρωμένο αρχείο — για να φανεί η ροή. */
const DEMO_FILE: Array<[number, string]> = [
  [1, "ATHANASIOU Michalis"],
  [2, "FELEKIDIS Panagiotis"],
  [3, "PAPAKONSTANTINOU Kostas"],
  [4, "KOKKORIS Kostantinos"],
  [5, "BALOGIANNIS Apostolos"],
  [6, "SELEVENTAS Dimitrios"],
  [7, "POLYCHRONOPOULOS Nikos"],
  [8, "ANTONATOS Kostas"],
  [9, "MOULOS Vangelis"],
  [10, "EVAGGELOU Nikos"],
  [12, "BALOGIANNIS Apostolos"],
];

export function FederationSubmissionPreview({
  federation,
  federationName,
  edition,
  defaultSeason,
  seasons,
  players,
}: Props) {
  const [view, setView] = useState<"auth" | "home" | "new">("auth");
  const [authMode, setAuthMode] = useState<"signin" | "register">("signin");
  const [mode, setMode] = useState<"upload" | "paste" | "grid">("upload");
  const [season, setSeason] = useState(defaultSeason);
  const [manualSeason, setManualSeason] = useState("");
  const [pasteText, setPasteText] = useState(DEMO_PASTE);
  const [uploadMsg, setUploadMsg] = useState<Message>(null);
  const [pasteMsg, setPasteMsg] = useState<Message>(null);
  const [modal, setModal] = useState(false);
  const [rows, setRows] = useState<GridRow[]>(() =>
    players.map((player) => ({
      rank: player.rank,
      name: player.name,
      note: player.note,
      positionedUmb: player.umb ?? "",
      position: "",
    })),
  );

  const [search, setSearch] = useState("");
  const [activeMatch, setActiveMatch] = useState(0);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const positionRefs = useRef<Array<HTMLInputElement | null>>([]);

  const duplicates = useMemo(() => {
    const seen = new Set<number>();
    const duplicate = new Set<number>();
    rows.forEach((row) => {
      if (!row.position) return;
      const position = Number(row.position);
      if (seen.has(position)) duplicate.add(position);
      else seen.add(position);
    });
    return duplicate;
  }, [rows]);

  const searchTerms = useMemo(() => foldName(search).split(" ").filter(Boolean), [search]);

  /** Δείκτες αθλητών που ταιριάζουν με το επώνυμο ή/και το όνομα — «έξυπνη» αναζήτηση. */
  const matches = useMemo(() => {
    if (!searchTerms.length) return rows.map((_, index) => index);
    return rows.reduce<number[]>((acc, row, index) => {
      const haystack = foldName(row.name);
      if (searchTerms.every((term) => haystack.includes(term))) acc.push(index);
      return acc;
    }, []);
  }, [rows, searchTerms]);

  const visibleIndices = searchTerms.length ? matches : rows.map((_, index) => index);
  const activeIndex = matches.length ? Math.min(activeMatch, matches.length - 1) : 0;

  const positioned = rows.filter((row) => row.position);
  const positionedWithId = positioned.filter((row) => row.positionedUmb);
  const flagged = positioned.filter((row) => !row.positionedUmb || duplicates.has(Number(row.position)));
  const ready = positioned.length > 0 && flagged.length === 0;
  const fileName = `${federation}-3C-Individual-${season}.xlsx`;

  function setPosition(index: number, value: string) {
    const clean = value.replace(/[^0-9]/g, "").slice(0, 2);
    setRows((current) => current.map((row, i) => (i === index ? { ...row, position: clean } : row)));
  }

  function setUmb(index: number, value: string) {
    const clean = value.replace(/[^0-9]/g, "").slice(0, 4);
    setRows((current) => current.map((row, i) => (i === index ? { ...row, positionedUmb: clean } : row)));
  }

  /** Άλμα απευθείας στο πεδίο θέσης του επιλεγμένου αθλητή. */
  function focusPosition(index: number) {
    const input = positionRefs.current[index];
    if (!input) return;
    input.scrollIntoView({ block: "center", behavior: "smooth" });
    input.focus();
    input.select();
  }

  /** Βελάκια = αλλαγή ταιριάσματος, Enter = άλμα στο πεδίο θέσης του. */
  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!matches.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveMatch((current) => (current + 1) % matches.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveMatch((current) => (current - 1 + matches.length) % matches.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      focusPosition(matches[activeIndex]);
    }
  }

  /** Μόλις καταχωρηθεί θέση, το πεδίο αναζήτησης καθαρίζει για τον επόμενο αθλητή. */
  function clearSearchAfterPosition(refocus = false) {
    if (!search) return;
    setSearch("");
    setActiveMatch(0);
    if (refocus) requestAnimationFrame(() => searchRef.current?.focus());
  }

  /** Βάζει θέσεις από όποια πηγή (αρχείο / επικόλληση) ταιριάζοντας τα ονόματα. */
  function applyPairs(pairs: Array<[number, string]>) {
    const next = rows.map((row) => ({ ...row }));
    const unknown: string[] = [];
    let filled = 0;
    pairs.forEach(([position, name]) => {
      const target = normalise(name);
      const surname = target.split(" ")[0];
      const hit =
        next.find((row) => normalise(row.name) === target) ||
        next.find((row) => normalise(row.name).split(" ")[0] === surname);
      if (hit) {
        hit.position = String(position);
        filled += 1;
      } else {
        unknown.push(name);
      }
    });
    setRows(next);
    return { filled, unknown };
  }

  function handleUpload() {
    const { filled, unknown } = applyPairs(DEMO_FILE);
    setUploadMsg({
      tone: "info",
      text:
        `${federation}-3C-Individual-${season}.xlsx read: ${filled} rows matched` +
        (unknown.length ? ` · not in the CEB list: ${unknown.join(", ")}` : "") +
        " · the grid is filled — nothing has been submitted yet.",
    });
  }

  function handlePaste() {
    const pairs: Array<[number, string]> = [];
    pasteText.split("\n").forEach((line) => {
      const position = Number((line.match(/^\s*(\d+)/) || [])[1]);
      const name = line.replace(/^\s*\d+[.)]?\s*/, "").trim();
      if (position && name) pairs.push([position, name]);
    });
    const { filled, unknown } = applyPairs(pairs);
    setPasteMsg({
      tone: unknown.length ? "info" : "ok",
      text:
        `${filled} rows placed` +
        (unknown.length
          ? ` · not found in the CEB list: ${unknown.join(", ")} (send them to us and we will add them).`
          : " · all names matched."),
    });
  }

  function handleDemoAnswer() {
    setRows((current) =>
      current.map((row, index) => {
        if (index > 11) return row;
        return { ...row, position: String(index + 1) };
      }),
    );
  }

  const warnings: string[] = [];
  if (duplicates.size)
    warnings.push(`Position ${[...duplicates].sort((a, b) => a - b).join(", ")} is used twice — clear the duplicate.`);
  const withoutId = positioned.filter((row) => !row.positionedUmb);
  if (withoutId.length)
    warnings.push(
      `${withoutId.length} positioned ${withoutId.length === 1 ? "player has" : "players have"} no UMB ID — type it in the ID column, or leave it empty if the name is correct and we will find it.`,
    );
  if (positioned.length && !duplicates.size && !withoutId.length)
    warnings.push("All positioned rows are ready to submit.");

  return (
    <div className="fedmock">
      <div className="row" style={{ marginBottom: 18 }}>
        <button onClick={() => setView("auth")} aria-selected={view === "auth"}>
          Sign in / Register
        </button>
        <button onClick={() => setView("home")}>My submissions</button>
        <button onClick={() => setView("new")}>New submission</button>
      </div>

      {view === "auth" && (
        <section className="card narrow">
          <div className="eyebrow">BilliardToday · Federations</div>
          <h1>National ranking submission</h1>
          <p className="muted">
            Enter the finishing positions of your national championship. BilliardToday turns them into CEB ranking
            points — one season per player.
          </p>

          <div className="tabs" style={{ margin: "18px 0 4px" }}>
            <button aria-selected={authMode === "signin"} onClick={() => setAuthMode("signin")}>
              Sign in
            </button>
            <button aria-selected={authMode === "register"} onClick={() => setAuthMode("register")}>
              Create account
            </button>
          </div>

          <button className="primary" style={{ width: "100%", marginTop: 14, justifyContent: "center" }}>
            Continue with Google
          </button>
          <p className="foot" style={{ textAlign: "center" }}>
            Use the email of your federation (Google Workspace works).
          </p>

          <div className="row" style={{ margin: "18px 0 6px" }}>
            <hr style={{ flex: 1, border: 0, borderTop: "1px solid #e2e8f0" }} />
            <span className="lock">or use email</span>
            <hr style={{ flex: 1, border: 0, borderTop: "1px solid #e2e8f0" }} />
          </div>

          {authMode === "register" && (
            <div>
              <label>Federation</label>
              <select defaultValue={federation}>
                <option value="GR">Greece — Hellenic Billiard Federation (GR)</option>
                <option value="CY">Cyprus (CY)</option>
                <option value="BG">Bulgaria (BG)</option>
                <option value="">Other — my federation is not listed</option>
              </select>
              <p className="foot">
                We match it with the federation records already in our system, so the account is tied to the right
                country from the first minute.
              </p>
            </div>
          )}

          <label>Email</label>
          <input type="email" defaultValue={`federation@${federation.toLowerCase()}.example`} />
          <label>Password</label>
          <input type="password" defaultValue="demo-password" />
          {authMode === "register" && (
            <>
              <label>Repeat password</label>
              <input type="password" defaultValue="demo-password" />
            </>
          )}

          <div className="row between" style={{ marginTop: 16 }}>
            <span className="lock">Forgot password?</span>
            <button className="primary" onClick={() => setView("home")}>
              {authMode === "register" ? "Create account" : "Sign in"}
            </button>
          </div>

          <div className="msg info" style={{ marginTop: 18 }}>
            <b>Federation accounts are reviewed by us.</b> A new registration shows{" "}
            <span className="chip warn">Pending verification</span> until we confirm it (usually within one business
            day) — the same rule as player accounts.
          </div>
        </section>
      )}

      {view === "home" && (
        <section>
          <div className="card tight">
            <div className="row between">
              <div>
                <div className="eyebrow">Signed in</div>
                <h2>
                  {federationName} <span className="chip ok">Verified</span>
                </h2>
                <p className="muted">
                  Country <b>{federationName} ({federation})</b> · 3-Cushion · edition {edition}
                </p>
              </div>
              <button className="primary" onClick={() => setView("new")}>
                New submission
              </button>
            </div>
          </div>

          <div className="card">
            <h3>My submissions</h3>
            <table>
              <thead>
                <tr>
                  <th>
                    Season<span className="sub">the year that counts</span>
                  </th>
                  <th>Discipline</th>
                  <th>Players</th>
                  <th>Submitted</th>
                  <th>
                    Status<span className="sub">what happens now</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="num">{season}</td>
                  <td>3-Cushion Individual</td>
                  <td className="num">42</td>
                  <td>28 Sep 2026</td>
                  <td>
                    <span className="chip warn">In review</span> <span className="lock">checked by BilliardToday</span>
                  </td>
                </tr>
                <tr>
                  <td className="num">2024-25</td>
                  <td>3-Cushion Individual</td>
                  <td className="num">38</td>
                  <td>12 Jun 2026</td>
                  <td>
                    <span className="chip ok">Published</span> <span className="lock">CEB ranking 15/2026</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {view === "new" && (
        <section>
          <div className="card tight">
            <div className="row between">
              <div className="row">
                <span className="chip plain">
                  {federationName} ({federation}) <span className="lock">locked to your account</span>
                </span>
                <span className="chip plain">3-Cushion Individual</span>
              </div>
              <div className="row">
                <span className="lock">Season</span>
                <select
                  value={season}
                  style={{ width: 300 }}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === OTHER) {
                      setSeason(manualSeason || "");
                      return;
                    }
                    setSeason(value);
                  }}
                >
                  {seasons.map((item) => (
                    <option key={item.season} value={item.season}>
                      {item.label}
                    </option>
                  ))}
                  {season && !seasons.some((item) => item.season === season) && (
                    <option value={season}>{season} (typed)</option>
                  )}
                  <option value={OTHER}>Other season (type it)…</option>
                </select>
                <input
                  style={{ width: 170 }}
                  placeholder="or type: 2023-24"
                  value={manualSeason}
                  onChange={(event) => {
                    const value = event.target.value;
                    setManualSeason(value);
                    setSeason(value);
                  }}
                />
              </div>
            </div>
            <p className="foot">
              Only one season counts per player. The list comes from the <b>current CEB edition</b> ({edition}) — when
              a new season opens it appears here by itself and the season that drops off disappears. Submit{" "}
              <b>{season || "—"}</b>; players who did not take part in it stay without a position.
            </p>
            <p className="foot">
              Points come from the position, not the other way round: 1 → 40 · 2 → 27 · 3-4 → 19 · 5-8 → 13 · 9-16 → 8 ·
              17-32 → 4.
            </p>
          </div>

          <div className="card">
            <div className="row between" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Step 3 — Check before you submit</h3>
              <div className="row">
                <button onClick={handleDemoAnswer}>Fill a demo answer</button>
                <button onClick={() => setRows((current) => current.map((row) => ({ ...row, position: "" })))}>
                  Clear positions
                </button>
              </div>
            </div>

            <div className="bars">
              <div className="stat">
                <span>Positioned</span>
                <b>{positioned.length}</b>
              </div>
              <div className="stat">
                <span>Of players</span>
                <b>{rows.length}</b>
              </div>
              <div className="stat">
                <span>Matched to ID</span>
                <b>{positionedWithId.length}</b>
              </div>
              <div className="stat">
                <span>Need your attention</span>
                <b>{flagged.length}</b>
              </div>
            </div>

            {warnings.map((warning) => (
              <div
                key={warning}
                className={`msg ${duplicates.size ? "bad" : withoutId.length ? "info" : "ok"}`}
              >
                {warning}
              </div>
            ))}

            <div className="searchbar">
              <input
                ref={searchRef}
                type="search"
                autoComplete="off"
                aria-label="Search a player by surname or first name"
                placeholder="Search a player — surname or first name…"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setActiveMatch(0);
                }}
                onKeyDown={handleSearchKeyDown}
              />
              <span className="lock searchcount">
                {searchTerms.length === 0 ? (
                  <>Type a surname or first name · ↓ ↑ to pick · Enter jumps to the position field</>
                ) : matches.length === 0 ? (
                  <>No player matches “{search}” — check the spelling.</>
                ) : (
                  <>
                    <b>
                      {matches.length} of {rows.length}
                    </b>{" "}
                    {matches.length === 1 ? "player matches" : "players match"}
                    {" · "}
                    {matches.length > 1 ? "↓ ↑ to pick · Enter jumps to that player" : "Enter jumps to their position field"}
                  </>
                )}
              </span>
            </div>

            {searchTerms.length > 0 && matches.length > 0 && (
              <div className="lock" style={{ marginBottom: 8 }}>
                Selected: <b>{rows[matches[activeIndex]].name}</b>
              </div>
            )}

            <div className="gridbox" style={{ marginTop: 14 }}>
              <table>
                <thead>
                  <tr>
                    <th>
                      CEB list<span className="sub">reference</span>
                    </th>
                    <th>
                      Player<span className="sub">as in the CEB list</span>
                    </th>
                    <th>
                      UMB ID<span className="sub">key of the player</span>
                    </th>
                    <th>
                      Position<span className="sub">what you fill</span>
                    </th>
                    <th>
                      Points<span className="sub">auto</span>
                    </th>
                    <th>
                      Check<span className="sub">live</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleIndices.map((index) => {
                    const row = rows[index];
                    const isDuplicate = Boolean(row.position) && duplicates.has(Number(row.position));
                    const needsId = Boolean(row.position) && !row.positionedUmb;
                    const isActive = searchTerms.length > 0 && matches[activeIndex] === index;
                    const points = row.position ? pointsFor(Number(row.position)) : 0;
                    const chipClass = !row.position ? "plain" : !row.positionedUmb ? "warn" : isDuplicate ? "bad" : "ok";
                    const chipText = !row.position
                      ? row.positionedUmb
                        ? "Matched"
                        : "No UMB ID"
                      : !row.positionedUmb
                        ? "Needs ID"
                        : isDuplicate
                          ? "Position twice"
                          : "Ready";
                    return (
                      <tr
                        key={row.name + index}
                        className={[row.position ? (needsId || isDuplicate ? "flagged" : "done") : "", isActive ? "active" : ""]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <td className="num muted">{row.rank ?? "—"}</td>
                        <td>
                          <b>{row.name}</b>
                        </td>
                        <td>
                          <input
                            className="idbox"
                            inputMode="numeric"
                            placeholder="0"
                            title="UMB ID — leave 0 if unknown"
                            value={row.positionedUmb}
                            onChange={(event) => setUmb(index, event.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            ref={(element) => {
                              positionRefs.current[index] = element;
                            }}
                            className="pos"
                            inputMode="numeric"
                            placeholder="—"
                            title="Finishing position in your national championship"
                            value={row.position}
                            onChange={(event) => setPosition(index, event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                clearSearchAfterPosition(true);
                              }
                            }}
                            onBlur={() => {
                              if (search && row.position) clearSearchAfterPosition();
                            }}
                          />
                        </td>
                        <td className="pts num">{points ? points : "—"}</td>
                        <td>
                          <span className={`chip ${chipClass}`}>{chipText}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="row between" style={{ marginTop: 18 }}>
              <span className="lock">
                {positioned.length
                  ? ready
                    ? `${positioned.length} players ready — submit when you are.`
                    : `Fix the highlighted rows first (${flagged.length}).`
                  : "No positions filled yet."}
              </span>
              <div className="row">
                <button onClick={() => setView("home")}>Cancel</button>
                <button className="primary" disabled={!ready} onClick={() => setModal(true)}>
                  Submit for review
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Step 1 — Download the template</h3>
            <div className="row between">
              <div>
                <b>{fileName}</b>
                <p className="muted">
                  {players.length} players of your country from the CEB list, {players.filter((player) => player.umb).length}{" "}
                  of them already carrying their UMB ID. Fill a finishing position next to the players who took part.
                </p>
              </div>
              <button className="primary">Download template</button>
            </div>
            <div className="steps">
              <div className="step">
                <b>Position, not points</b>
                <p>Write 1, 2, 3… Points are calculated here.</p>
              </div>
              <div className="step">
                <b>Do not rename the ID column</b>
                <p>It is how we recognise each player for sure.</p>
              </div>
              <div className="step">
                <b>Unknown ID?</b>
                <p>
                  Leave <b>0</b> — we find the player by the name.
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Step 2 — Bring the positions back</h3>
            <div className="tabs" style={{ marginBottom: 16 }}>
              <button aria-selected={mode === "upload"} onClick={() => setMode("upload")}>
                Upload the file
              </button>
              <button aria-selected={mode === "paste"} onClick={() => setMode("paste")}>
                Paste rows
              </button>
              <button aria-selected={mode === "grid"} onClick={() => setMode("grid")}>
                Type in the grid
              </button>
            </div>

            {mode === "upload" && (
              <div>
                <div className="drop">
                  <b>Drop the filled file here</b>
                  <p className="muted">
                    .xlsx or .csv — the positions fill the grid above instantly. Nothing is submitted yet.
                  </p>
                  <button style={{ marginTop: 8 }} onClick={handleUpload}>
                    Choose file (demo)
                  </button>
                </div>
                {uploadMsg && <div className={`msg ${uploadMsg.tone}`}>{uploadMsg.text}</div>}
              </div>
            )}

            {mode === "paste" && (
              <div>
                <p className="muted">
                  Copy the two columns straight out of your own file — position first, then the name. Any order, extra
                  spaces and “1.” are fine.
                </p>
                <textarea rows={7} value={pasteText} onChange={(event) => setPasteText(event.target.value)} />
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="primary" onClick={handlePaste}>
                    Fill the grid
                  </button>
                  <span className="lock">We sort them and match the names to the UMB registry ourselves.</span>
                </div>
                {pasteMsg && <div className={`msg ${pasteMsg.tone}`}>{pasteMsg.text}</div>}
              </div>
            )}

            {mode === "grid" && (
              <p className="muted">
                Type the position next to each player in the grid above. Rows left empty simply mean “did not take
                part”.
              </p>
            )}
          </div>

          <div className="card tight">
            <h3>What happens next</h3>
            <div className="steps">
              <div className="step">
                <b>1 · You submit</b>
                <p>The list is stored with your name and the time.</p>
              </div>
              <div className="step">
                <b>2 · We check</b>
                <p>Every row against the UMB registry; anything unclear comes back to you.</p>
              </div>
              <div className="step">
                <b>3 · It is published</b>
                <p>Your national column joins the next CEB ranking edition — and the previous edition stays online.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {modal && (
        <div className="modal">
          <div className="card">
            <div className="eyebrow">Submitted</div>
            <h2>Sent for review</h2>
            <p className="muted">
              <b>
                {federationName} ({federation})
              </b>{" "}
              · 3-Cushion Individual · season <b>{season || "—"}</b>
              <br />
              {positioned.length} players with a position, {positionedWithId.length} of them matched to a UMB ID. Stored
              as <span className="chip warn">In review</span> — the CEB list is not touched until we approve it.
            </p>
            <div className="row between" style={{ marginTop: 16 }}>
              <span className="lock">You can come back and resubmit until we approve it.</span>
              <button
                className="primary"
                onClick={() => {
                  setModal(false);
                  setView("home");
                }}
              >
                Back to my submissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
