"use client";

import { useCallback, useEffect, useState } from "react";
import DeskClient from "./DeskClient";
import DeskConsole, { type Schedule } from "./DeskConsole";

type Me = {
  assignment: { id: number; displayName?: string | null; scope?: string | null };
  tournament?: { documentId: string; title?: string | null } | null;
};

const TOKEN_KEY = "desk.token";

/** Η κονσόλα εμφανίζεται σε πλατιά οθόνη· το κινητό κρατά τη ροή του τηλεφώνου. */
function useWideScreen(): boolean | null {
  const [wide, setWide] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return wide;
}

async function deskApi<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
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

export default function DeskShell() {
  const wide = useWideScreen();
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async () => {
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) {
      setError("Γράψε τον κωδικό του χειριστή");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await deskApi<{ data: Me; meta: { token: string } }>("/api/desk/login", null, {
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
  }, []);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(TOKEN_KEY);
    if (!stored) return;
    setToken(stored);
    deskApi<{ data: Me }>("/api/desk/me", stored)
      .then((res) => setMe(res.data))
      .catch(() => {
        window.sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
      });
  }, []);

  useEffect(() => {
    if (!token) return;
    deskApi<{ data: Schedule }>("/api/desk/schedule", token)
      .then((res) => setSchedule(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Το πρόγραμμα δεν φορτώθηκε"));
  }, [token]);

  /* Το κινητό κρατά την υπάρχουσα ροή (δικό του login + οθόνες). */
  if (wide === false) return <DeskClient />;

  if (wide === null) return <div style={{ minHeight: "100dvh", background: "#0a0d12" }} />;

  if (!token || !me) {
    return (
      <main className="min-h-[100dvh] bg-[#0b0f14] px-4 py-10 text-slate-100">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-lg font-semibold tracking-wide">Event Desk</h1>
          <p className="mt-1 text-xs text-slate-400">Γράψε τον 6ψήφιο κωδικό που σου έδωσε ο σύλλογος.</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
            onKeyDown={(e) => {
              if (e.key === "Enter") void login();
            }}
            autoCapitalize="characters"
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

  if (!schedule) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#0a0d12] text-sm text-slate-400">
        Φόρτωση προγράμματος…
      </main>
    );
  }

  return (
    <DeskConsole
      token={token}
      schedule={schedule}
      operatorName={me.assignment?.displayName || "Χειριστής"}
      onLogout={logout}
    />
  );
}
