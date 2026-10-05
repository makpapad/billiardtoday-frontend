"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "../preview/mockup.css";
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
  const duplicates = useMemo(() => {
    const seen = new Set<number>();
    const twice = new Set<number>();
    positioned.forEach((row) => {
      const position = Number(row.position);
      if (seen.has(position)) twice.add(position);
      else seen.add(position);
    });
    return twice;
  }, [positioned]);

  const checkByPosition = useMemo(() => {
    const map = new Map<number, CheckResult["rows"][number]>();
    (check?.rows ?? []).forEach((row) => map.set(row.position, row));
    return map;
  }, [check]);

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
    if (duplicates.size > 0) {
      setNotice({ tone: "bad", text: `Position ${[...duplicates].sort((a, b) => a - b).join(", ")} is used twice — fix it first.` });
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
              disabled={submitting || positioned.length === 0 || duplicates.size > 0}
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
              {[...duplicates].length +
                (check ? (check.counts.notFound ?? 0) + (check.counts.ambiguous ?? 0) + (check.counts.manual ?? 0) : 0)}
            </b>
          </div>
        </div>

        {notice && <div className={`msg ${notice.tone}`}>{notice.text}</div>}
        {problems.length > 0 && <div className="msg bad">{problems.slice(0, 6).join(" · ")}</div>}

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
              {!loadingRows &&
                rows.map((row, index) => {
                  const position = Number(row.position);
                  const isDuplicate = Boolean(row.position) && duplicates.has(position);
                  const result = row.position ? checkByPosition.get(position) : undefined;
                  const points = row.position
                    ? result?.points ?? pointsForPosition(position, scale)
                    : 0;
                  const chipClass = !row.position
                    ? "plain"
                    : isDuplicate
                      ? "bad"
                      : result
                        ? result.matchStatus === "matched"
                          ? "ok"
                          : "warn"
                        : "plain";
                  const chipText = !row.position
                    ? "—"
                    : isDuplicate
                      ? "Position twice"
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
                    <tr key={`${row.name}-${index}`} className={row.position ? (isDuplicate ? "flagged" : "done") : ""}>
                      <td className="num muted">{row.rank ?? "—"}</td>
                      <td>
                        <b>{row.name}</b>
                        {row.matchedName && row.matchedName.toUpperCase() !== row.name.toUpperCase() && (
                          <span className="lock"> · in our database: {row.matchedName}</span>
                        )}
                      </td>
                      <td>
                        <input
                          className="idbox"
                          inputMode="numeric"
                          placeholder="0"
                          title="UMB ID — optional; a row without one is matched by name"
                          value={row.umbId}
                          onChange={(event) => setUmb(index, event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="pos"
                          inputMode="numeric"
                          placeholder="—"
                          title="Finishing position in your national championship"
                          value={row.position}
                          onChange={(event) => setPosition(index, event.target.value)}
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
            <p>Every name by hand — the UMB ID where there is one; players new to us get added.</p>
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
