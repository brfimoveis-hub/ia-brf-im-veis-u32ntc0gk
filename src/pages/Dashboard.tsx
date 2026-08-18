import { lazy, Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  MessageSquare,
  Bot,
  Activity,
  ArrowRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  DashboardRealtimeProvider,
  useDashboardRealtimeEvent,
  useRealtimePaused,
  RealtimeToggle,
} from '@/components/dashboard/dashboard-realtime'
import { reportError } from '@/lib/error-reporter'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Lazy-load the heavy dashboard sections so their (potentially expensive)
// fetches and realtime channels are not part of the initial bundle/JS
// evaluation. On low-resource / safe-mode machines loading everything
// synchronously on mount is what freezes the browser.
const PerformanceDashboard = lazy(() =>
  import('@/components/dashboard/performance-dashboard').then((m) => ({
    default: m.PerformanceDashboard,
  })),
)
const IntegrityDiagnostics = lazy(() =>
  import('@/components/dashboard/integrity-diagnostics').then((m) => ({
    default: m.IntegrityDiagnostics,
  })),
)

// Minimal fallback for the lazy sections — deliberately cheap to render so it
// adds no load while the real component is being fetched/instantiated.
const SectionFallback = () => (
  <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
    Carregando...
  </div>
)

// Lightweight skeleton block used inside the stat cards while the initial
// sequential fetch is in flight. Replaces the old "—" placeholder: a pulsing
// bar communicates "loading" without blocking the main thread.
const StatSkeleton = () => (
  <div className="h-7 w-12 animate-pulse rounded bg-muted" aria-label="Carregando..." />
)

// Wraps a lazy realtime-dependent section. While realtime is paused (the
// default), the section shows a subtle "paused" notice instead of mounting its
// (potentially expensive) content, so the page never blocks on mount.
function PausedAwareSection({ paused, children }: { paused: boolean; children: React.ReactNode }) {
  if (paused) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>Dados em tempo real pausados. Clique para ativar.</span>
      </div>
    )
  }
  return <>{children}</>
}

function DashboardInner() {
  const { user } = useAuth()
  const userId = user?.id
  const [customerCount, setCustomerCount] = useState(0)
  const [cadenceCount, setCadenceCount] = useState(0)
  const [iaInteractions, setIaInteractions] = useState(0)
  const [statsError, setStatsError] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(user)
  // True until the first stats fetch has completed at least once, so the cards
  // show a skeleton rather than "0" / "—" on initial render.
  const [hasLoaded, setHasLoaded] = useState(false)
  const realtimePaused = useRealtimePaused()

  // Keep a ref to the latest user record id so realtime handlers (which are
  // registered once) can read it without depending on `user` in their closure.
  const userIdRef = useRef(userId)
  userIdRef.current = userId

  // Stable callback: only depends on the user id, not the `user` object. An
  // auth-refresh changes the `user` reference but keeps the id stable, so this
  // callback is NOT recreated and the initial-fetch effect does not re-fire.
  //
  // Requests are made SEQUENTIALLY (one await at a time) instead of via
  // Promise.allSettled. On the safe-mode machine, 3+ parallel HTTP requests
  // fired on mount congest the network pipeline and freeze the browser; doing
  // them one-by-one keeps the main thread responsive. Each result is applied
  // to state as soon as it returns so the cards fill in progressively.
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    setStatsError(false)
    try {
      const currentId = userIdRef.current

      // 1) User / integration data — fetched first (single request), so the
      //    Integrações card can render as soon as possible. Integration data
      //    is not critical for the numeric stats, so a failure here is
      //    swallowed and does not abort the rest of the fetch.
      if (currentId) {
        try {
          const usr = await pb.collection('users').getOne(currentId)
          setCurrentUser((prev) => {
            // Only update when something actually changed, to avoid a
            // pointless re-render from an identical record.
            if (prev && JSON.stringify(prev) === JSON.stringify(usr)) return prev
            return usr
          })
        } catch (err) {
          reportError({
            type: 'dashboard_user_error',
            message: err instanceof Error ? err.message : 'Failed to fetch user',
            details: { user_id: currentId },
          })
        }
      }

      // 2) Customers count — SEQUENTIAL.
      let anyError = false
      try {
        const customersRes = await pb.collection('customers').getList(1, 1, { fields: 'id' })
        setCustomerCount(customersRes.totalItems)
      } catch (err) {
        anyError = true
        reportError({
          type: 'dashboard_customers_error',
          message: err instanceof Error ? err.message : 'Failed to fetch customers count',
          details: { reason: String(err) },
        })
      }

      // 3) Cadences count — SEQUENTIAL.
      try {
        const cadencesRes = await pb
          .collection('cadences')
          .getList(1, 1, { filter: 'is_active = true', fields: 'id' })
        setCadenceCount(cadencesRes.totalItems)
      } catch (err) {
        anyError = true
        reportError({
          type: 'dashboard_cadences_error',
          message: err instanceof Error ? err.message : 'Failed to fetch cadences count',
          details: { reason: String(err) },
        })
      }

      // 4) Leads / IA interactions count — SEQUENTIAL.
      try {
        const iaRes = await pb.collection('leads').getList(1, 1, { fields: 'id' })
        setIaInteractions(iaRes.totalItems)
      } catch (err) {
        anyError = true
        reportError({
          type: 'dashboard_leads_error',
          message: err instanceof Error ? err.message : 'Failed to fetch leads count',
          details: { reason: String(err) },
        })
      }

      setStatsError(anyError)
    } catch (err) {
      console.error(err)
      setStatsError(true)
      reportError({
        type: 'dashboard_stats_error',
        message: err instanceof Error ? err.message : 'Dashboard stats fetch failed',
        details: { stack: err instanceof Error ? err.stack : undefined },
      })
    } finally {
      setStatsLoading(false)
      setHasLoaded(true)
    }
  }, [])

  // Schedule a fetch without blocking the main thread. requestIdleCallback
  // lets the browser run the fetch only when the event loop is idle (so the
  // initial render / paint is never interrupted); setTimeout(...,100) is the
  // fallback for browsers without rIC.
  const scheduleFetch = useCallback(() => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      ;(window as any).requestIdleCallback(() => fetchStats(), { timeout: 5000 })
    } else {
      setTimeout(fetchStats, 100)
    }
  }, [fetchStats])

  // DEFINITIVE FREEZE FIX: do NOT fetch on mount. Wait 3s after the user id is
  // available, then schedule the fetch via requestIdleCallback so the initial
  // render / paint completes and the browser is idle before any network work
  // begins. This is the single biggest contributor to the freeze: previously
  // fetchStats fired immediately on mount, racing the auth refresh and the
  // realtime subscriptions.
  useEffect(() => {
    if (!userId) return
    const timer = setTimeout(() => {
      scheduleFetch()
    }, 3000)
    return () => clearTimeout(timer)
  }, [userId, scheduleFetch])

  // --- Realtime handlers (registered once via the shared provider) ----------
  // The `users` and `leads` subscriptions were removed from the provider
  // (users only updates the header name, leads is just a counter — neither
  // justified a realtime channel on mount). The two handlers that remain
  // (customers, cadences) are additionally throttled by a per-handler 5s
  // cooldown inside useDashboardRealtimeEvent so bursts collapse into a
  // single refetch instead of cascading re-renders.
  useDashboardRealtimeEvent('customers', () => {
    pb.collection('customers')
      .getList(1, 1, { fields: 'id' })
      .then((res) => setCustomerCount(res.totalItems))
      .catch((err) => {
        console.error(err)
        reportError({
          type: 'dashboard_customers_error',
          message: err instanceof Error ? err.message : 'Realtime customers fetch failed',
          details: {},
        })
      })
  })

  useDashboardRealtimeEvent('cadences', () => {
    pb.collection('cadences')
      .getList(1, 1, { filter: 'is_active = true', fields: 'id' })
      .then((res) => setCadenceCount(res.totalItems))
      .catch(console.error)
  })

  // Whether the numeric stat cards should show a skeleton. A skeleton is shown
  // while loading AND before the first successful load completes.
  const showSkeleton = statsLoading || !hasLoaded

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">CRM Pipeline (Dashboard)</h2>
          <p className="text-muted-foreground">
            Bem-vindo de volta, {currentUser?.name || user?.name || 'Administrador'}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RealtimeToggle />
          <Button variant="outline" size="sm" onClick={scheduleFetch} disabled={statsLoading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', statsLoading && 'animate-spin')} />
            Atualizar
          </Button>
        </div>
      </div>

      {statsError && (
        <ErrorBoundary
          key="stats-error-banner"
          title="Estatísticas"
          onRetry={scheduleFetch}
          logType="dashboard_stats_error"
        >
          <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Alguns dados não puderam ser carregados. Tente novamente.</span>
            </div>
            <Button variant="outline" size="sm" onClick={scheduleFetch} disabled={statsLoading}>
              <RefreshCw className={cn('mr-2 h-4 w-4', statsLoading && 'animate-spin')} />
              Tentar novamente
            </Button>
          </div>
        </ErrorBoundary>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {showSkeleton ? <StatSkeleton /> : customerCount}
            </div>
            <p className="text-xs text-muted-foreground">Na base de dados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Cadências</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {showSkeleton ? <StatSkeleton /> : cadenceCount}
            </div>
            <p className="text-xs text-muted-foreground">Ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Integrações</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">WhatsApp API</span>
              {currentUser?.meta_token_status === 'active' ? (
                <Badge className="bg-green-500 hover:bg-green-600 text-xs">Ativo</Badge>
              ) : currentUser?.meta_token_status === 'error' ? (
                <Badge variant="destructive" className="text-xs">
                  Falha
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Não testado
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">CAPI</span>
              {currentUser?.meta_capi_status === 'connected' ||
              currentUser?.meta_capi_status === 'active' ||
              currentUser?.meta_capi_status === 'valid' ? (
                <Badge className="bg-green-500 hover:bg-green-600 text-xs">Conectado</Badge>
              ) : currentUser?.meta_capi_status === 'error' ? (
                <Badge variant="destructive" className="text-xs">
                  Falha
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Não testado
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Pixel: {currentUser?.meta_dataset_id || currentUser?.meta_pixel_id || '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">IA Interações</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {showSkeleton ? <StatSkeleton /> : iaInteractions}
            </div>
            <p className="text-xs text-muted-foreground">Leads Totais</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Configurações Rápidas</CardTitle>
            <CardDescription>Acesso rápido aos módulos principais da plataforma.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
              <div className="space-y-1">
                <h4 className="font-medium text-sm">Integração Meta CAPI</h4>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Gerencie sua conexão com a API de Conversões da Meta (CAPI) para otimizar eventos.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/settings/connections">
                  Configurar Meta CAPI <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Suspense fallback={<SectionFallback />}>
        <PausedAwareSection paused={realtimePaused}>
          <IntegrityDiagnostics />
        </PausedAwareSection>
      </Suspense>

      {/* Performance Dashboard — analytics are lazy-loaded (IntersectionObserver)
          so the heavy conversation fetch is deferred until the section scrolls
          into view, instead of firing on initial mount alongside the stat cards.
          While realtime is paused, a subtle notice is shown instead. */}
      <Suspense fallback={<SectionFallback />}>
        <PausedAwareSection paused={realtimePaused}>
          <PerformanceDashboard />
        </PausedAwareSection>
      </Suspense>
    </div>
  )
}

export default function Dashboard() {
  // The provider owns every realtime subscription for the page; child
  // components subscribe through the shared context instead of each opening
  // their own channel. Realtime is PAUSED by default inside the provider, so
  // mounting this page performs zero realtime work until the user activates it.
  return (
    <DashboardRealtimeProvider>
      <DashboardInner />
    </DashboardRealtimeProvider>
  )
}
