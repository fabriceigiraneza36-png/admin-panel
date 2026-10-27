// Altuvera Admin service worker: display Web Push alerts outside the active tab.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  const payloadData = data.data && typeof data.data === 'object' ? data.data : {};
  const options = {
    body: data.body || data.message || 'You have a new admin alert.',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    data: { ...payloadData, url: payloadData.url || data.url || '/notifications' },
    requireInteraction: data.requireInteraction === true,
    tag: data.tag || 'altuvera-admin-notification',
    renotify: Boolean(data.renotify),
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Altuvera Admin', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/notifications', self.location.origin);
  if (target.origin !== self.location.origin) target.href = self.location.origin + '/notifications';

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        if ('navigate' in client && new URL(client.url).pathname !== target.pathname) {
          await client.navigate(target.href);
        }
        return client.focus();
      }
    }
    return clients.openWindow ? clients.openWindow(target.href) : undefined;
  })());
});
