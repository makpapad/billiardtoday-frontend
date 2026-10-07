"use client";

import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "../preview/mockup.css";
import { matchesAll, playerHaystack, searchTerms } from "@/lib/playerSearch";
import {
  CheckResult,
  FederationContext,
  PortalEdition,
  PortalPlayers,
  PortalSubmission,
  clearSession,
  pointsForPosition,
  portalFetch,
  readSession,
  saveSession,
  scaleText,
} from "@/lib/federationPortal";

const SLUG = "3c-individual";

type GridRow = {
  rank: number | null;
  name: string;
  matchedName: string | null;
  umbId: string;
  position: string;
};

type Message = { tone: "info" | "ok" | "bad"; text: string } | null;

export function FederationSubmitForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [context, setContext] = useState<FederationContext | null>(null);
  const [edition, setEdition] = useState<PortalEdition | null>(null);
  const [season, setSeason] = useState("");
  const [scale, setScale] = useState<number[] | null>(null);
  const [rows, setRows] = useState<GridRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [notice, setNotice] = useState<Message>(null);
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<PortalSubmission | null>(null);
  /** Η CEB ενημερώθηκε με email για την υποβολή (το λέει το meta της απάντησης). */
  const [cebNotified, setCebNotified] = useState(false);
  /** «Έξυπνη» αναζήτηση: γράφεις επώνυμο/όνομα/UMB ID και πηγαίνεις κατευθείαν στη θέση. */
  const [search, setSearch] = useState("");
  const [activeMatch, setActiveMatch] = useState(0);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const positionRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const { token, context: saved } = readSession();
    if (!token) {
      router.replace("/federation/login");
      return;
    }
    setContext(saved);
    setReady(true);

    (async () => {
      const me = await portalFetch<FederationContext>("me");
      if (!me.ok) {
        if (me.status === 401) {
          clearSession();
          router.replace("/federation/login");
          return;
        }
        setNotice({ tone: "bad", text: me.error || "The account could not be loaded" });
        return;
      }
      if (me.data) {
        setContext(me.data);
        saveSession(token, me.data);
      }

      const info = await portalFetch<PortalEdition>("edition");
      if (!info.ok || !info.data) {
        setNotice({ tone: "bad", text: info.error || "The CEB edition could not be loaded" });
        return;
      }
      setEdition(info.data);
      const seasons = info.data.categories.find((category) => category.slug === SLUG)?.seasons ?? [];
      const preferred = seasons[seasons.length - 1]?.season ?? "";
      setSeason((current) => current || preferred);
    })();
  }, [router]);

  const loadPlayers = useCallback(async (value: string) => {
    setLoadingRows(true);
    setCheck(null);
    setProblems([]);
    setNotice(null);
    const res = await portalFetch<PortalPlayers>(`players?slug=${SLUG}&season=${encodeURIComponent(value)}`);
    setLoadingRows(false);
    if (!res.ok || !res.data) {
      setNotice({ tone: "bad", text: res.error || "The player list could not be loaded" });
      setRows([]);
      return;
    }
    setScale(res.data.scale);
    setRows(
      res.data.players.map((player) => ({
        rank: player.rank,
        name: player.name,
        matchedName: player.matchedName,
        umbId: player.umbId ?? "",
        position: "",
      })),
    );
  }, []);

  useEffect(() => {
    if (ready && season) void loadPlayers(season);
  }, [ready, season, loadPlayers]);

  const seasons = useMemo(
    () => edition?.categories.find((category) => category.slug === SLUG)?.seasons ?? [],
    [edition],
  );
  const categoryLabel = edition?.categories.find((category) => category.slug === SLUG)?.categoryLabel ?? "Individual";

  const positioned = rows.filter((row) => row.position);

  // Οι θέσεις ΕΠΑΝΑΛΑΜΒΑΝΟΝΤΑΙ κανονικά (πόντοι ανά ζώνη: 3-4, 5-8, 9-16…), γι' αυτό
  // το αποτέλεσμα του ελέγχου αντιστοιχίζεται στη γραμμή με το ΟΝΟΜΑ και όχι με τη θέση.
  const checkByName = useMemo(() => {
    const map = new Map<string, CheckResult["rows"][number]>();
    (check?.rows ?? []).forEach((row) => {
      const key = (row.name ?? "").trim().toUpperCase();
      if (key && !map.has(key)) map.set(key, row);
    });
    return map;
  }, [check]);

  // --- «Έξυπνη» αναζήτηση στη λίστα των αθλητών ---------------------------------
  // Γράφεις π.χ. «polat», «yuksel polat» ή «3062»: φιλτράρεται η λίστα και με Enter
  // πας κατευθείαν στο πεδίο της θέσης. Μόλις βάλεις θέση, η αναζήτηση καθαρίζει
  // για τον επόμενο αθλητή.
  const terms = useMemo(() => searchTerms(search), [search]);

  const matches = useMemo(() => {
    if (!terms.length) return rows.map((_, index) => index);
    return rows.reduce<number[]>((acc, row, index) => {
      const haystack = playerHaystack(row.name, row.matchedName, row.umbId);
      if (matchesAll(haystack, terms)) acc.push(index);
      return acc;
    }, []);
  }, [rows, terms]);

  const visibleIndices = terms.length ? matches : rows.map((_, index) => index);
  const activeIndex = matches.length ? Math.min(activeMatch, matches.length - 1) : 0;
  const activeRow = terms.length && matches.length ? rows[matches[activeIndex]] : null;

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

  function sentName(row: GridRow) {
    return (row.matchedName || row.name || "").trim();
  }

  function setPosition(index: number, value: string) {
    const clean = value.replace(/[^0-9]/g, "").slice(0, 3);
    setRows((current) => current.map((row, i) => (i === index ? { ...row, position: clean } : row)));
  }

  function setUmb(index: number, value: string) {
    const clean = value.replace(/[^0-9]/g, "").slice(0, 4);
    setRows((current) => current.map((row, i) => (i === index ? { ...row, umbId: clean } : row)));
  }

  function clearPositions() {
    setRows((current) => current.map((row) => ({ ...row, position: "" })));
    setCheck(null);
    setProblems([]);
  }

  /** Προσθήκη αθλητή που δεν είναι στη λίστα μας (η CEB λίστα δεν είναι πλήρης). */
  function addRow() {
    setRows((current) => [
      ...current,
      { rank: null, name: "", matchedName: null, umbId: "", position: "" },
    ]);
    setCheck(null);
  }

  function setName(index: number, value: string) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, name: value } : row)));
    setCheck(null);
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, i) => i !== index));
    setCheck(null);
  }

  function payloadRows() {
    return positioned.map((row) => ({
      position: Number(row.position),
      name: row.matchedName || row.name,
      umbId: row.umbId || null,
    }));
  }

  async function runCheck() {
    if (positioned.length === 0) {
      setNotice({ tone: "bad", text: "No positions filled yet." });
      return;
    }
    if (positioned.some((row) => !sentName(row))) {
      setNotice({ tone: "bad", text: "A row has no player name — fill it or remove the row." });
      return;
    }
    setChecking(true);
    setNotice(null);
    const res = await portalFetch<CheckResult>("rows/check", {
      method: "POST",
      body: { slug: SLUG, season, rows: payloadRows() },
    });
    setChecking(false);
    if (!res.ok || !res.data) {
      setNotice({ tone: "bad", text: res.error || "The check did not finish" });
      return;
    }
    setCheck(res.data);
    setProblems(res.data.problems ?? []);
    if ((res.data.problems ?? []).length > 0) {
      setNotice({ tone: "bad", text: `Problems found: ${(res.data.problems ?? []).slice(0, 3).join(" · ")}` });
      return;
    }
    const counts = res.data.counts;
    setNotice({
      tone: counts.notFound + counts.ambiguous > 0 ? "info" : "ok",
      text: `${counts.rows} rows checked · ${counts.matched} matched to a player of ours · ${counts.ambiguous} names to confirm · ${counts.notFound} players we will add. You can submit — a missing UMB ID is not a problem.`,
    });
  }

  async function submit() {
    if (positioned.some((row) => !sentName(row))) {
      setNotice({ tone: "bad", text: "A row has no player name — fill it or remove the row." });
      return;
    }
    setSubmitting(true);
    setNotice(null);
    const res = await portalFetch<PortalSubmission>("submissions", {
      method: "POST",
      body: { slug: SLUG, season, rows: payloadRows() },
    });
    setSubmitting(false);
    if (!res.ok || !res.data) {
      setNotice({ tone: "bad", text: res.error || "The submission was not stored" });
      return;
    }
    setCebNotified(Boolean(res.meta?.mail?.delivered));
    setDone(res.data);
  }

  if (!ready) {
    return (
      <div className="fedmock">
        <div className="card">Loading…</div>
      </div>
    );
  }

  return (
    <div className="fedmock">
      <div className="row between" style={{ marginBottom: 14 }}>
        <div className="row">
          <span className="chip plain">
            {context?.countryName ?? "—"} ({context?.countryCode ?? "—"}){" "}
            <span className="lock">locked to your account</span>
          </span>
          <span className="chip plain">{categoryLabel}</span>
          {edition?.edition && <span className="chip plain">CEB edition {edition.edition}</span>}
        </div>
        <div className="row">
          <Link href="/federation/submissions">
            <button type="button">My submissions</button>
          </Link>
          <button
            type="button"
            onClick={() => {
              clearSession();
              router.replace("/federation/login");
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <section className="card tight">
        <div className="row between">
          <div>
            <div className="eyebrow">New submission</div>
            <h2>{context?.federation?.name ?? "Your federation"}</h2>
            <p className="muted">
              Country <b>{context?.countryName} ({context?.countryCode})</b> · {categoryLabel}
              {edition?.updatedAt ? <> · published edition updated {edition.updatedAt}</> : null}
            </p>
          </div>
          <div className="row">
            <span className="lock">Season</span>
            <select value={season} style={{ width: 300 }} onChange={(event) => setSeason(event.target.value)}>
              {seasons.map((item) => (
                <option key={item.season} value={item.season}>
                  {item.label || item.season}
                </option>
              ))}
              {season && !seasons.some((item) => item.season === season) && (
                <option value={season}>{season}</option>
              )}
            </select>
          </div>
        </div>
        <p className="foot">
          Only one season counts per player. The list comes from the <b>current CEB edition</b> — when a new season
          opens it appears here by itself. You are submitting <b>{season || "—"}</b>; players who did not take part stay
          without a position.
        </p>
        {scale && scale.length > 0 && <p className="foot">Points come from the position: {scaleText(scale)}.</p>}
      </section>


      <section className="card">
        <div className="row between" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Enter the positions, check and submit</h3>
          <div className="row">
            <button type="button" onClick={addRow}>
              + Add a player
            </button>
            <button type="button" onClick={clearPositions}>
              Clear positions
            </button>
          </div>
        </div>

        <div className="row between" style={{ marginBottom: 12 }}>
          <span className="lock">
            {positioned.length
              ? `${positioned.length} players with a position — check, then submit.`
              : "No positions filled yet — type a position in the grid below."}
          </span>
          <div className="row">
            <button type="button" onClick={runCheck} disabled={checking || positioned.length === 0}>
              {checking ? "Checking…" : "Check rows"}
            </button>
            <button
              className="primary"
              type="button"
              onClick={submit}
              disabled={submitting || positioned.length === 0}
            >
              {submitting ? "Submitting…" : "Submit for review"}
            </button>
          </div>
        </div>

        <div className="bars">
          <div className="stat">
            <span>Positioned</span>
            <b>{positioned.length}</b>
          </div>
          <div className="stat">
            <span>Players in list</span>
            <b>{rows.length}</b>
          </div>
          <div className="stat">
            <span>UMB ID known</span>
            <b>{rows.filter((row) => row.position && row.umbId).length}</b>
          </div>
          <div className="stat">
            <span>To confirm</span>
            <b>
              {check ? (check.counts.notFound ?? 0) + (check.counts.ambiguous ?? 0) + (check.counts.manual ?? 0) : 0}
            </b>
          </div>
        </div>

        {notice && <div className={`msg ${notice.tone}`}>{notice.text}</div>}
        {problems.length > 0 && <div className="msg bad">{problems.slice(0, 6).join(" · ")}</div>}

        <div className="searchbar">
          <input
            ref={searchRef}
            type="search"
            autoComplete="off"
            aria-label="Search a player by surname, first name or UMB ID"
            placeholder="Search a player — surname, first name or UMB ID…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setActiveMatch(0);
            }}
            onKeyDown={handleSearchKeyDown}
          />
          <span className="lock searchcount">
            {terms.length === 0 ? (
              <>
                Type a surname, a first name or a UMB ID — any order. ↓ ↑ picks, Enter jumps straight to that
                player&apos;s position.
              </>
            ) : matches.length === 0 ? (
              <>No player matches “{search}” — check the spelling, or add the player with “+ Add a player”.</>
            ) : (
              <>
                <b>
                  {matches.length} of {rows.length}
                </b>{" "}
                {matches.length === 1 ? "player matches" : "players match"}
                {" · "}
                {matches.length > 1
                  ? "↓ ↑ to pick · Enter jumps to that player"
                  : "Enter jumps to their position field"}
              </>
            )}
          </span>
        </div>

        {activeRow && (
          <div className="lock" style={{ marginBottom: 8 }}>
            Selected: <b>{activeRow.name}</b>
            {activeRow.umbId ? ` · UMB ID ${activeRow.umbId}` : ""}
            {activeRow.position ? ` · position ${activeRow.position} (type a new one to change it)` : ""}
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
                  UMB ID<span className="sub">optional — if you have it</span>
                </th>
                <th>
                  Position<span className="sub">what you fill</span>
                </th>
                <th>
                  Points<span className="sub">auto</span>
                </th>
                <th>
                  Check<span className="sub">after you press check</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loadingRows && (
                <tr>
                  <td colSpan={6} className="muted">
                    Loading the players of your country…
                  </td>
                </tr>
              )}
              {!loadingRows && terms.length > 0 && matches.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    No player matches “{search}” — check the spelling, or add the player with “+ Add a player”.
                  </td>
                </tr>
              )}
              {!loadingRows &&
                visibleIndices.map((index) => {
                  const row = rows[index];
                  const isActive = terms.length > 0 && matches[activeIndex] === index;
                  const position = Number(row.position);
                  const isNew = row.rank === null;
                  const result = row.position ? checkByName.get(sentName(row).toUpperCase()) : undefined;
                  const points = row.position
                    ? result?.points ?? pointsForPosition(position, scale)
                    : 0;
                  const chipClass = !row.position
                    ? "plain"
                    : result
                      ? result.matchStatus === "matched"
                        ? "ok"
                        : "warn"
                      : "plain";
                  const chipText = !row.position
                    ? "—"
                    : result
                      ? result.matchStatus === "matched"
                        ? "Matched"
                        : result.matchStatus === "ambiguous"
                          ? "Check the name"
                          : "We add the player"
                      : row.umbId
                        ? "Ready"
                        : "By name";
                  return (
                    <tr
                      key={`${row.name}-${index}`}
                      className={[row.position ? "done" : "", isActive ? "active" : ""].filter(Boolean).join(" ")}
                    >
                      <td className="num muted">{row.rank ?? "—"}</td>
                      <td>
                        {isNew ? (
                          <span className="row" style={{ gap: 6 }}>
                            <input
                              className="idbox"
                              style={{ width: 190 }}
                              placeholder="Player name"
                              value={row.name}
                              onChange={(event) => setName(index, event.target.value)}
                            />
                            <button type="button" title="Remove this row" onClick={() => removeRow(index)}>
                              ×
                            </button>
                          </span>
                        ) : (
                          <>
                            <b>{row.name}</b>
                            {row.matchedName && row.matchedName.toUpperCase() !== row.name.toUpperCase() && (
                              <span className="lock"> · in our database: {row.matchedName}</span>
                            )}
                          </>
                        )}
                      </td>
                      <td>
                        {isNew ? (
                          <input
                            className="idbox"
                            inputMode="numeric"
                            placeholder="0"
                            title="UMB ID — optional; a row without one is matched by name"
                            value={row.umbId}
                            onChange={(event) => setUmb(index, event.target.value)}
                          />
                        ) : (
                          <span className="lock" title="UMB ID — pre-filled, you do not type it">
                            {row.umbId || "—"}
                          </span>
                        )}
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

        <p className="foot">
          Not every player has a UMB ID — <b>it is optional</b>. A row without one is matched by name, and if a name is
          not in our list yet we add the player ourselves before publishing. Nothing is refused for a missing UMB ID.
        </p>

      </section>


      <section className="card tight">
        <h3>What happens next</h3>
        <div className="steps">
          <div className="step">
            <b>1 · You submit</b>
            <p>The list is stored with your name and the time.</p>
          </div>
          <div className="step">
            <b>2 · We check</b>
            <p>The names and UMB IDs are already filled in — only the positions come from you.</p>
          </div>
          <div className="step">
            <b>3 · It is published</b>
            <p>Your national column joins the next CEB ranking edition — and the previous edition stays online.</p>
          </div>
        </div>
      </section>

      {done && (
        <div className="modal">
          <div className="card">
            <div className="eyebrow">Submitted</div>
            <h2>Sent for review</h2>
            <p className="muted">
              <b>
                {context?.federation?.name} ({context?.countryCode})
              </b>{" "}
              · {categoryLabel} · season <b>{done.season}</b>
              <br />
              {done.rowCount} players with a position, {done.matchedCount} of them matched to a player of ours. Stored as{" "}
              <span className="chip warn">In review</span> — the CEB list is not touched until we approve it.
              {cebNotified && (
                <>
                  <br />
                  The CEB office has been notified by email and will check your list.
                </>
              )}
            </p>
            <div className="row between" style={{ marginTop: 16 }}>
              <span className="lock">You can come back and resubmit until we approve it.</span>
              <Link href="/federation/submissions">
                <button className="primary" type="button">
                  Back to my submissions
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
