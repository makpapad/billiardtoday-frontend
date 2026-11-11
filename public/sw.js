/* Service worker για τις ειδοποιήσεις διοργάνωσης (Web Push).
 *
 * Κρατιέται σκόπιμα μικρό: δέχεται το push, δείχνει την ειδοποίηση και ανοίγει
 * το τουρνουά στο κλικ. ΧΩΡΙΣ cache/offline λογική — ένα λάθος cache εδώ θα
 * «κόλλαγε» παλιές σελίδες σε όλο το site.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = { title: "Billiard Today", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Billiard Today";
  const options = {
    body: payload.body || "",
    icon: "/logo-billiardtoday.png",
    badge: "/logo-billiardtoday.png",
    tag: payload.tag || undefined,
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === targetUrl && "focus" in client) return client.focus();
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});
