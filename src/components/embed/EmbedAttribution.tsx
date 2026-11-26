"use client";

import { usePathname } from "next/navigation";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://billiardtoday.com";

/**
 * Διακριτική αναφορά στο Billiard Today, κάτω δεξιά.
 *
 * Γιατί υπάρχει: κάθε σύλλογος/ομοσπονδία που ενσωματώνει widget δείχνει το
 * περιεχόμενό μας στη δική του σελίδα. Χωρίς σύνδεσμο επιστροφής, η Google βλέπει
 * το περιεχόμενο αλλά ποτέ την πηγή — και χάνονται σύνδεσμοι που ήδη κερδίζουμε.
 *
 * Δεν μπαίνει στα overlays (τηλεοπτική προβολή). Ο έλεγχος γίνεται εδώ, όχι σε
 * layout: τα nested layouts στο Next ΣΥΝΘΕΤΟΝΤΑΙ, άρα ένα child layout δεν αφαιρεί
 * ό,τι πρόσθεσε το γονικό.
 */
export function EmbedAttribution() {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/embed/overlay")) return null;

  return (
    <div
      data-bt-attribution=""
      style={{
        display: "flex",
        justifyContent: "flex-end",
        padding: "6px 10px 10px",
        fontSize: "11px",
        lineHeight: 1.2,
        opacity: 0.65,
      }}
    >
      <a
        href={`${SITE_URL}?utm_source=embed&utm_medium=widget&utm_campaign=powered_by`}
        target="_blank"
        rel="noopener"
        style={{ color: "inherit", textDecoration: "none" }}
      >
        Powered by Billiard Today
      </a>
    </div>
  );
}
