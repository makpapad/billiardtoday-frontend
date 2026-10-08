"use client";

import { reportCebPdfClick } from "@/lib/embedLinks";

type Props = {
  /** Απόλυτο URL του επίσημου PDF της CEB (από το `public/data/ceb-ranking/index.json`). */
  href: string;
  /** Η κατηγορία της κατάταξης — στέλνεται στο GA4 μαζί με το κλικ. */
  label: string;
  /** GA4 campaign, ώστε να ξεχωρίζει η κίνηση που έρχεται μέσα από το embed. */
  campaign?: string;
  className?: string;
};

/**
 * «Official CEB ranking (PDF)» — σύνδεσμος προς το επίσημο έγγραφο της CEB για τις
 * κατατάξεις που δεν έχουν ακόμη χτιστεί στο BilliardToday. Ανοίγει σε νέα καρτέλα
 * και μετρά το κλικ στο GA4· client component μόνο και μόνο για το `onClick`.
 */
export function OfficialCebPdfLink({ href, label, campaign, className }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => reportCebPdfClick(label, campaign)}
      className={className}
    >
      Official CEB ranking (PDF)
    </a>
  );
}
