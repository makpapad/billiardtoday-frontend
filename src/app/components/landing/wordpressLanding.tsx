"use client";

import { createContext, useContext } from "react";
import type { WordpressLandingData } from "@/lib/wordpress";

const WordpressLandingContext = createContext<WordpressLandingData | null>(null);

export function WordpressLandingProvider({
  value,
  children,
}: {
  value: WordpressLandingData | null;
  children: React.ReactNode;
}) {
  return (
    <WordpressLandingContext.Provider value={value}>
      {children}
    </WordpressLandingContext.Provider>
  );
}

export function useWordpressLanding(): WordpressLandingData | null {
  return useContext(WordpressLandingContext);
}
