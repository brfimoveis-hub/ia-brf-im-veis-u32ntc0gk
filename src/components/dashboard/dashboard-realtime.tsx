import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import type { RecordSubscription } from 'pocketbase'
import { useRealtime } from '@/hooks/use-realtime'

/**
 * Centralizes all realtime subscriptions used by the Dashboard page so that
 * each collection is subscribed to exactly ONCE, regardless of how many child
 * components care about it. Bursty events are debounced per-collection so a
 * flurry of writes (e.g. a conversation batch) collapses into a single refresh
 * instead of triggering one refetch per event.
 *
 * `system_logs` is special: the provider only subscribes to it when at least
 * one listener is registered (i.e. the logs dialog is open), so the page does
 * not keep that subscription alive when nobody is looking.
 */

type Handler = (e: RecordSubscription) => void

interface DashboardRealtimeContextValue {
  /** Register a handler for a collection's realtime events. Returns an unsubscribe fn. */
  onEvent: (collection: string, handler: Handler) => () => void
}

const DashboardRealtimeContext = createContext<DashboardRealtimeContextValue | null>(null)

const DEBOUNCE_MS = 1000

// Collections whose event bursts should collapse into a single delayed refresh.
const DEBOUNCED_COLLECTIONS = new Set([
  'conversations',
  'customers',
  'cadences',
  'leads',
  'system_logs',
])

export function DashboardRealtimeProvider({ children }: { children: ReactNode }) {
  // collection -> set of registered handlers
  const handlersRef = useRef<Map<string, Set<Handler>>>(new Map())
  // collection -> pending debounce timer
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  // collection -> last received event (used when the debounced dispatch fires)
  const lastEventRef = useRef<Map<string, RecordSubscription>>(new Map())

  // system_logs is only subscribed when a listener is registered.
  const [systemLogsActive, setSystemLogsActive] = useState(false)
  // conversations is only subscribed when a listener is registered (i.e. the
  // Performance Dashboard section has scrolled into view), so the page does not
  // open that realtime channel on initial mount before the analytics are needed.
  const [conversationsActive, setConversationsActive] = useState(false)

  const dispatch = useCallback((collection: string) => {
    const set = handlersRef.current.get(collection)
    const e = lastEventRef.current.get(collection)
    if (!set || !e) return
    set.forEach((h) => {
      try {
        h(e)
      } catch (err) {
        console.error(err)
      }
    })
  }, [])

  const handle = useCallback(
    (collection: string, debounce: boolean) => (e: RecordSubscription) => {
      lastEventRef.current.set(collection, e)
      if (!debounce) {
        dispatch(collection)
        return
      }
      const existing = timersRef.current.get(collection)
      if (existing) clearTimeout(existing)
      timersRef.current.set(
        collection,
        setTimeout(() => {
          timersRef.current.delete(collection)
          dispatch(collection)
        }, DEBOUNCE_MS),
      )
    },
    [dispatch],
  )

  // One subscription per collection for the lifetime of the dashboard.
  // useRealtime stores the callback in a ref, so the changing closure does not
  // cause re-subscription.
  useRealtime(
    'conversations',
    handle('conversations', DEBOUNCED_COLLECTIONS.has('conversations')),
    conversationsActive,
  )
  useRealtime('customers', handle('customers', DEBOUNCED_COLLECTIONS.has('customers')))
  useRealtime('cadences', handle('cadences', DEBOUNCED_COLLECTIONS.has('cadences')))
  useRealtime('leads', handle('leads', DEBOUNCED_COLLECTIONS.has('leads')))
  useRealtime('users', handle('users', DEBOUNCED_COLLECTIONS.has('users')))
  useRealtime(
    'system_logs',
    handle('system_logs', DEBOUNCED_COLLECTIONS.has('system_logs')),
    systemLogsActive,
  )

  // Clear any pending timers on unmount.
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t))
      timersRef.current.clear()
    }
  }, [])

  const onEvent = useCallback((collection: string, handler: Handler) => {
    let set = handlersRef.current.get(collection)
    if (!set) {
      set = new Set()
      handlersRef.current.set(collection, set)
    }
    set.add(handler)
    if (collection === 'system_logs' && set.size === 1) {
      setSystemLogsActive(true)
    }
    if (collection === 'conversations' && set.size === 1) {
      setConversationsActive(true)
    }
    return () => {
      const s = handlersRef.current.get(collection)
      if (!s) return
      s.delete(handler)
      if (s.size === 0) {
        handlersRef.current.delete(collection)
        if (collection === 'system_logs') {
          setSystemLogsActive(false)
        }
        if (collection === 'conversations') {
          setConversationsActive(false)
        }
      }
    }
  }, [])

  return (
    <DashboardRealtimeContext.Provider value={{ onEvent }}>
      {children}
    </DashboardRealtimeContext.Provider>
  )
}

/**
 * Subscribe a handler to a collection's realtime events through the shared
 * dashboard provider. The handler is kept in a ref so it can change every
 * render without re-registering.
 */
export function useDashboardRealtimeEvent(collection: string, handler: Handler, enabled = true) {
  const ctx = useContext(DashboardRealtimeContext)
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!ctx || !enabled) return
    const unsub = ctx.onEvent(collection, (e) => handlerRef.current(e))
    return unsub
  }, [ctx, collection, enabled])
}

export function useDashboardRealtime() {
  const ctx = useContext(DashboardRealtimeContext)
  if (!ctx) {
    throw new Error('useDashboardRealtime must be used within DashboardRealtimeProvider')
  }
  return ctx
}
