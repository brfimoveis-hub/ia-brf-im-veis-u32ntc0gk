import { useState, useEffect } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  Users,
  MessageSquare,
  Phone,
} from 'lucide-react'
import useRealtime from '@/hooks/use-realtime'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

function UazapiStatusBadge({ status }: { status?: string }) {
  if (!status || status === 'offline') {
    return (
      <Badge variant="destructive" className="flex w-fit items-center gap-1">
        <XCircle className="w-3 h-3" /> Offline
      </Badge>
    )
  }
  if (status === 'connected' || status === 'Saudável') {
    return (
      <Badge
        variant="default"
        className="bg-emerald-500 hover:bg-emerald-600 flex w-fit items-center gap-1"
      >
        <CheckCircle2 className="w-3 h-3" /> Conectado
      </Badge>
    )
  }
  if (status === 'qr_ready' || status === 'connecting') {
    return (
      <Badge
        variant="secondary"
        className="flex w-fit items-center gap-1 text-yellow-600 dark:text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20"
      >
        <Loader2 className="w-3 h-3 animate-spin" /> Conectando...
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="flex w-fit items-center gap-1">
      <AlertCircle className="w-3 h-3" /> {status}
    </Badge>
  )
}

function UazapiConnectionDetails({
  user,
  status,
  error,
}: {
  user: any
  status?: string
  error?: string
}) {
  const instanceNumber = user?.uazapi_instance_number || 'Não configurada'
  const domain = user?.uazapi_domain || 'Não configurado'

  const safeError = error && typeof error === 'object' ? JSON.stringify(error) : String(error || '')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div key="instance-block">
          <span className="text-muted-foreground block mb-1">Instância</span>
          <span className="font-medium truncate block">{instanceNumber}</span>
        </div>
        <div key="domain-block">
          <span className="text-muted-foreground block mb-1">Domínio</span>
          <span className="font-medium truncate block">{domain}</span>
        </div>
      </div>

      {safeError ? (
        <Alert variant="destructive" className="mt-4" key="error-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro de Conexão</AlertTitle>
          <AlertDescription className="break-all">{safeError}</AlertDescription>
        </Alert>
      ) : null}

      {status === 'connected' || status === 'Saudável' ? (
        <Alert
          className="mt-4 border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          key="success-alert"
        >
          <CheckCircle2 className="h-4 w-4 stroke-emerald-600 dark:stroke-emerald-400" />
          <AlertTitle>Tudo certo!</AlertTitle>
          <AlertDescription>
            Sua instância Uazapi ({instanceNumber}) está conectada e pronta para enviar e receber
            mensagens.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}

function DashboardErrorFallback() {
  return (
    <Alert variant="destructive" className="mt-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Erro ao carregar painel</AlertTitle>
      <AlertDescription>
        Ocorreu um erro inesperado ao renderizar os componentes do painel. Um log foi enviado para a
        equipe técnica.
      </AlertDescription>
    </Alert>
  )
}

export default function Index() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ leads: 0, customers: 0, conversations: 0 })
  const [currentUser, setCurrentUser] = useState(user)

  useRealtime('users', (e) => {
    if (e.action === 'update' && e.record.id === user?.id) {
      setCurrentUser(e.record)
    }
  })

  useEffect(() => {
    async function loadStats() {
      try {
        const [leadsList, customersList, convsList] = await Promise.all([
          pb.collection('leads').getList(1, 1, { filter: `assigned_to = "${user?.id}"` }),
          pb.collection('customers').getList(1, 1, { filter: `user_id = "${user?.id}"` }),
          pb
            .collection('conversations')
            .getList(1, 1, { filter: `customer_id.user_id = "${user?.id}"` }),
        ])
        setStats({
          leads: leadsList.totalItems,
          customers: customersList.totalItems,
          conversations: convsList.totalItems,
        })
      } catch (err) {
        console.error('Failed to load stats', err)
      }
    }
    if (user?.id) loadStats()
  }, [user?.id])

  const status = currentUser?.uazapi_status
  const error = currentUser?.uazapi_error

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <ErrorBoundary fallback={<DashboardErrorFallback />}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card key="stat-leads">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.leads}</div>
            </CardContent>
          </Card>
          <Card key="stat-customers">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.customers}</div>
            </CardContent>
          </Card>
          <Card key="stat-conversations">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversas</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.conversations}</div>
            </CardContent>
          </Card>
          <Card key="stat-uazapi">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status Uazapi</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <UazapiStatusBadge status={status} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
          <Card className="col-span-4" key="connection-card">
            <CardHeader>
              <CardTitle>Conexão Uazapi</CardTitle>
              <CardDescription>
                Monitoramento em tempo real do status da sua instância WhatsApp.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UazapiConnectionDetails user={currentUser} status={status} error={error} />
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>
    </div>
  )
}
