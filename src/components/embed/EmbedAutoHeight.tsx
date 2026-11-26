"use client";

import { useEffect } from "react";

/**
 * Αυτόματο ύψος για ενσωματωμένες προβολές (iframe).
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ: όταν μια σελίδα μας φιλοξενείται σε iframe (π.χ. στη σελίδα της
 * CEB), το ύψος του πλαισίου το ορίζει η εξωτερική σελίδα — δεν μπορεί να το
 * ξέρει. Χωρίς αυτό, ή κόβεται το περιεχόμενο ή μένει κενός χώρος από κάτω.
 *
 * ΤΙ ΚΑΝΕΙ: μετρά το πραγματικό ύψος του περιεχομένου και το στέλνει στη σελίδα
 * που μας φιλοξενεί με postMessage. Η εξωτερική σελίδα χρειάζεται έναν
 * listener (τον δίνουμε έτοιμο στον κώδικα ενσωμάτωσης). Αν δεν τον έχει βάλει,
 * το πλαίσιο μένει στο ύψος που όρισε — τίποτα δεν σπάει.
 *
 * Ξαναμετρά όταν αλλάζει το περιεχόμενο (live σκορ, αλλαγή φάσης) και κάθε 2
 * δευτερόλεπτα, γιατί τα live νούμερα αλλάζουν χωρίς να αλλάξει η διάταξη.
 */
export function EmbedAutoHeight() {
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;

    let lastHeight = 0;
    let debounce: number | undefined;

    const measure = () => {
      // Μετράμε το τέλος της αναφοράς «Powered by» — είναι πάντα το τελευταίο
      // ορατό στοιχείο της σελίδας. Το συνολικό ύψος του document δεν είναι
      // αξιόπιστο: κάποιες σελίδες έχουν αόρατα τμήματα στο τέλος (κρυφά
      // πάνελ, αποστάσεις), που θα άφηναν μεγάλο κενό μέσα στο πλαίσιο.
      const marker = document.querySelector("[data-bt-attribution]");
      const raw = marker
        ? Math.ceil(marker.getBoundingClientRect().bottom + window.scrollY)
        : Math.ceil(
            Math.max(
              document.documentElement?.scrollHeight ?? 0,
              document.body?.scrollHeight ?? 0,
            ),
          );
      // Όριο ασφαλείας: αν κάτι μετρηθεί παράλογα ψηλά, δεν σπρώχνουμε το πλαίσιο.
      const height = Math.min(raw, 12000);
      // Ανοχή 4px: αποφεύγει συνεχές «τρέμουλο» από υποπίξελ διαφορές.
      if (height > 0 && Math.abs(height - lastHeight) > 4) {
        lastHeight = height;
        window.parent.postMessage({ type: "billiardtoday:height", height }, "*");
      }
    };

    const schedule = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(measure, 120);
    };

    schedule();

    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(document.documentElement);
    if (document.body) resizeObserver.observe(document.body);

    const mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });

    window.addEventListener("load", schedule);
    const interval = window.setInterval(measure, 2000);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("load", schedule);
      window.clearInterval(interval);
      window.clearTimeout(debounce);
    };
  }, []);

  return null;
}
