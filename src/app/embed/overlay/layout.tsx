import type { ReactNode } from "react";

/**
 * Overlays (τηλεοπτική προβολή σε οθόνες γηπέδου): καθαρή εικόνα, χωρίς
 * αναφορές, χωρίς περιθώρια. Καταργεί την αναφορά του /embed/layout.tsx.
 */
export default function EmbedOverlayLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
