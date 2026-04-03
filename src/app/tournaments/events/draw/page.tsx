"use client";

import { Suspense } from "react";
import DoubleElimDrawPage from "./DoubleElimDrawPage";

export default function TournamentEventsDrawPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading draw...</div>}>
      <DoubleElimDrawPage />
    </Suspense>
  );
}
