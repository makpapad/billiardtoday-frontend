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
      const height = Math.ceil(
        Math.max(
          document.documentElement?.scrollHeight ?? 0,
          document.body?.scrollHeight ?? 0,
        ),
      );
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
