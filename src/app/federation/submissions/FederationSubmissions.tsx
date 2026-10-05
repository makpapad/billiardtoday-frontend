"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "../preview/mockup.css";
import {
  FederationContext,
  PortalSubmission,
  clearSession,
  formatDate,
  portalFetch,
  readSession,
  saveSession,
  statusLabel,
} from "@/lib/federationPortal";

type Message = { tone: "info" | "ok" | "bad"; text: string } | null;

export function FederationSubmissions() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [context, setContext] = useState<FederationContext | null>(null);
  const [submissions, setSubmissions] = useState<PortalSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Message>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await portalFetch<PortalSubmission[]>("submissions");
    setLoading(false);
    if (!res.ok) {
      if (res.status === 401) {
        clearSession();
        router.replace("/federation/login");
        return;
      }
      setNotice({ tone: "bad", text: res.error || "The submissions could not be loaded" });
      return;
    }
    setSubmissions(res.data ?? []);
  }, [router]);

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
      if (me.ok && me.data) {
        setContext(me.data);
        saveSession(token, me.data);
      } else if (me.status === 401) {
        clearSession();
        router.replace("/federation/login");
        return;
      }
      await load();
    })();
  }, [router, load]);

  async function withdraw(documentId: string) {
    setBusyId(documentId);
    setNotice(null);
    const res = await portalFetch<PortalSubmission>("submissions/withdraw", {
      method: "POST",
      body: { documentId },
    });
    setBusyId(null);
    if (!res.ok) {
      setNotice({ tone: "bad", text: res.error || "The submission was not withdrawn" });
      return;
    }
    setNotice({ tone: "ok", text: "The submission was withdrawn — you can send a new one for that season." });
    await load();
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
          {context?.accessRole && <span className="chip plain">{context.accessRole.replace(/_/g, " ")}</span>}
        </div>
        <div className="row">
          <Link href="/federation/submit">
            <button className="primary" type="button">
              New submission
            </button>
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

      <section className="card tight" style={{ marginBottom: 22 }}>
        <div className="eyebrow">Signed in</div>
        <h2>{context?.federation?.name ?? "Your federation"}</h2>
        <p className="muted">
          {context?.fullName ? <>{context.fullName} · </> : null}
          {context?.email} · {context?.countryName} ({context?.countryCode})
        </p>
      </section>

      <section className="card">
        <h3>My submissions</h3>
        {notice && <div className={`msg ${notice.tone}`}>{notice.text}</div>}
        {loading ? (
          <p className="muted">Loading…</p>
        ) : submissions.length === 0 ? (
          <p className="muted">
            Nothing submitted yet. Start with <Link href="/federation/submit">a new submission</Link>.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>
                  Season<span className="sub">the year that counts</span>
                </th>
                <th>Discipline</th>
                <th>
                  Players<span className="sub">with a position</span>
                </th>
                <th>
                  Submitted<span className="sub">or resent</span>
                </th>
                <th>
                  Status<span className="sub">what happens now</span>
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {submissions.map((row) => {
                const status = statusLabel(row.status);
                const canWithdraw = ["in-review", "draft", "rejected"].includes(row.status);
                return (
                  <tr key={row.documentId}>
                    <td className="num">{row.season}</td>
                    <td>{row.categoryLabel || "3-Cushion Individual"}</td>
                    <td className="num">
                      {row.rowCount ?? "—"}
                      {row.matchedCount !== null && row.matchedCount !== undefined ? (
                        <span className="lock"> · {row.matchedCount} matched</span>
                      ) : null}
                    </td>
                    <td>{formatDate(row.resubmittedAt || row.submittedAt)}</td>
                    <td>
                      <span className={`chip ${status.tone}`}>{status.text}</span>{" "}
                      {row.seasonOutsideEdition && <span className="lock">outside the current edition</span>}
                      {row.reviewNotes && <div className="lock">{row.reviewNotes}</div>}
                    </td>
                    <td>
                      {canWithdraw ? (
                        <button type="button" disabled={busyId === row.documentId} onClick={() => withdraw(row.documentId)}>
                          {busyId === row.documentId ? "…" : "Withdraw"}
                        </button>
                      ) : (
                        <span className="lock">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
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
    </div>
  );
}
