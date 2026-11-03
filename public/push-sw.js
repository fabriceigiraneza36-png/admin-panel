// Altuvera Admin service worker: display real Web Push alerts and acknowledge
// test delivery only after the browser's showNotification() call resolves.

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
    tag: data.tag || (payloadData.testId
      ? 'altuvera-admin-test-' + payloadData.testId
      : 'altuvera-admin-notification'),
    renotify: Boolean(data.renotify),
  }

  // Do not report receipt until the browser confirms the notification request.
  await self.registration.showNotification(data.title || 'Altuvera Admin', notificationOptions)

  const { testId, subscriptionId, adminId, receiptToken, receiptUrl } = payloadData
  if (testId && subscriptionId && adminId && receiptToken && receiptUrl) {
    const response = await fetch(receiptUrl, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId, subscriptionId, adminId, receiptToken }),
    })
    if (!response.ok) {
      throw new Error('Push test notification was displayed, but its browser receipt could not be confirmed (HTTP ' + response.status + ').')
    }
  }
}

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }

  event.waitUntil(
    displayPushNotification(data).catch((error) => {
      // The notification may already be visible. Log the acknowledgement failure
      // so the admin panel correctly leaves the test unconfirmed instead of faking success.
      console.error('[Altuvera push] Notification display/receipt failed:', error)
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/notifications', self.location.origin)
  if (target.origin !== self.location.origin) target.href = self.location.origin + '/notifications'

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if ('focus' in client) {
        if ('navigate' in client && new URL(client.url).pathname !== target.pathname) {
          await client.navigate(target.href)
        }
        return client.focus()
      }
    }
    return clients.openWindow ? clients.openWindow(target.href) : undefined
  })())
})
