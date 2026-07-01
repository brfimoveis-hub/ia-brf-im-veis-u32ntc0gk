import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Bot, Layers, Target, Activity, AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const normalizeUazapiState = (state: string): string => {
  if (!state) return 'disconnected'
  const s = state.toLowerCase()
  if (s === 'open' || s === 'connected') return 'connected'
  if (s === 'qr_ready' || s === 'qrcode' || s === 'qr') return 'qr_ready'
  if (s === 'connecting' || s === 'loading') return 'connecting'
  return s
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ leads: 0, customers: 0 })
  const [loading, setLoading] = useState(true)
  const [uazapiStatus, setUazapiStatus] = useState('disconnected')
  const [uazapiError, setUazapiError] = useState('')
  const [metaCapiStatus, setMetaCapiStatus] = useState('disconnected')
  const [metaCapiError, setMetaCapiError] = useState('')
  const [instanceNumber, setInstanceNumber] = useState('554892098050')
  const [pixelId, setPixelId] = useState('')
  const [retrying, setRetrying] = useState(false)

  const loadStats = useCallback(async () => {
    try {
      const [leadsRes, customersRes] = await Promise.all([
        pb.collection('leads').getList(1, 1, { filter: "status != 'converted'" }),
        pb.collection('customers').getList(1, 1),
      ])
      setStats({ leads: leadsRes.totalItems, customers: customersRes.totalItems })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshUserStatus = useCallback(async () => {
    if (!user) return
    try {
      const usr = await pb.collection('users').getOne(user.id)
      setUazapiStatus(usr.uazapi_status || 'disconnected')
      setUazapiError(usr.uazapi_error || '')
      setMetaCapiStatus(usr.meta_capi_status || 'disconnected')
      setMetaCapiError(usr.meta_capi_error || '')
      setInstanceNumber(usr.uazapi_instance_number || '554892098050')
      setPixelId(usr.meta_pixel_id || '')
    } catch (err) {
      console.error(err)
    }
  }, [user])

  const checkConnections = useCallback(async () => {
    setRetrying(true)
    try {
      try {
        const res = await pb.send('/backend/v1/uazapi/status', { method: 'GET' })
        if (res?.data) {
          const state = normalizeUazapiState(res.state || 'unknown')
          setUazapiStatus(state)
          setUazapiError(res.data.lastDisconnectReason || res.data.message || '')
        }
      } catch (err: any) {
        setUazapiStatus('error')
        setUazapiError(
          err?.response?.error?.message ||
            err?.response?.message ||
            err?.message ||
            'Falha ao verificar conexão UAZAPI.',
        )
      }
      await refreshUserStatus()
    } finally {
      setRetrying(false)
    }
  }, [refreshUserStatus])

  useEffect(() => {
    loadStats()
    refreshUserStatus()
    checkConnections()
  }, [loadStats, refreshUserStatus, checkConnections])

  useRealtime('users', () => {
    refreshUserStatus()
  })

  useRealtime('customers', () => {
    loadStats()
  })

  useRealtime('leads', () => {
    loadStats()
  })

  const handleRetry = useCallback(() => {
    toast.info('Re-validando conexões...', {
      description: 'Verificando status de UAZAPI e Meta CAPI.',
    })
    checkConnections()
  }, [checkConnections])

  const isUazapiConnected = uazapiStatus === 'connected' || uazapiStatus === 'online'
  const isMetaCapiConnected =
    metaCapiStatus === 'connected' || metaCapiStatus === 'active' || metaCapiStatus === 'valid'
  const hasConnectionIssues = !isUazapiConnected || !isMetaCapiConnected

  const uazapiDotClass = isUazapiConnected
    ? 'bg-emerald-500'
    : uazapiStatus === 'qr_ready'
      ? 'bg-amber-500'
      : 'bg-red-500'
  const uazapiPingClass = isUazapiConnected
    ? 'bg-emerald-400'
    : uazapiStatus === 'qr_ready'
      ? 'bg-amber-400'
      : 'bg-red-400'
  const uazapiTextClass = isUazapiConnected
    ? 'text-emerald-600'
    : uazapiStatus === 'qr_ready'
      ? 'text-amber-600'
      : 'text-red-600'
  const uazapiLabel = isUazapiConnected
    ? 'Conectado'
    : uazapiStatus === 'qr_ready'
      ? 'QR Code Pronto'
      : uazapiStatus === 'connecting'
        ? 'Conectando...'
        : 'Desconectado'

  const metaDotClass = isMetaCapiConnected ? 'bg-emerald-500' : 'bg-red-500'
  const metaPingClass = isMetaCapiConnected ? 'bg-emerald-400' : 'bg-red-400'
  const metaTextClass = isMetaCapiConnected ? 'text-emerald-600' : 'text-red-600'
  const metaLabel = isMetaCapiConnected ? 'Conectado' : 'Desconectado'

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Cérebro do Sistema</h1>
        <p className="text-muted-foreground">
          Visão geral do seu Pipeline e atividade da Inteligência Artificial.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : stats.leads}</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando conversão no Pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes no Pipeline</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : stats.customers}</div>
            <p className="text-xs text-muted-foreground mt-1">Total de oportunidades ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estágios do Pipeline</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">10</div>
            <p className="text-xs text-muted-foreground mt-1">D0 até D9 estruturados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atividade da BIA</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ativa</div>
            <p className="text-xs text-muted-foreground mt-1">Monitorando interações</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">WhatsApp (UAZAPI)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span
                  className={cn(
                    'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                    uazapiPingClass,
                  )}
                />
                <span className={cn('relative inline-flex rounded-full h-3 w-3', uazapiDotClass)} />
              </span>
              <span className={cn('text-lg font-bold', uazapiTextClass)}>{uazapiLabel}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Instância: {instanceNumber}</p>
            {!isUazapiConnected && uazapiError && (
              <p className="text-xs text-red-500 mt-1 line-clamp-2" title={uazapiError}>
                Erro: {uazapiError}
              </p>
            )}
          </CardContent>
        </Card>

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
                    metaPingClass,
                  )}
                />
                <span className={cn('relative inline-flex rounded-full h-3 w-3', metaDotClass)} />
              </span>
              <span className={cn('text-lg font-bold', metaTextClass)}>{metaLabel}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pixel ID: {pixelId || 'Não configurado'}
            </p>
            {!isMetaCapiConnected && metaCapiError && (
              <p className="text-xs text-red-500 mt-1 line-clamp-2" title={metaCapiError}>
                Erro: {metaCapiError}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {hasConnectionIssues && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Conexões requerem atenção</p>
                  <p className="text-xs text-muted-foreground">
                    Algumas integrações não estão conectadas. Tente re-validar.
                  </p>
                </div>
              </div>
              <Button onClick={handleRetry} disabled={retrying} variant="outline" size="sm">
                <RefreshCw className={cn('mr-2 h-4 w-4', retrying && 'animate-spin')} />
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
