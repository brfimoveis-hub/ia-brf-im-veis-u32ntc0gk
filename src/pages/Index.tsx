import { useEffect, useState, useCallback, useRef } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  Bot,
  Layers,
  Target,
  Activity,
  AlertCircle,
  RefreshCw,
  Mail,
  MailOpen,
  MousePointerClick,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Link } from 'react-router-dom'

function StatCard({
  title,
  icon: Icon,
  value,
  subtitle,
}: {
  title: string
  icon: ComponentType<{ className?: string }>
  value: ReactNode
  subtitle: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

function FallbackCard() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Dados indisponíveis no momento.</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ leads: 0, customers: 0, cadences: 0 })
  const [email, setEmail] = useState({ sent: 0, opens: 0, clicks: 0, openRate: 0, clickRate: 0 })
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState({ status: 'disconnected', error: '', pixelId: '' })
  const [retrying, setRetrying] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadStats = useCallback(async () => {
    try {
      const [leadsRes, customersRes, cadencesRes, campaigns] = await Promise.all([
        pb.collection('leads').getList(1, 1, { filter: "status != 'converted'" }),
        pb.collection('customers').getList(1, 1),
        pb.collection('cadences').getList(1, 1, { filter: 'is_active = true' }),
        pb.collection('email_campaigns').getFullList(),
      ])
      setStats({
        leads: leadsRes.totalItems,
        customers: customersRes.totalItems,
        cadences: cadencesRes.totalItems,
      })
      const sent = campaigns.reduce((s: number, c: any) => s + (c.success_count || 0), 0)
      const opens = campaigns.reduce((s: number, c: any) => s + (c.unique_opens || 0), 0)
      const clicks = campaigns.reduce((s: number, c: any) => s + (c.unique_clicks || 0), 0)
      setEmail({
        sent,
        opens,
        clicks,
        openRate: sent > 0 ? Math.round((opens / sent) * 100) : 0,
        clickRate: opens > 0 ? Math.round((clicks / opens) * 100) : 0,
      })
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }, [])

  const refreshMeta = useCallback(async () => {
    if (!user) return
    try {
      const usr = await pb.collection('users').getOne(user.id)
      setMeta({
        status: usr.meta_capi_status || 'disconnected',
        error: usr.meta_capi_error || '',
        pixelId: usr.meta_pixel_id || '',
      })
    } catch (err) {
      console.error('Failed to refresh user:', err)
    }
  }, [user])

  useEffect(() => {
    let mounted = true
    const init = async () => {
      await Promise.all([loadStats(), refreshMeta()])
      if (mounted) setLoading(false)
    }
    init()
    return () => {
      mounted = false
    }
  }, [loadStats, refreshMeta])

  const debouncedRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadStats(), 300)
  }, [loadStats])

  useRealtime('users', () => refreshMeta())
  useRealtime('customers', debouncedRefresh)
  useRealtime('leads', debouncedRefresh)
  useRealtime('email_campaigns', debouncedRefresh)

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    [],
  )

  const handleRetry = useCallback(async () => {
    setRetrying(true)
    toast.info('Re-validando conexões...')
    try {
      await Promise.all([refreshMeta(), loadStats()])
    } finally {
      setRetrying(false)
    }
  }, [refreshMeta, loadStats])

  const connected = ['connected', 'active', 'valid'].includes(meta.status)
  const dash = loading ? '—' : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Cérebro do Sistema</h1>
        <p className="text-muted-foreground">
          Visão geral do seu Pipeline e atividade da Inteligência Artificial.
        </p>
      </div>

      <ErrorBoundary key="stats-grid" fallback={<FallbackCard />}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Novos Leads"
            icon={Users}
            value={dash ?? stats.leads}
            subtitle="Aguardando conversão"
          />
          <StatCard
            title="Clientes no Pipeline"
            icon={Layers}
            value={dash ?? stats.customers}
            subtitle="Oportunidades ativas"
          />
          <StatCard
            title="Cadências Ativas"
            icon={Target}
            value={dash ?? stats.cadences}
            subtitle="Follow-ups ativos"
          />
          <StatCard
            title="Atividade da BIA"
            icon={Bot}
            value="Ativa"
            subtitle="Monitorando interações"
          />
        </div>
      </ErrorBoundary>

      <ErrorBoundary key="email-grid" fallback={<FallbackCard />}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Emails Enviados"
            icon={Mail}
            value={dash ?? email.sent}
            subtitle="Envios bem-sucedidos"
          />
          <StatCard
            title="Taxa de Abertura"
            icon={MailOpen}
            value={dash ?? `${email.openRate}%`}
            subtitle={`${email.opens} aberturas`}
          />
          <StatCard
            title="Taxa de Clique"
            icon={MousePointerClick}
            value={dash ?? `${email.clickRate}%`}
            subtitle={`${email.clicks} cliques`}
          />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meta CAPI</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span
                    className={cn(
                      'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                      connected ? 'bg-emerald-400' : 'bg-red-400',
                    )}
                  />
                  <span
                    className={cn(
                      'relative inline-flex rounded-full h-3 w-3',
                      connected ? 'bg-emerald-500' : 'bg-red-500',
                    )}
                  />
                </span>
                <span
                  className={cn(
                    'text-lg font-bold',
                    connected ? 'text-emerald-600' : 'text-red-600',
                  )}
                >
                  {connected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Pixel ID: {meta.pixelId || 'Não configurado'}
              </p>
              {!connected && meta.error && (
                <p className="text-xs text-red-500 mt-1 line-clamp-2" title={meta.error}>
                  Erro: {meta.error}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>

      <ErrorBoundary key="quick-actions" fallback={null}>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">Gerenciar Campanhas de Email</h4>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Crie e monitore campanhas de email marketing.
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/email-marketing">
                    Ver Campanhas <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">Pipeline de Clientes</h4>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Acompanhe leads nas fases da cadência.
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/customers">
                    Ver Pipeline <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              {!connected && (
                <div className="flex items-center justify-between gap-4 p-4 border rounded-lg border-amber-200 bg-amber-50">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Conexões requerem atenção</p>
                      <p className="text-xs text-muted-foreground">
                        Tente re-validar as integrações.
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleRetry} disabled={retrying} variant="outline" size="sm">
                    <RefreshCw className={cn('mr-2 h-4 w-4', retrying && 'animate-spin')} />
                    Tentar novamente
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </ErrorBoundary>
    </div>
  )
}
