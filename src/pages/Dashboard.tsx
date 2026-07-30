import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
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
import { MessageVolumeChart } from '@/components/dashboard/message-volume-chart'
import { AIResponseMetricsCard } from '@/components/dashboard/ai-response-metrics'
import { IntegrityDiagnostics } from '@/components/dashboard/integrity-diagnostics'
import { reportError } from '@/lib/error-reporter'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function Dashboard() {
  const { user } = useAuth()
  const [customerCount, setCustomerCount] = useState(0)
  const [cadenceCount, setCadenceCount] = useState(0)
  const [iaInteractions, setIaInteractions] = useState(0)
  const [statsError, setStatsError] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(user)

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    setStatsError(false)
    try {
      if (user) {
        try {
          const usr = await pb.collection('users').getOne(user.id)
          setCurrentUser(usr)
        } catch (err) {
          reportError({
            type: 'dashboard_user_error',
            message: err instanceof Error ? err.message : 'Failed to fetch user',
            details: { user_id: user.id },
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
  }, [user])

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user, fetchStats])

  useRealtime('users', (e) => {
    if (!user?.id || e.record.id !== user.id) return
    pb.collection('users')
      .getOne(user.id)
      .then((res) => {
        setCurrentUser(res)
      })
      .catch(console.error)
  })

  useRealtime('customers', () => {
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
  useRealtime('cadences', () => {
    pb.collection('cadences')
      .getList(1, 1, { filter: 'is_active = true', fields: 'id' })
      .then((res) => setCadenceCount(res.totalItems))
      .catch(console.error)
  })
  useRealtime('leads', () => {
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

      {/* Performance Dashboard */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Performance Dashboard</h3>
          <p className="text-sm text-muted-foreground">
            Monitoramento de volume e eficiência da IA em tempo real.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-4 lg:col-span-3">
            <MessageVolumeChart />
          </div>
          <div className="col-span-4 lg:col-span-1">
            <AIResponseMetricsCard />
          </div>
        </div>
      </div>
    </div>
  )
}
