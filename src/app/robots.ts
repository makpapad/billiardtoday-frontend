import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://billiardtoday.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
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
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
