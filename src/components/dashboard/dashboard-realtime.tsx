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
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'

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
// Cooldown after `authReady` before any realtime channel is opened. The initial
// Dashboard render fires several getList() calls at once; opening 4 realtime
// subscriptions on top of that, against a token that may still be settling,
// cascades into reconnect storms that freeze the browser (especially on
// low-resource / safe-mode machines). Giving the initial render 5s to stabilize
// before subscribing avoids that cascade.
const REALTIME_OPEN_DELAY_MS = 5000

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

  // Guard: only open realtime subscriptions once the auth store is confirmed
  // valid AND stable. The AuthProvider keeps `loading` true until the token
  // refresh resolves (or times out); if we subscribe while the token is still
  // being refreshed, PocketBase rejects the realtime handshake with
  // "Missing or invalid client id" (the 404s seen in the logs), and each
  // failed reconnect attempt stacks up and freezes the page.
  // We also require `pb.authStore.isValid` directly so that a cleared/invalid
  // token never reaches the realtime layer.
  const { loading: authLoading, isAuthenticated } = useAuth()
  // `authReady` is only flipped to true AFTER a 5s cooldown once auth has
  // settled, so realtime channels are not opened during the initial render /
  // token-refresh storm. This is the main fix for the Dashboard freeze.
  const [authReady, setAuthReady] = useState(false)
  useEffect(() => {
    if (!authLoading && isAuthenticated && pb.authStore.isValid) {
      const t = setTimeout(() => setAuthReady(true), REALTIME_OPEN_DELAY_MS)
      return () => clearTimeout(t)
    } else if (!authLoading && !isAuthenticated) {
      // Auth settled as invalid: never subscribe.
      setAuthReady(false)
    }
  }, [authLoading, isAuthenticated])

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
  // All subscriptions are gated on `authReady` so we never open a realtime
  // channel against an unverified/expired token (the source of the
  // "Missing or invalid client id" 404s in the logs).
  useRealtime(
    'conversations',
    handle('conversations', DEBOUNCED_COLLECTIONS.has('conversations')),
    conversationsActive && authReady,
  )
  // Only `customers` and `cadences` need realtime on the Dashboard. `users`
  // only refreshes the header name and `leads` is just a counter — neither is
  // worth a realtime channel on mount, and removing them cuts the initial
  // subscription count (and the reconnect storm) in half. They can still be
  // refreshed via the manual "Atualizar" flow if needed.
  useRealtime('customers', handle('customers', DEBOUNCED_COLLECTIONS.has('customers')), authReady)
  useRealtime('cadences', handle('cadences', DEBOUNCED_COLLECTIONS.has('cadences')), authReady)
  useRealtime(
    'system_logs',
    handle('system_logs', DEBOUNCED_COLLECTIONS.has('system_logs')),
    systemLogsActive && authReady,
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

// Minimum interval between fetches triggered by a single realtime handler.
// Bursty events (a conversation batch, a status migration) collapse so the
// handler fetches at most once every 5s instead of once per event — the main
// cause of the cascading re-renders that froze the Dashboard.
const HANDLER_COOLDOWN_MS = 5000

/**
 * Subscribe a handler to a collection's realtime events through the shared
 * dashboard provider. The handler is kept in a ref so it can change every
 * render without re-registering. A per-handler cooldown swallows event bursts
 * so the wrapped handler runs at most once every HANDLER_COOLDOWN_MS.
 */
export function useDashboardRealtimeEvent(collection: string, handler: Handler, enabled = true) {
  const ctx = useContext(DashboardRealtimeContext)
  const handlerRef = useRef(handler)
  handlerRef.current = handler
  const lastRunRef = useRef(0)

  useEffect(() => {
    if (!ctx || !enabled) return
    const unsub = ctx.onEvent(collection, (e) => {
      const now = Date.now()
      if (now - lastRunRef.current < HANDLER_COOLDOWN_MS) return
      lastRunRef.current = now
      handlerRef.current(e)
    })
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
