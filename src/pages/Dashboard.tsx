import { useState, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, MessageSquare, Bot, Activity, BarChart3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Sequential delay between dashboard fetches (ms). On low-resource / safe-mode
// machines firing several HTTP requests back-to-back congests the network
// pipeline and freezes the browser; a short pause between each keeps the main
// thread responsive.
const FETCH_DELAY_MS = 500

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Text shown in a stat card before the user has clicked "Carregar Dashboard".
const PLACEHOLDER = 'Clique em Carregar'

export default function Dashboard() {
  const { user } = useAuth()

  // Numbers are null until explicitly loaded via the button. On mount NOTHING
  // is fetched — no useEffect, no realtime, no polling, no idle callback —
  // the cards render a static placeholder instead.
  const [customerCount, setCustomerCount] = useState<number | null>(null)
  const [cadenceCount, setCadenceCount] = useState<number | null>(null)
  const [iaInteractions, setIaInteractions] = useState<number | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Has the user ever clicked the load button? Controls whether cards show
  // the placeholder ("Clique em Carregar") or their loaded number / state.
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)

  // Fired ONLY by an explicit click on "Carregar Dashboard". Sequential, one
  // request at a time, with a pause between each. Never runs on mount.
  const loadDashboard = useCallback(async () => {
    if (loading) return
    setLoading(true)
    try {
      // 1) User / integration data (single request).
      if (user?.id) {
        try {
          const usr = await pb.collection('users').getOne(user.id)
          setCurrentUser(usr)
        } catch (err) {
          console.error('dashboard user fetch failed', err)
        }
      }
      await wait(FETCH_DELAY_MS)

      // 2) Customers count.
      try {
        const res = await pb.collection('customers').getList(1, 1, { fields: 'id' })
        setCustomerCount(res.totalItems)
      } catch (err) {
        console.error('dashboard customers fetch failed', err)
        setCustomerCount(null)
      }
      await wait(FETCH_DELAY_MS)

      // 3) Cadences count.
      try {
        const res = await pb
          .collection('cadences')
          .getList(1, 1, { filter: 'is_active = true', fields: 'id' })
        setCadenceCount(res.totalItems)
      } catch (err) {
        console.error('dashboard cadences fetch failed', err)
        setCadenceCount(null)
      }
      await wait(FETCH_DELAY_MS)

      // 4) Leads / IA interactions count.
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

  // Renders a stat card value: placeholder before first load, the number once
  // loaded, or a loading indicator while the sequential fetch is in flight.
  const renderValue = (value: number | null) => {
    if (loading) return <span className="text-muted-foreground">Carregando…</span>
    if (!loaded) return <span className="text-muted-foreground">{PLACEHOLDER}</span>
    return value
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Bem-vindo de volta, {currentUser?.name || user?.name || 'Administrador'}.
          </p>
        </div>
        <Button onClick={loadDashboard} disabled={loading}>
          <BarChart3 className={cn('mr-2 h-4 w-4', loading && 'animate-pulse')} />
          {loading ? 'Carregando...' : loaded ? 'Atualizar Dashboard' : 'Carregar Dashboard'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{renderValue(customerCount)}</div>
            <p className="text-xs text-muted-foreground">Na base de dados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Cadências</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{renderValue(cadenceCount)}</div>
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
              {loaded ? (
                currentUser?.meta_token_status === 'active' ? (
                  <Badge className="bg-green-500 hover:bg-green-600 text-xs">Ativo</Badge>
                ) : currentUser?.meta_token_status === 'error' ? (
                  <Badge variant="destructive" className="text-xs">
                    Falha
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Não testado
                  </Badge>
                )
              ) : (
                <span className="text-xs text-muted-foreground">{PLACEHOLDER}</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">CAPI</span>
              {loaded ? (
                currentUser?.meta_capi_status === 'connected' ||
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
                )
              ) : (
                <span className="text-xs text-muted-foreground">{PLACEHOLDER}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Pixel:{' '}
              {loaded
                ? currentUser?.meta_dataset_id || currentUser?.meta_pixel_id || '—'
                : PLACEHOLDER}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">IA Interações</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{renderValue(iaInteractions)}</div>
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
                <Link to="/settings/connections">Configurar Meta CAPI</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

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
