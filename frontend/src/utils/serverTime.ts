// Live server-synced clock (`GET /api/server-time`), refreshed every 3 minutes
// and immediately on `visibilitychange` / window `focus` (e.g. when a carer
// wakes a tablet screen during an overnight shift or across the UK BST <-> GMT
// clock transition). Eliminates all clock-skew, manual device timezone, and
// midnight/DST drift between devices and the backend.
import { useEffect, useState } from 'react'
import api from '../api'
import { ukDateStr } from './ukDate'

const SYNC_TTL_MS = 3 * 60 * 1000
let cachedOffsetMs: number | null = null
let lastSyncedAt = 0
let pending: Promise<number> | null = null

export async function refreshServerOffset(force = false): Promise<number> {
  if (!force && cachedOffsetMs !== null && Date.now() - lastSyncedAt < SYNC_TTL_MS) {
    return cachedOffsetMs
  }
  if (pending) return pending
  const t0 = Date.now()
  pending = api.get('/server-time')
    .then(res => {
      const t1 = Date.now()
      const midpoint = (t0 + t1) / 2
      const serverNow = res.data?.data?.epochMs ?? new Date(res.data.data.iso).getTime()
      cachedOffsetMs = serverNow - midpoint
      lastSyncedAt = t1
      return cachedOffsetMs
    })
    .catch(() => cachedOffsetMs ?? 0)
    .finally(() => { pending = null })
  return pending
}

export function getServerNowSync(): Date {
  return new Date(Date.now() + (cachedOffsetMs ?? 0))
}

export async function getServerNow(): Promise<Date> {
  const offset = await refreshServerOffset()
  return new Date(Date.now() + offset)
}

export async function getServerTodayStr(): Promise<string> {
  const now = await getServerNow()
  return ukDateStr(now)
}

// React hook returning a live `Date` synced to `/api/server-time`, ticking
// every 15s and immediately re-syncing on tab focus / visibility wakeup.
export function useServerNow(): Date {
  const [now, setNow] = useState<Date>(() => getServerNowSync())

  useEffect(() => {
    let mounted = true
    const tick = () => { if (mounted) setNow(getServerNowSync()) }
    const syncAndTick = () => {
      refreshServerOffset(true).then(() => { if (mounted) setNow(getServerNowSync()) })
    }
    syncAndTick()
    const tickTimer = setInterval(tick, 15_000)
    const syncTimer = setInterval(syncAndTick, SYNC_TTL_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') syncAndTick() }
    window.addEventListener('focus', syncAndTick)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      mounted = false
      clearInterval(tickTimer)
      clearInterval(syncTimer)
      window.removeEventListener('focus', syncAndTick)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return now
}
