// The server's own clock, fetched once and cached for the session.
// Anything that must match server-generated records (e.g. tasks created by the
// recurring-template generator, which stamps task_date using the server's own
// clock) should compute "today" from this, not the device's local clock — a
// device and the server can otherwise disagree on what day it is.
import api from '../api'

let cachedOffsetMs: number | null = null
let pending: Promise<number> | null = null

async function getOffsetMs(): Promise<number> {
  if (cachedOffsetMs !== null) return cachedOffsetMs
  if (pending) return pending
  pending = api.get('/server-time')
    .then(res => {
      const serverNow = new Date(res.data.data.iso).getTime()
      cachedOffsetMs = serverNow - Date.now()
      return cachedOffsetMs
    })
    .catch(() => 0)
  return pending
}

export async function getServerNow(): Promise<Date> {
  const offset = await getOffsetMs()
  return new Date(Date.now() + offset)
}

export async function getServerTodayStr(): Promise<string> {
  const now = await getServerNow()
  return now.toISOString().split('T')[0]
}
