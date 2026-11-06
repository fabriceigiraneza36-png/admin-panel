/* Altuvera Admin — important, deduplicated browser push alerts. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

const isRoutineLoginAlert = (data, title, body) => {
  const type = String(data.type || data.data?.type || "").toLowerCase();
  const text = String(title || "") + " " + String(body || "");
  return type === "login_success" ||
    /sign[\s-]?in successful|successful secure sign[\s-]?in|signed in successfully/i.test(text);
};

const isImportantAlert = (data) => {
  const category = String(data.category || data.data?.category || "").toLowerCase();
  const priority = String(data.priority || data.data?.priority || "normal").toLowerCase();
  return category === "booking" ||
    category === "messages" ||
    (category === "package" && ["high", "urgent"].includes(priority)) ||
    (category === "contact" && String(data.targetScope || "").toLowerCase() === "admin") ||
    (category === "security" && ["high", "urgent"].includes(priority)) ||
    (category === "travel_updates" && ["high", "urgent"].includes(priority)) ||
    priority === "urgent";
};

const notificationTarget = (rawTarget) => {
  const fallback = new URL("/notifications", self.location.origin);
  try {
    const target = new URL(rawTarget || fallback.href, self.location.origin);
    return target.origin === self.location.origin ? target : fallback;
  } catch {
    return fallback;
  }
};

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil((async () => {
    const title = data.title || "Altuvera";
    const body = data.body || data.message || "You have an important admin update.";
    if (isRoutineLoginAlert(data, title, body) || !isImportantAlert(data)) return;

    const createdAt = Date.parse(data.data?.createdAt || data.createdAt || "");
    if (Number.isFinite(createdAt) && Date.now() - createdAt > 10 * 60 * 1000) return;

    // The admin panel notification centre/socket remains the live surface
    // while the panel is in use; browser alerts are for when it is away.
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const panelIsActive = windows.some((client) =>
      client.visibilityState === "visible" && (client.focused === true || client.focused == null)
    );
    if (panelIsActive) return;

    const payloadData = data.data && typeof data.data === "object" ? data.data : {};
    const notificationId = payloadData.notificationId || payloadData.id || data.id || "";
    await self.registration.showNotification(title, {
      body,
      icon: data.icon || "/favicon.ico",
      badge: data.badge || "/favicon.ico",
      timestamp: Number.isFinite(createdAt) ? createdAt : Date.now(),
      tag: data.tag || (notificationId
        ? "altuvera-admin-" + String(notificationId)
        : "altuvera-admin-important-" + String(data.category || "update")),
      renotify: false,
      requireInteraction: data.requireInteraction === true,
      data: {
        ...payloadData,
        url: notificationTarget(payloadData.url || data.url).href,
      },
    });
  })().catch((error) => {
    console.error("[Altuvera push] Notification display failed:", error);
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = notificationTarget(event.notification.data?.url);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (!("focus" in client)) continue;
      if ("navigate" in client && client.url !== target.href) {
        try { await client.navigate(target.href); } catch { /* Focus remains a fallback. */ }
      }
      return client.focus();
    }

    // Opens the intended admin route when the panel/browser has no open tab.
    return self.clients.openWindow ? self.clients.openWindow(target.href) : undefined;
  })());
});
