// admin/src/context/PushNotificationContext.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// Push Notification Context — manages Web Push subscription for offline admin alerts
// ═══════════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useToast } from '@hooks/useToast'

const PushContext = createContext(null)

function urlBase64ToUint8Array (base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArr[i] = rawData.charCodeAt(i)
  return outputArr
}

async function sendSubscriptionToBackend (subscription) {
  const apiBase = import.meta.env.VITE_API_URL || 'https://backend-jd8f.onrender.com/api'
  const token = localStorage.getItem('altuvera_admin_token') || sessionStorage.getItem('altuvera_admin_token') || ''
  await fetch(`${apiBase}/push/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      p256dh:   subscription.toJSON().keys.p256dh,
      auth:     subscription.toJSON().keys.auth,
      userAgent: navigator.userAgent,
    }),
  })
}

export function PushProvider ({ children }) {
  const [supported, setSupported]     = useState(false)
  const [permission, setPermission]   = useState(() => {
    if (typeof Notification !== 'undefined') return Notification.permission
    return 'unsupported'
  })
  const [subscribed, setSubscribed]   = useState(false)
  const [loading, setLoading]         = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false)
      return
    }
    setSupported(true)

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' })
        setSubscriptionParams(reg)
      } catch {
        // Silent fail — push just won't work
      }
    }
    registerSW()
  }, [])

  const setSubscriptionParams = async (reg) => {
    try {
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    } catch {
      // Silent fail
    }
  }

  const getVapidKey = useCallback(async () => {
    const apiBase = import.meta.env.VITE_API_URL || 'https://backend-jd8f.onrender.com/api'
    const res = await fetch(`${apiBase}/push/vapid-public-key`)
    const data = await res.json()
    return data.publicKey || ''
  }, [])

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported'
    const perm = await Notification.requestPermission()
    setPermission(perm)
    return perm
  }, [])

  const subscribeUser = useCallback(async () => {
    setLoading(true)
    try {
      const key = await getVapidKey()
      if (!key) throw new Error('VAPID public key not available.')

      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      })

      await sendSubscriptionToBackend(subscription)
      setSubscribed(true)
      if (Notification.permission !== 'granted' && typeof Notification !== 'undefined') {
        setPermission('granted')
      }
      toast.success('Push notifications enabled — you will receive alerts even when offline.')
    } catch (err) {
      toast.error(err.message || 'Failed to enable push notifications.')
    } finally {
      setLoading(false)
    }
  }, [getVapidKey, toast])

  const unsubscribeUser = useCallback(async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const apiBase = import.meta.env.VITE_API_URL || 'https://backend-jd8f.onrender.com/api'
        const token = localStorage.getItem('altuvera_admin_token') || sessionStorage.getItem('altuvera_admin_token') || ''
        await fetch(`${apiBase}/push/unsubscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {})
        await sub.unsubscribe()
        setSubscribed(false)
        toast.success('Push notifications disabled.')
      }
    } catch (err) {
      toast.error(err.message || 'Failed to disable push notifications.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  const value = {
    supported,
    permission,
    subscribed,
    loading,
    subscribeUser,
    unsubscribeUser,
    requestPermission,
  }

  return <PushContext.Provider value={value}>{children}</PushContext.Provider>
}

export function usePush () {
  const ctx = useContext(PushContext)
  if (!ctx) throw new Error('usePush must be used within PushProvider')
  return ctx
}

export default PushContext
