/**
 * Push értesítések a Nora felülethez.
 *
 * Szándékosan NINCS benne offline gyorsítótárazás: az admin mindig friss
 * adatot mutasson, egy elavult beszélgetés-lista rosszabb a semminél.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Nora", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Nora", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/badge-96.png",
      // azonos beszélgetésnél az új értesítés lecseréli a régit, nem halmozódik
      tag: data.tag || "nora",
      renotify: true,
      data: { url: data.url || "/admin" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const cel = (event.notification.data && event.notification.data.url) || "/admin";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ablakok) => {
      // ha már nyitva van a felület, azt hozzuk előtérbe, ne nyissunk újat
      for (const ablak of ablakok) {
        if (ablak.url.includes("/admin") && "focus" in ablak) {
          ablak.navigate(cel);
          return ablak.focus();
        }
      }
      return self.clients.openWindow(cel);
    }),
  );
});
