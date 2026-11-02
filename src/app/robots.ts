import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://billiardtoday.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: ["facebookexternalhit", "Facebot", "meta-externalagent"],
        allow: "/",
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/account/",
          "/account-access/",
          "/admin/",
          "/api/",
          "/claim",
          "/embed/",
          "/enroll",
          "/link-device",
          "/live/remote",
          "/me",
          "/presence",
          "/scoreboards",
          "/test",
          // Εσωτερικά endpoints που τροφοδοτούν το client UI. Η Google τα ζητούσε
          // (76 αιτήματα σε 35 ημέρες, μετρήθηκε 02/11/2026) χωρίς κανένα όφελος —
          // δεν είναι σελίδες, δεν έχουν περιεχόμενο για ευρετήριο.
          "/event-data/",
          // Υπολείμματα του παλιού WordPress: 404 σε όλα, μόνο σπατάλη crawl.
          "/wp/",
          "/wp-content/",
          "/wp-includes/",
          "/wp-json/",
          "/wordpress/",
          "/xmlrpc.php",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
