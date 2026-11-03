// Altuvera Admin service worker: display production Web Push alerts.
function displayPushNotification(payload) {
  const payloadData = payload && payload.data && typeof payload.data === 'object'
    ? payload.data
    : {};
  const notificationOptions = {
    body: payload.body || payload.message || 'You have a new update from Altuvera.',
    icon: payload.icon || '/favicon.ico',
    badge: payload.badge || '/favicon.ico',
    data: {
      ...payloadData,
      url: payloadData.url || payload.url || '/notifications',
    },
    requireInteraction: payload.requireInteraction === true,
    tag: payload.tag || ('altuvera-notification-' + (payloadData.id || 'general')),
    renotify: Boolean(payload.renotify),
  };

  return self.registration.showNotification(payload.title || 'Altuvera Admin', notificationOptions);
}

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    displayPushNotification(payload).catch((error) => {
      console.error('[Altuvera push] Could not display browser notification:', error);
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const requestedUrl = event.notification.data && event.notification.data.url;
  const target = new URL(requestedUrl || '/notifications', self.location.origin);
  if (target.origin !== self.location.origin) target.href = self.location.origin + '/notifications';

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        if ('navigate' in client) {
          const current = new URL(client.url);
          if (current.href !== target.href) await client.navigate(target.href);
        }
        return client.focus();
      }
    }
    return clients.openWindow ? clients.openWindow(target.href) : undefined;
  })());
});
