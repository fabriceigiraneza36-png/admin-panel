// Altuvera Admin service worker: display real Web Push alerts reliably.
 // Push delivery is notification-driven; no test-only acknowledgement is required.

async function displayPushNotification (data) {
  const payloadData = data.data && typeof data.data === 'object' ? data.data : {}
  const { receiptToken: _receiptToken, receiptUrl: _receiptUrl, ...notificationData } = payloadData
  const notificationOptions = {
    body: data.body || data.message || 'You have a new admin alert.',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    data: {
      ...notificationData,
      url: payloadData.url || data.url || '/notifications',
    },
    requireInteraction: data.requireInteraction === true,
    // Give each real notification its own stable tag. A shared constant tag
    // caused unrelated alerts to overwrite one another in the browser tray.
    tag: data.tag || (payloadData.notificationId || payloadData.notification_id || data.id
      ? 'altuvera-notification-' + String(payloadData.notificationId || payloadData.notification_id || data.id)
      : 'altuvera-notification-' + String(data.title || 'alert').slice(0, 48) + '-' + String(data.body || data.message || '').slice(0, 48)),
    renotify: Boolean(data.renotify),
  }

  // Acknowledge display through the service worker; actual delivery is handled
  // by the browser Push API for all notification types, not a testing workflow.
  await self.registration.showNotification(data.title || 'Altuvera', notificationOptions)
}

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }

  event.waitUntil((async () => {
    // Keep browser-tray alerts out of the way while an admin is actively using
    // the panel. The in-app notification centre/socket remains the live surface.
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    const panelIsActive = windows.some((client) =>
      client.visibilityState === 'visible' && (client.focused === true || client.focused == null)
    )
    if (panelIsActive) return

    await displayPushNotification(data)
  })().catch((error) => {
    console.error('[Altuvera push] Notification display failed:', error)
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/notifications', self.location.origin)
  if (target.origin !== self.location.origin) target.href = self.location.origin + '/notifications'

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if ('focus' in client) {
        if ('navigate' in client) {
          const current = new URL(client.url)
          if (
            current.origin !== target.origin ||
            current.pathname !== target.pathname ||
            current.search !== target.search
          ) {
            await client.navigate(target.href)
          }
        }
        return client.focus()
      }
    }
    return clients.openWindow ? clients.openWindow(target.href) : undefined
  })())
})
