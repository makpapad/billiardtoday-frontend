import type { MetadataRoute } from "next";

/**
 * Web app manifest — απαραίτητο για push notifications (και για «Add to Home
 * Screen» στο iPhone, που είναι ο μόνος τρόπος να δουλέψει εκεί το push).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Billiard Today",
    short_name: "BilliardToday",
    description:
      "Tournaments, live scores, draws and results from the world of carom billiards.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/logo-billiardtoday.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo-billiardtoday.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
