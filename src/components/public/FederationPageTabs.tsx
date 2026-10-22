"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";

/**
 * Το μενού της δημόσιας σελίδας ομοσπονδίας: Affiliated Clubs · Rankings ·
 * Individual · Team.
 *
 * Το μενού κάθεται ΜΕΣΑ στο hero (δίπλα στα κουμπιά του hero) και τα περιεχόμενα
 * των καρτελών αποδίδονται κάτω από το hero — δύο ξεχωριστά κομμάτια. Η επιλογή
 * είναι λοιπόν μία για όλους: ζει στο URL (`?view=…`) και ανακοινώνεται με ένα
 * custom event, ώστε μενού και περιεχόμενα να μένουν συγχρονισμένα χωρίς navigation
 * (το navigation θα ξαναέτρεχε το server fetch της σελίδας σε κάθε κλικ).
 */

export type FederationTabKey = "clubs" | "rankings" | "individual" | "team";

export type FederationMenuTab = {
  key: FederationTabKey;
  label: string;
};

export type FederationTab = FederationMenuTab & { content: ReactNode };

const VIEW_EVENT = "bt:federation-view";
const DEFAULT_PARAM = "view";

const readView = (param: string): string | null => {
  if (typeof window === "undefined") return null;
  return new URL(window.location.href).searchParams.get(param);
};

const writeView = (param: string, key: string, defaultKey: string) => {
  const url = new URL(window.location.href);
  if (key === defaultKey) url.searchParams.delete(param);
  else url.searchParams.set(param, key);
  window.history.replaceState(window.history.state, "", url.toString());
};

function useFederationView(keys: string[], defaultKey: string, param: string) {
  const sourceId = useId();
  const [active, setActive] = useState<string>(defaultKey);
  const keysSignature = keys.join("|");

  // Η πρώτη φόρτωση σέβεται το ?view= του συνδέσμου.
  useEffect(() => {
    const requested = readView(param);
    if (requested && keys.includes(requested)) setActive(requested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const allowed = keysSignature ? keysSignature.split("|") : [];
    const onSelect = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string; sourceId?: string }>).detail;
      if (!detail?.key || detail.sourceId === sourceId) return;
      if (allowed.includes(detail.key)) setActive(detail.key);
    };
    const onHistory = () => {
      const requested = readView(param);
      setActive(requested && allowed.includes(requested) ? requested : defaultKey);
    };
    window.addEventListener(VIEW_EVENT, onSelect);
    window.addEventListener("popstate", onHistory);
    return () => {
      window.removeEventListener(VIEW_EVENT, onSelect);
      window.removeEventListener("popstate", onHistory);
    };
  }, [defaultKey, keysSignature, param, sourceId]);

  const select = useCallback(
    (key: string) => {
      setActive(key);
      writeView(param, key, defaultKey);
      window.dispatchEvent(new CustomEvent(VIEW_EVENT, { detail: { key, sourceId } }));
    },
    [defaultKey, param, sourceId],
  );

  return { active, select };
}

/** Οι καρτέλες μέσα στο hero — ίδια θέση με το μενού της σελίδας τουρνουά. */
export function FederationHeroMenu({
  tabs,
  defaultKey,
  param = DEFAULT_PARAM,
}: {
  tabs: FederationMenuTab[];
  defaultKey: string;
  param?: string;
}) {
  const { active, select } = useFederationView(
    tabs.map((tab) => tab.key),
    defaultKey,
    param,
  );

  if (tabs.length < 2) return null;

  return (
    <div
      role="tablist"
      aria-label="Federation sections"
      className="flex flex-wrap items-center gap-2"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => select(tab.key)}
            className={
              isActive
                ? "rounded-full bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-950 transition"
                : "rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/72 transition hover:bg-white/15 hover:text-white"
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/** Το περιεχόμενο της ενεργής καρτέλας, κάτω από το hero. */
export function FederationPanels({
  tabs,
  defaultKey,
  param = DEFAULT_PARAM,
}: {
  tabs: FederationTab[];
  defaultKey: string;
  param?: string;
}) {
  const { active } = useFederationView(
    tabs.map((tab) => tab.key),
    defaultKey,
    param,
  );

  const activeTab = tabs.find((tab) => tab.key === active) ?? tabs[0];
  if (!activeTab) return null;

  return (
    <div role="tabpanel" aria-label={activeTab.label}>
      {activeTab.content}
    </div>
  );
}
