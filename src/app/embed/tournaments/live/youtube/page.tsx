import { Suspense } from "react";
import type { Metadata } from "next";

import { YoutubeLiveContent } from "@/components/live/YoutubeLiveContent";

// Client component με `useSearchParams()` — χωρίς Suspense/force-dynamic το build
// σκάει στο prerender.
export const dynamic = "force-dynamic";

/**
 * Μέσα στο πλαίσιο δεν θέλουμε ευρετήριο: η ίδια σελίδα ζει δημόσια στο
 * /tournaments/live/youtube, οπότε μια δεύτερη διεύθυνση με το ίδιο περιεχόμενο
 * θα ήταν διπλότυπο για τη Google. Ίδιος κανόνας με τις άλλες embed σελίδες.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Ο τοίχος βίντεο ΜΕΣΑ στο πλαίσιο (/embed/tournaments/live/youtube).
 *
 * Ίδιο component με τη δημόσια σελίδα, αλλά χωρίς AppSiteShell (το
 * src/app/embed/layout.tsx δεν έχει header/footer και φορτώνει το EmbedAutoHeight)
 * και με `fitViewport={false}` ώστε να μην υπάρχει κανένα 100dvh: μέσα σε iframe το
 * ύψος ορίζεται από το postMessage, όχι από την οθόνη.
 * Το «Back to event» επιστρέφει στο /embed/tournaments/<slug> (returnTo).
 */
export default function EmbedYoutubeLivePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black text-white">
          Loading...
        </main>
      }
    >
      <YoutubeLiveContent fitViewport={false} />
    </Suspense>
  );
}
