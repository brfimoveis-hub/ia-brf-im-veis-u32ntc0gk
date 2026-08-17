import { useEffect, useRef } from 'react'
import type { RecordModel, RecordSubscription } from 'pocketbase'

import pb from '@/lib/pocketbase/client'

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
    let openTimer: ReturnType<typeof setTimeout> | undefined

    // Defer the subscription by a short delay so that a rapid toggle of
    // `enabled` (e.g. StrictMode mount/unmount/mount, or an auth flag that
    // flips true -> false -> true in quick succession) does not open a new
    // realtime channel before the previous one has finished cleaning up.
    // The timer is cancelled on cleanup, so a toggle within the window
    // simply never subscribes.
    openTimer = setTimeout(() => {
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
    }, 200)

    return () => {
      cancelled = true
      if (openTimer) clearTimeout(openTimer)
      if (unsubscribeFn) {
        unsubscribeFn().catch(() => {})
      }
    }
  }, [collectionName, enabled])
}

export default useRealtime
