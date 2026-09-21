import { useEffect } from 'react'
import api from '../api'

const SUBSCRIBED_KEY = 'push_subscribed_endpoint'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

// Subscribes this device to browser push so staff get an instant notification
// (even with the app closed/backgrounded) when their rota changes, instead of
// only seeing it next time they open the in-app notification bell. Silently
// does nothing if the browser doesn't support push, permission is denied, or
// VAPID isn't configured server-side yet — never blocks the rest of the app.
export function usePushNotifications(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission === 'denied') return

    let cancelled = false

    const subscribe = async () => {
      try {
        const keyRes = await api.get('/push/vapid-public-key')
        const publicKey = keyRes.data?.data?.publicKey
        if (!publicKey || cancelled) return

        const reg = await navigator.serviceWorker.ready
        let sub = await reg.pushManager.getSubscription()

        if (!sub) {
          if (Notification.permission === 'default') {
            const perm = await Notification.requestPermission()
            if (perm !== 'granted') return
          }
          if (Notification.permission !== 'granted' || cancelled) return
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
          })
        }

        if (cancelled) return
        const json = sub.toJSON()
        if (localStorage.getItem(SUBSCRIBED_KEY) === json.endpoint) return

        await api.post('/push/subscribe', { endpoint: json.endpoint, keys: json.keys })
        localStorage.setItem(SUBSCRIBED_KEY, json.endpoint || '')
      } catch {
        // Non-fatal — push is a convenience layer on top of in-app notifications
      }
    }

    // Small delay so this never competes with the page's own initial data load
    const t = setTimeout(subscribe, 4000)
    return () => { cancelled = true; clearTimeout(t) }
  }, [enabled])
}
