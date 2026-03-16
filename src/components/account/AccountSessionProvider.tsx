"use client";

import React from "react";
import {
  usePlayerAccountSession,
  type PlayerAccountSessionState,
} from "@/components/account/PrivateAccountShell";

const AccountSessionContext = React.createContext<PlayerAccountSessionState | null>(null);

export function AccountSessionProvider({ children }: { children: React.ReactNode }) {
  const session = usePlayerAccountSession();
  return <AccountSessionContext.Provider value={session}>{children}</AccountSessionContext.Provider>;
}

export function useAccountSession() {
  const value = React.useContext(AccountSessionContext);
  if (!value) {
    throw new Error("useAccountSession must be used within AccountSessionProvider");
  }
  return value;
}
