"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Server-rendered «σπόρος» για τη λίστα τουρνουά.
 *
 * ΓΙΑΤΙ: το `TournamentListSection` είναι client component και φορτώνει τα
 * τουρνουά από το `/api/tournaments` μετά το hydration. Ο crawler έβλεπε άδεια
 * λίστα («No tournaments found») και κανέναν σύνδεσμο προς τα τουρνουά.
 *
 * Ο server στέλνει την πρώτη σελίδα μαζί με το HTML· το component τη
 * χρησιμοποιεί ως αρχική κατάσταση και ΔΕΝ κάνει το πρώτο fetch (μόνο όταν ο
 * χρήστης αλλάξει σελίδα/φίλτρα).
 */
export type TournamentListSeed = {
  data: unknown[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
};

const TournamentListSeedContext = createContext<TournamentListSeed | null>(null);

export function TournamentListSeedProvider({
  seed,
  children,
}: {
  seed: TournamentListSeed | null;
  children: ReactNode;
}) {
  return (
    <TournamentListSeedContext.Provider value={seed}>
      {children}
    </TournamentListSeedContext.Provider>
  );
}

export const useTournamentListSeed = (): TournamentListSeed | null =>
  useContext(TournamentListSeedContext);
