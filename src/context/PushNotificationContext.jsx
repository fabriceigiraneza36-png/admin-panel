// Push Notification Context — Web Push lifecycle and account-aware subscription sync.
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useToast } from '@hooks/useToast'
import { useAuth } from '@hooks/useAuth'

const PushContext = createContext(null)
const API_BASE = (import.meta.env.VITE_API_URL || 'https://backend-jd8f.onrender.com/api').replace(/\/+$/, '')

function getStoredToken () {
  try {
    return localStorage.getItem('altuvera_admin_token') ||
      localStorage.getItem('adminToken') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('altuvera_admin_token') ||
      sessionStorage.getItem('adminToken') ||
      ''
  } catch {
    return ''
  }
}

function urlBase64ToUint8Array (base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArr[i] = rawData.charCodeAt(i)
  return outputArr
}

async function readJsonResponse (response, fallbackMessage) {
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result.success === false || result.error) {
    throw new Error(result.message || result.error || fallbackMessage + ' (HTTP ' + response.status + ').')
  }
  return result
}

async function sendSubscriptionToBackend (subscription) {
  const token = getStoredToken()
  if (!token) throw new Error('Sign in to Altuvera before syncing this browser subscription.')
  const json = subscription.toJSON()
  if (!subscription.endpoint || !json?.keys?.p256dh || !json?.keys?.auth) {
    throw new Error('The browser returned an incomplete push subscription. Re-enable browser notifications.')
  }

  const response = await fetch(API_BASE + '/push/subscribe', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      userAgent: navigator.userAgent,
    }),
  })
  await readJsonResponse(response, 'Could not register this browser for push notifications')
}

export function PushProvider ({ children }) {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState(() => {
    if (typeof Notification !== 'undefined') return Notification.permission
    return 'unsupported'
  })
  const [subscribed, setSubscribed] = useState(false)
  const [serverSynced, setServerSynced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [registration, setRegistration] = useState(null)
  const toast = useToast()
  const { isLoggedIn, admin } = useAuth()

  useEffect(() => {
    const canPush = typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window

    if (!canPush) {
      setSupported(false)
      setPermission('unsupported')
      return undefined
    }

    setSupported(true)
    let active = true

    navigator.serviceWorker.register('/push-sw.js', { scope: '/' })
      .then((reg) => {
        if (active) setRegistration(reg)
      })
      .catch((err) => {
        console.error('[Altuvera push] Service worker registration failed:', err)
      })

    const syncPermission = () => setPermission(Notification.permission)
    window.addEventListener('focus', syncPermission)
    return () => {
      active = false
      window.removeEventListener('focus', syncPermission)
    }
  }, [])

  // A service-worker subscription can outlive an admin session. Sync it after
  // authentication is restored so the backend targets the currently signed-in admin.
  useEffect(() => {
    if (!registration) return undefined
    let active = true

    const inspectAndSync = async () => {
      try {
        let subscription = await registration.pushManager.getSubscription()
        if (!active) return

        // Administrator and manager push eligibility is always enabled at the
        // backend. When this browser has already granted notification permission,
        // register it automatically instead of requiring a test/settings button.
        // Browsers do not permit an app to grant the initial permission silently.
        if (!subscription && isLoggedIn && Notification.permission === 'granted') {
          const keyResponse = await fetch(API_BASE + '/push/vapid-public-key', { cache: 'no-store' })
          const keyData = await readJsonResponse(keyResponse, 'Could not load push configuration')
          if (!keyData.publicKey) throw new Error('VAPID public key is not configured on the backend.')
          if (!active) return
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
          })
        }

        if (!active) return
        setSubscribed(Boolean(subscription))

        if (!subscription || !isLoggedIn) {
          setServerSynced(false)
          return
        }

        try {
          await sendSubscriptionToBackend(subscription)
          if (active) setServerSynced(true)
        } catch (err) {
          if (active) setServerSynced(false)
          console.warn('[Altuvera push] Existing browser subscription needs sync:', err.message)
        }
      } catch (err) {
        if (active) {
          setSubscribed(false)
          setServerSynced(false)
        }
        console.error('[Altuvera push] Could not inspect browser subscription:', err)
      }
    }

    inspectAndSync()
    return () => { active = false }
  }, [registration, isLoggedIn, admin?.id])

  const getVapidKey = useCallback(async () => {
    const response = await fetch(API_BASE + '/push/vapid-public-key', { cache: 'no-store' })
    const data = await readJsonResponse(response, 'Could not load push configuration')
    if (!data.publicKey) throw new Error('VAPID public key is not configured on the backend.')
    return data.publicKey
  }, [])

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      setPermission('unsupported')
      return 'unsupported'
    }
    const perm = await Notification.requestPermission()
    setPermission(perm)
    return perm
  }, [])

  const syncSubscription = useCallback(async () => {
    setLoading(true)
    try {
      const reg = registration || await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()
      if (!subscription) {
        setSubscribed(false)
        setServerSynced(false)
        throw new Error('This browser has no active push subscription. Enable browser notifications first.')
      }
      await sendSubscriptionToBackend(subscription)
      setSubscribed(true)
      setServerSynced(true)
      toast.success('This browser is registered with the Altuvera push service.')
      return true
    } catch (err) {
      setServerSynced(false)
      toast.error(err.message || 'Could not sync this browser with the push service.')
      return false
    } finally {
      setLoading(false)
    }
  }, [registration, toast])

  const subscribeUser = useCallback(async () => {
    setLoading(true)
    try {
      if (Notification.permission !== 'granted') {
        throw new Error('Allow browser notifications first, then enable push.')
      }

      const key = await getVapidKey()
      const reg = registration || await navigator.serviceWorker.ready
      let subscription = await reg.pushManager.getSubscription()

      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        })
      }

      await sendSubscriptionToBackend(subscription)
      setSubscribed(true)
      setServerSynced(true)
      toast.success('Push notifications are enabled and this browser is registered.')
      return true
    } catch (err) {
      setServerSynced(false)
      toast.error(err.message || 'Failed to enable push notifications.')
      return false
    } finally {
      setLoading(false)
    }
  }, [getVapidKey, registration, toast])

  const unsubscribeUser = useCallback(async () => {
    setLoading(true)
    try {
      const reg = registration || await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()
      if (subscription) {
        const token = getStoredToken()
        if (token) {
          const response = await fetch(API_BASE + '/push/unsubscribe', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + token,
            },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          })
          await readJsonResponse(response, 'Could not remove this browser from the push service')
        }
        await subscription.unsubscribe()
      }
      setSubscribed(false)
      setServerSynced(false)
      toast.success('Push notifications disabled for this browser.')
    } catch (err) {
      toast.error(err.message || 'Failed to disable push notifications.')
    } finally {
      setLoading(false)
    }
  }, [registration, toast])

  const value = {
    supported,
    permission,
    subscribed,
    serverSynced,
    loading,
    subscribeUser,
    unsubscribeUser,
    requestPermission,
    syncSubscription,
  }

  return <PushContext.Provider value={value}>{children}</PushContext.Provider>
}

export function usePush () {
  const ctx = useContext(PushContext)
  if (!ctx) throw new Error('usePush must be used within PushProvider')
  return ctx
}

export default PushContext
