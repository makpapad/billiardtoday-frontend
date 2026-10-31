import type { Metadata } from "next";
import { buildDefaultOpenGraphImage, SITE_URL } from "@/lib/socialMetadata";

export const buildPageMetadata = ({
  title,
  description,
  path,
  keywords,
  robots,
}: {
  title: string;
  description: string;
  path: `/${string}`;
  keywords?: string[];
  /** Όταν δίνεται, μπαίνει ως `<meta name="robots">` (π.χ. noindex σε λεπτά προφίλ). */
  robots?: Metadata["robots"];
}): Metadata => {
  const image = buildDefaultOpenGraphImage(title);
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
      locale: "el_GR",
      url,
      siteName: "Billiard Today",
      title,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [String(image.url)],
    },
  };
};
