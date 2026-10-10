import { useState, useCallback, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  MessageSquare,
  Bot,
  Activity,
  BarChart3,
  RefreshCw,
  ArrowUpRight,
  Trash2,
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Sequential delay between dashboard fetches (ms).
const FETCH_DELAY_MS = 300

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const PLACEHOLDER = 'Carregar dados'

export default function Dashboard() {
  const { user } = useAuth()

  const [customerCount, setCustomerCount] = useState<number | null>(null)
  const [iaInteractions, setIaInteractions] = useState<number | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(user || null)

  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadDashboard = useCallback(async () => {
    if (loading) return
    setLoading(true)
    try {
      // 1) User / integration data
      const targetUserId = user?.id || pb.authStore.record?.id
      if (targetUserId) {
        try {
          const usr = await pb.collection('users').getOne(targetUserId)
          setCurrentUser(usr)
        } catch (err) {
          console.error('dashboard user fetch failed', err)
        }
      }
      await wait(FETCH_DELAY_MS)

      // 2) Customers count
      try {
        const res = await pb.collection('customers').getList(1, 1, { fields: 'id' })
        setCustomerCount(res.totalItems)
      } catch (err) {
        console.error('dashboard customers fetch failed', err)
        setCustomerCount(null)
      }
      await wait(FETCH_DELAY_MS)

      // 3) Leads / IA interactions count
      try {
        const res = await pb.collection('leads').getList(1, 1, { fields: 'id' })
        setIaInteractions(res.totalItems)
      } catch (err) {
        console.error('dashboard leads fetch failed', err)
        setIaInteractions(null)
      }
    } finally {
      setLoading(false)
      setLoaded(true)
    }
  }, [loading, user?.id])

  // Carga automática inicial suave para o usuário ver números reais no celular e desktop
  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboard()
    }, 150)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const renderValue = (value: number | null) => {
    if (loading && !loaded) {
      return (
        <span className="text-sm font-normal text-muted-foreground inline-flex items-center gap-1.5">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <span>Carregando...</span>
        </span>
      )
    }
    if (!loaded && value === null) {
      return <span className="text-sm font-normal text-muted-foreground">{PLACEHOLDER}</span>
    }
    return <span>{value ?? 0}</span>
  }

  const getButtonText = () => {
    if (loading) return 'Atualizando...'
    if (loaded) return 'Atualizar Dashboard'
    return 'Carregar Dados'
  }

  const renderWhatsAppBadge = () => {
    if (!loaded) {
      return <span className="text-xs text-muted-foreground">{PLACEHOLDER}</span>
    }
    const status = currentUser?.meta_token_status
    if (status === 'active') {
      return <Badge className="bg-green-500 hover:bg-green-600 text-xs">Ativo</Badge>
    }
    if (status === 'error') {
      return (
        <Badge variant="destructive" className="text-xs">
          Falha
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="text-xs">
        Não testado
      </Badge>
    )
  }

  const renderCapiBadge = () => {
    if (!loaded) {
      return <span className="text-xs text-muted-foreground">{PLACEHOLDER}</span>
    }
    const status = currentUser?.meta_capi_status
    const isConnected =
      status === 'connected' || status === 'active' || status === 'ok' || status === 'valid'
    if (isConnected) {
      return <Badge className="bg-green-500 hover:bg-green-600 text-xs">Conectado</Badge>
    }
    if (status === 'error') {
      return (
        <Badge variant="destructive" className="text-xs">
          Falha
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="text-xs">
        Não testado
      </Badge>
    )
  }

  const getPixelLabel = () => {
    if (!loaded) return PLACEHOLDER
    return currentUser?.meta_dataset_id || currentUser?.meta_pixel_id || '—'
  }

  const userName = currentUser?.name || user?.name || 'Administrador'

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-8">
      {/* Banner / Header com botão de ação bem visível no mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border shadow-xs">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Cérebro do Sistema
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            <span>Bem-vindo de volta, </span>
            <span className="font-semibold text-slate-900 dark:text-slate-200">{userName}</span>
            <span> • Gestão imobiliária inteligente</span>
          </p>
        </div>
        <Button
          onClick={loadDashboard}
          disabled={loading}
          className="w-full sm:w-auto shrink-0 shadow-sm"
          size="sm"
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          <span>{getButtonText()}</span>
        </Button>
      </div>

      {/* Grid de Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Clientes */}
        <Card
          onClick={() => {
            if (!loaded && !loading) loadDashboard()
          }}
          className={cn(
            'transition-all cursor-pointer hover:border-primary/50',
            !loaded && 'bg-slate-50/70 dark:bg-slate-900/40',
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{renderValue(customerCount)}</div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">Na base de dados</p>
          </CardContent>
        </Card>

        {/* IA Interações / Leads */}
        <Card
          onClick={() => {
            if (!loaded && !loading) loadDashboard()
          }}
          className={cn(
            'transition-all cursor-pointer hover:border-primary/50',
            !loaded && 'bg-slate-50/70 dark:bg-slate-900/40',
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Atendimentos IA</CardTitle>
            <Bot className="h-4 w-4 text-emerald-600 shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{renderValue(iaInteractions)}</div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">Leads capturados</p>
          </CardContent>
        </Card>

        {/* Status Integrações */}
        <Card className="col-span-1 sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Integrações</CardTitle>
            <Activity className="h-4 w-4 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0 space-y-2 sm:space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">WhatsApp API</span>
              <div>{renderWhatsAppBadge()}</div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Meta CAPI</span>
              <div>{renderCapiBadge()}</div>
            </div>
            <p className="text-[11px] text-muted-foreground truncate pt-0.5">
              <span>Pixel: </span>
              <span className="font-mono">{getPixelLabel()}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Acesso rápido às áreas mais usadas no celular */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Card de Atendimento Bia */}
        <Card className="hover:border-primary/60 transition-colors shadow-xs">
          <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Bot className="h-5 w-5 text-emerald-600" />
                Central de Atendimentos (Bia)
              </CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Acompanhe as conversas em tempo real estilo WhatsApp e o que a Bia está respondendo.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <Button
              asChild
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
            >
              <Link to="/atendimentos">Abrir Painel de Atendimentos</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Card Conexões */}
        <Card className="hover:border-primary/60 transition-colors shadow-xs">
          <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Conexões & Meta CAPI
              </CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Gerencie a conexão com a API oficial do WhatsApp, Instagram e CAPI da Meta.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <Button asChild variant="outline" className="w-full" size="sm">
              <Link to="/settings/connections">Gerenciar Conexões</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Banner / Card Especial: Faxina de Ativos Meta Aprovada */}
      <Card className="border-red-500/30 bg-gradient-to-r from-red-500/10 via-amber-500/5 to-transparent hover:border-red-500/50 transition-colors shadow-xs">
        <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-red-600 text-white shadow-xs">
                <Trash2 className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2 flex-wrap">
                  <span>Faxina de Ativos Meta (Aprovada)</span>
                  <Badge className="bg-red-600 text-white text-[10px] font-semibold">
                    LIMPEZA GERAL
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30 font-medium"
                  >
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    WABA &amp; Página Oficial 1219427617930954 Protegidos
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-0.5">
                  Checklist interativo para desvincular contas antigas (como @brf_imoveis_), páginas
                  duplicadas e ativos órfãos do Business Manager.
                </CardDescription>
              </div>
            </div>
            <Button
              asChild
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white shrink-0 gap-1.5 shadow-xs"
            >
              <Link to="/faxina-meta">
                <span>Abrir Faxina de Ativos</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Advanced features (realtime, performance dashboard, integrity
          diagnostics) are intentionally NOT rendered here to keep the
          dashboard 100% static on mount. They remain available on the settings
          pages. */}
      <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-sm text-muted-foreground">
        <Activity className="h-4 w-4 shrink-0" />
        <span>Recursos avançados disponíveis nas configurações.</span>
      </div>
    </div>
  )
}
