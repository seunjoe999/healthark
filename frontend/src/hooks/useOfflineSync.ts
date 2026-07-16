import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../api'
import { getPendingRecords, deletePendingRecord, getPendingCount } from '../utils/offlineStore'

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)
  const [pendingCount, setPendingCount] = useState<number>(0)

  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingCount()
      setPendingCount(count)
    } catch {
      // IndexedDB unavailable; leave count as-is
    }
  }, [])

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) return
    try {
      const records = await getPendingRecords()
      if (records.length === 0) return

      let synced = 0
      for (const record of records) {
        try {
          await api.post('/daily-records', {
            suId: record.suId,
            homeId: record.homeId,
            recordType: record.recordType,
            ...record.data,
          })
          await deletePendingRecord(record.id)
          synced++
        } catch {
          // Leave failed records in IndexedDB for the next sync attempt
        }
      }

      if (synced > 0) {
        toast.success(`${synced} record${synced > 1 ? 's' : ''} synced`)
      }
      await refreshCount()
    } catch {
      // Silent failure — will retry on next online event
    }
  }, [refreshCount])

  useEffect(() => {
    refreshCount()

    const handleOnline = () => {
      setIsOnline(true)
      syncNow()
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [refreshCount, syncNow])

  return { isOnline, pendingCount, syncNow }
}
