"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

/**
 * Το μενού της δημόσιας σελίδας ομοσπονδίας: Affiliated Clubs · Rankings ·
 * Individual · Team. Η επιλογή ζει στο URL (`?view=…`) ώστε να μοιράζεται σαν
 * σύνδεσμος, και αλλάζει με `history.replaceState` — όχι με router navigation,
 * που θα ξαναέτρεχε το server fetch της σελίδας σε κάθε κλικ.
 */

export type FederationTabKey = "clubs" | "rankings" | "individual" | "team";

export type FederationTab = {
  key: FederationTabKey;
  label: string;
  content: ReactNode;
};

type Props = {
  tabs: FederationTab[];
  defaultKey: FederationTabKey;
  /** Παράμετρος URL που κρατά την επιλογή (προεπιλογή `view`). */
  param?: string;
};

export function FederationPageTabs({ tabs, defaultKey, param = "view" }: Props) {
  const [active, setActive] = useState<FederationTabKey>(defaultKey);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const requested = new URL(window.location.href).searchParams.get(param);
    if (requested && tabs.some((tab) => tab.key === requested)) {
      setActive(requested as FederationTabKey);
    }
    // Μόνο στην πρώτη φόρτωση: μετά το κλικ το state είναι η αλήθεια και το URL
    // συγχρονίζεται από το `select`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = useCallback(
    (key: FederationTabKey) => {
      setActive(key);
      const url = new URL(window.location.href);
      if (key === defaultKey) url.searchParams.delete(param);
      else url.searchParams.set(param, key);
      window.history.replaceState(window.history.state, "", url.toString());
    },
    [defaultKey, param],
  );

  const activeTab = tabs.find((tab) => tab.key === active) ?? tabs[0];
  if (!activeTab) return null;

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-[1320px] px-4 pt-2 sm:px-6">
        <div
          role="tablist"
          aria-label="Federation sections"
          className="flex flex-wrap items-center gap-1 rounded-2xl border border-black/5 bg-white p-1 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
        >
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => select(tab.key)}
                className={
                  isActive
                    ? "rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors"
                    : "rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel" aria-label={activeTab.label}>
        {activeTab.content}
      </div>
    </div>
  );
}
