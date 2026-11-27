import { Suspense } from "react";

import { YoutubeLiveContent } from "@/components/live/YoutubeLiveContent";

// Client component με `useSearchParams()` — χωρίς αυτό το build σκάει στο prerender.
export const dynamic = "force-dynamic";

export default function YoutubeLivePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black text-white">
          Loading...
        </main>
      }
    >
      {/* fitViewport (default) = η σελίδα κλειδώνει στο ύψος της οθόνης μαζί με το
          AppSiteShell του layout.tsx. */}
      <YoutubeLiveContent />
    </Suspense>
  );
}
