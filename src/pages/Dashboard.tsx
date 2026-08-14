import { useEffect, useState, useCallback, useRef } from 'react'
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
import { PerformanceDashboard } from '@/components/dashboard/performance-dashboard'
import { IntegrityDiagnostics } from '@/components/dashboard/integrity-diagnostics'
import {
  DashboardRealtimeProvider,
  useDashboardRealtimeEvent,
} from '@/components/dashboard/dashboard-realtime'
import { reportError } from '@/lib/error-reporter'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function DashboardInner() {
  const { user } = useAuth()
  const userId = user?.id
  const [customerCount, setCustomerCount] = useState(0)
  const [cadenceCount, setCadenceCount] = useState(0)
  const [iaInteractions, setIaInteractions] = useState(0)
  const [statsError, setStatsError] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(user)

  // Keep a ref to the latest user record id so realtime handlers (which are
  // registered once) can read it without depending on `user` in their closure.
  const userIdRef = useRef(userId)
  userIdRef.current = userId

  // Stable callback: only depends on the user id, not the `user` object. An
  // auth-refresh changes the `user` reference but keeps the id stable, so this
  // callback is NOT recreated and the initial-fetch effect does not re-fire.
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    setStatsError(false)
    try {
      const currentId = userIdRef.current
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

      const results = await Promise.allSettled([
        pb.collection('customers').getList(1, 1, { fields: 'id' }),
        pb.collection('cadences').getList(1, 1, { filter: 'is_active = true', fields: 'id' }),
        pb.collection('leads').getList(1, 1, { fields: 'id' }),
      ])

      const [customersRes, cadencesRes, iaRes] = results

      if (customersRes.status === 'fulfilled') {
        setCustomerCount(customersRes.value.totalItems)
      } else {
        reportError({
          type: 'dashboard_customers_error',
          message: 'Failed to fetch customers count',
          details: { reason: String(customersRes.reason) },
        })
      }
      if (cadencesRes.status === 'fulfilled') {
        setCadenceCount(cadencesRes.value.totalItems)
      } else {
        reportError({
          type: 'dashboard_cadences_error',
          message: 'Failed to fetch cadences count',
          details: { reason: String(cadencesRes.reason) },
        })
      }
      if (iaRes.status === 'fulfilled') {
        setIaInteractions(iaRes.value.totalItems)
      } else {
        reportError({
          type: 'dashboard_leads_error',
          message: 'Failed to fetch leads count',
          details: { reason: String(iaRes.reason) },
        })
      }

      const anyError =
        customersRes.status === 'rejected' ||
        cadencesRes.status === 'rejected' ||
        iaRes.status === 'rejected'
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
    }
  }, [])

  // Initial fetch — keyed on the id only, so auth-refresh does not retrigger.
  useEffect(() => {
    if (userId) {
      fetchStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // --- Realtime handlers (registered once via the shared provider) ----------
  // Only re-fetch the current user record when the event is for THIS user AND
  // the incoming record actually differs from what we already have.
  useDashboardRealtimeEvent('users', (e) => {
    const id = userIdRef.current
    if (!id || e.record.id !== id) return
    pb.collection('users')
      .getOne(id)
      .then((res) => {
        setCurrentUser((prev) => {
          if (prev && JSON.stringify(prev) === JSON.stringify(res)) return prev
          return res
        })
      })
      .catch(console.error)
  })

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

  useDashboardRealtimeEvent('leads', () => {
    pb.collection('leads')
      .getList(1, 1, { fields: 'id' })
      .then((res) => setIaInteractions(res.totalItems))
      .catch(console.error)
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">CRM Pipeline (Dashboard)</h2>
        <p className="text-muted-foreground">
          Bem-vindo de volta, {currentUser?.name || user?.name || 'Administrador'}.
        </p>
      </div>

      {statsError && (
        <ErrorBoundary
          key="stats-error-banner"
          title="Estatísticas"
          onRetry={fetchStats}
          logType="dashboard_stats_error"
        >
          <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Alguns dados não puderam ser carregados. Tente novamente.</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchStats} disabled={statsLoading}>
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
              {statsLoading && customerCount === 0 ? '—' : customerCount}
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
            <div className="text-2xl font-bold">{cadenceCount}</div>
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
            <div className="text-2xl font-bold">{iaInteractions}</div>
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

      <IntegrityDiagnostics />

      {/* Performance Dashboard — analytics are lazy-loaded (IntersectionObserver)
          so the heavy conversation fetch is deferred until the section scrolls
          into view, instead of firing on initial mount alongside the stat cards. */}
      <PerformanceDashboard />
    </div>
  )
}

export default function Dashboard() {
  // The provider owns every realtime subscription for the page; child
  // components subscribe through the shared context instead of each opening
  // their own channel.
  return (
    <DashboardRealtimeProvider>
      <DashboardInner />
    </DashboardRealtimeProvider>
  )
}
