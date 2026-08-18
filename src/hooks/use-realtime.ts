import { useEffect, useRef } from 'react'
import type { RecordModel, RecordSubscription } from 'pocketbase'

import pb from '@/lib/pocketbase/client'

/**
 * Global startup throttle.
 *
 * When the module loads we record a timestamp 5s in the future. No
 * `useRealtime` instance is allowed to open an SSE connection before that
 * timestamp expires. This prevents the burst of 10+ simultaneous realtime
 * subscriptions that fire on the first frame of every page (Layout,
 * ConnectionAlertBanner, DiagnosticCenter, etc.) from overwhelming machines
 * with limited resources — the single most common cause of the total browser
 * crash ("Aw, snap!" / CPU 100%) on safe-mode / low-resource environments.
 *
 * A subscription requested during the block is simply deferred until the
 * window expires, not dropped, so functionality is preserved.
 */
const STARTUP_BLOCK_MS = 5000
const startupBlockedUntil = Date.now() + STARTUP_BLOCK_MS

function scheduleAfterStartup(fn: () => void): () => void {
  const remaining = startupBlockedUntil - Date.now()
  if (remaining <= 0) {
    fn()
    return () => {}
  }
  const t = setTimeout(fn, remaining)
  return () => clearTimeout(t)
}

/**
 * Hook for real-time subscriptions to a PocketBase collection.
 * ALWAYS use this hook instead of subscribing inline.
 * Uses the per-listener UnsubscribeFunc so multiple components
 * can safely subscribe to the same collection without conflicts.
 *
 * Generic over the record type: pass your collection's interface as
 * `useRealtime<MyRecord>(...)` to get a typed subscription payload
 * instead of `unknown`.
 */
export function useRealtime<TRecord extends RecordModel = RecordModel>(
  collectionName: string,
  callback: (data: RecordSubscription<TRecord>) => void,
  enabled: boolean = true,
) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return

    let unsubscribeFn: (() => Promise<void>) | undefined
    let cancelled = false

    const start = () => {
      if (cancelled) return
      pb.collection<TRecord>(collectionName)
        .subscribe('*', (e) => {
          callbackRef.current(e)
        })
        .then((fn) => {
          if (cancelled) {
            fn().catch(() => {})
          } else {
            unsubscribeFn = fn
          }
        })
        .catch(() => {})
    }

    // Defer the actual subscription until the global startup block expires.
    const cancelSchedule = scheduleAfterStartup(start)

    return () => {
      cancelled = true
      cancelSchedule()
      if (unsubscribeFn) {
        unsubscribeFn().catch(() => {})
      }
    }
  }, [collectionName, enabled])
}

export default useRealtime
