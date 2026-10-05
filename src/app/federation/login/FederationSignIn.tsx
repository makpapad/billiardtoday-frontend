"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "../preview/mockup.css";
import { FederationContext, portalFetch, readSession, saveSession } from "@/lib/federationPortal";

export function FederationSignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { token } = readSession();
    if (token) router.replace("/federation/submit");
  }, [router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const res = await portalFetch<FederationContext>("login", {
      method: "POST",
      body: { email, password },
    });
    setBusy(false);

    if (!res.ok || !res.data) {
      setError(res.error || "Sign in failed");
      return;
    }

    const token = typeof res.meta?.jwt === "string" ? res.meta.jwt : null;
    if (!token) {
      setError("Sign in failed — try again");
      return;
    }
    saveSession(token, res.data);
    router.replace("/federation/submit");
  }

  return (
    <div className="fedmock">
      <section className="card narrow">
        <div className="eyebrow">BilliardToday · Federations</div>
        <h1>National ranking submission</h1>
        <p className="muted">
          Enter the finishing positions of your national championship. BilliardToday turns them into CEB ranking
          points — one season per player. A UMB ID helps, but it is not required.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: 18 }}>
          <label htmlFor="fed-email">Email</label>
          <input
            id="fed-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label htmlFor="fed-password">Password</label>
          <input
            id="fed-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {error && <div className="msg bad">{error}</div>}

          <div className="row between" style={{ marginTop: 16 }}>
            <span className="lock">Forgot your password? Write to us and we reset it.</span>
            <button className="primary" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>

        <div className="msg info" style={{ marginTop: 18 }}>
          <b>Federation accounts are created by BilliardToday.</b> Each account is tied to one federation, so the
          country is fixed from the first minute. If your federation needs access, write to us from the email of the
          federation and we will set it up.
        </div>

        <p className="foot" style={{ marginTop: 14 }}>
          Player looking for your own results? <Link href="/account">Player accounts</Link> are here.
        </p>
      </section>
    </div>
  );
}
