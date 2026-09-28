// Trysa Panel servis çalışanı: telefona gelen bildirimi gösterir, dokununca ilgili talebi açar.
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Trysa Panel", {
      body: data.body || "",
      icon: "/panel-icon-192.png",
      badge: "/panel-icon-192.png",
      tag: data.url || "trysa",
      renotify: true,
      data: { url: data.url || "/panel" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/panel", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin + "/panel") && "focus" in client) {
          await client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
