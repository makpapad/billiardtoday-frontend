import type { Metadata } from "next";
import { buildDefaultOpenGraphImage, SITE_URL } from "@/lib/socialMetadata";

/** Το κείμενο του title, είτε δόθηκε ως string είτε ως `{ absolute }`. */
const titleText = (title: string | { absolute: string }): string =>
  typeof title === "string" ? title : title.absolute;

export const buildPageMetadata = ({
  title,
  description,
  path,
  keywords,
  robots,
}: {
  /** Απλό κείμενο → μπαίνει το template «%s | Billiard Today». `{ absolute }` → όπως είναι. */
  title: string | { absolute: string };
  description: string;
  path: `/${string}`;
  keywords?: string[];
  /** Όταν δίνεται, μπαίνει ως `<meta name="robots">` (π.χ. noindex σε λεπτά προφίλ). */
  robots?: Metadata["robots"];
}): Metadata => {
  const image = buildDefaultOpenGraphImage(titleText(title));
  const url = `${SITE_URL}${path}`;

  return {
    title,
    description,
    keywords,
    ...(robots ? { robots } : {}),
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      // Το site είναι αγγλόφωνο (billiardtoday.com = GLOBAL). Το el_GR δήλωνε ελληνικό
      // locale σε κάθε αγγλική σελίδα — λάθος σήμα για τη Google και για τα social cards.
      locale: "en_US",
      url,
      siteName: "Billiard Today",
      title: titleText(title),
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: titleText(title),
      description,
      images: [String(image.url)],
    },
  };
};
