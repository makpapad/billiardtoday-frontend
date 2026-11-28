import { Suspense } from "react";
import type { Metadata } from "next";

import { YoutubeLiveContent } from "@/components/live/YoutubeLiveContent";
import { resolveLiveWallVideoIds } from "@/lib/tournaments";

// Client component με `useSearchParams()` — χωρίς Suspense/force-dynamic το build
// σκάει στο prerender. Το force-dynamic είναι απαραίτητο και για τα βίντεο: η
// λίστα διαβάζεται σε ΚΑΘΕ φόρτωση του πλαισίου, όχι μία φορά στο build.
export const dynamic = "force-dynamic";

/**
 * Μέσα στο πλαίσιο δεν θέλουμε ευρετήριο: η ίδια σελίδα ζει δημόσια στο
 * /tournaments/live/youtube, οπότε μια δεύτερη διεύθυνση με το ίδιο περιεχόμενο
 * θα ήταν διπλότυπο για τη Google. Ίδιος κανόνας με τις άλλες embed σελίδες.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const readParam = (value: string | string[] | undefined): string | null => {
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = typeof first === "string" ? first.trim() : "";
  return trimmed || null;
};

/**
 * Ο τοίχος βίντεο ΜΕΣΑ στο πλαίσιο (/embed/tournaments/live/youtube).
 *
 * Ίδιο component με τη δημόσια σελίδα, αλλά χωρίς AppSiteShell (το
 * src/app/embed/layout.tsx δεν έχει header/footer και φορτώνει το EmbedAutoHeight)
 * και με `fitViewport={false}` ώστε να μην υπάρχει κανένα 100dvh: μέσα σε iframe το
 * ύψος ορίζεται από το postMessage, όχι από την οθόνη.
 * Το «Back to event» επιστρέφει στο /embed/tournaments/<slug> (returnTo).
 *
 * ΤΑ ΒΙΝΤΕΟ ΔΕΝ ΕΡΧΟΝΤΑΙ ΑΠΟ ΤΟ `videos=` ΤΟΥ IFRAME. Η σελίδα της ομοσπονδίας
 * (eurobillard.org) έχει το `videos=` γραμμένο μία φορά, άρα όταν αλλάζουν τα links
 * στον admin το πλαίσιο θα έδειχνε για πάντα τα χθεσινά. Από το `returnTo` βγαίνει
 * ποια διοργάνωση είναι, και τα τρέχοντα YouTube IDs διαβάζονται από τη Strapi
 * (liveButton.href). Αν η διοργάνωση δεν έχει τρέχον «Live video», μένει το `videos=`
 * ως εφεδρική τιμή — έτσι το ίδιο URL δουλεύει και σε πλαίσια χωρίς διοργάνωση.
 */
export default async function EmbedYoutubeLivePage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const liveVideoIds = await resolveLiveWallVideoIds(readParam(params.returnTo)).catch(
    () => [] as string[],
  );

  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black text-white">
          Loading...
        </main>
      }
    >
      <YoutubeLiveContent fitViewport={false} liveVideoIds={liveVideoIds} />
    </Suspense>
  );
}