import { useEffect, useState, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  Activity,
  Users,
  UserPlus,
  RefreshCw,
  AlertCircle,
  Settings,
  MessageSquare,
  Smartphone,
  CheckCircle2,
  XCircle,
  QrCode,
  Link as LinkIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function Index() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [loadingUser, setLoadingUser] = useState(true)
  const [testingConnection, setTestingConnection] = useState(false)

  const [metrics, setMetrics] = useState({ leads: 0, customers: 0, conversations: 0 })
  const [logs, setLogs] = useState<any[]>([])
  const [userData, setUserData] = useState<any>(user)

  const fetchMetrics = useCallback(async () => {
    if (!user) return
    try {
      const [leads, customers, conversations] = await Promise.all([
        pb.collection('leads').getList(1, 1, { filter: `assigned_to = "${user.id}"` }),
        pb.collection('customers').getList(1, 1, { filter: `user_id = "${user.id}"` }),
        pb
          .collection('conversations')
          .getList(1, 1, { filter: `customer_id.user_id = "${user.id}"` }),
      ])
      setMetrics({
        leads: leads.totalItems,
        customers: customers.totalItems,
        conversations: conversations.totalItems,
      })
    } catch (error) {
      console.error('Error fetching metrics', error)
    } finally {
      setLoadingMetrics(false)
    }
  }, [user])

  const fetchLogs = useCallback(async () => {
    try {
      const logsData = await pb.collection('system_logs').getList(1, 5, { sort: '-created' })
      setLogs(logsData.items)
    } catch (error) {
      console.error('Error fetching logs', error)
    } finally {
      setLoadingLogs(false)
    }
  }, [])

  const fetchUserData = useCallback(async () => {
    if (!user) return
    try {
      const u = await pb.collection('users').getOne(user.id)
      setUserData(u)
    } catch (error) {
      console.error('Error fetching user', error)
    } finally {
      setLoadingUser(false)
    }
  }, [user])

  useEffect(() => {
    fetchMetrics()
    fetchLogs()
    fetchUserData()
  }, [fetchMetrics, fetchLogs, fetchUserData])

  useRealtime('users', (e) => {
    if (e.record.id === user?.id) {
      setUserData(e.record)
    }
  })

  useRealtime('system_logs', () => fetchLogs())
  useRealtime('leads', () => fetchMetrics())
  useRealtime('customers', () => fetchMetrics())
  useRealtime('conversations', () => fetchMetrics())

  const testConnection = async () => {
    setTestingConnection(true)
    try {
      await pb.send('/backend/v1/uazapi/test_connection', { method: 'POST' })
      toast({
        title: 'Teste de conexão iniciado',
        description: 'A requisição foi enviada com sucesso. O status será atualizado em breve.',
      })
      await fetchUserData()
    } catch (error: any) {
      const msg = getErrorMessage(error)
      const isAuthError =
        error?.status === 404 ||
        msg.toLowerCase().includes('token') ||
        msg.toLowerCase().includes('invalid')
      toast({
        title: 'Erro ao testar conexão',
        description: isAuthError
          ? 'Por favor, verifique suas credenciais de acesso no painel de configurações da Uazapi.'
          : msg,
        variant: 'destructive',
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'connected':
      case 'conectado':
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Conectado
          </Badge>
        )
      case 'error':
      case 'erro':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" /> Erro
          </Badge>
        )
      case 'disconnected':
      case 'desconectado':
        return (
          <Badge variant="secondary">
            <AlertCircle className="w-3 h-3 mr-1" /> Desconectado
          </Badge>
        )
      case 'qr_code':
      case 'qrcode':
      case 'qr code':
        return (
          <Badge variant="outline" className="text-orange-500 border-orange-500">
            <QrCode className="w-3 h-3 mr-1" /> Aguardando QR Code
          </Badge>
        )
      default:
        return <Badge variant="outline">{status || 'Desconhecido'}</Badge>
    }
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingMetrics ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{metrics.leads}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes (Base)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingMetrics ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{metrics.customers}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversas Ativas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingMetrics ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{metrics.conversations}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 flex flex-col">
          <CardHeader>
            <CardTitle>Status da Conexão Uazapi</CardTitle>
            <CardDescription>Monitore e gerencie sua conexão do WhatsApp.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            {loadingUser ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            ) : (
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Smartphone className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Instância: {userData?.uazapi_instance_number || 'Não configurada'}
                    </p>
                    <div className="flex items-center space-x-2 pt-1">
                      <p className="text-sm text-muted-foreground">Status Atual:</p>
                      {getStatusBadge(userData?.uazapi_status)}
                    </div>
                  </div>
                </div>

                {userData?.uazapi_status?.toLowerCase() === 'error' && userData?.uazapi_error && (
                  <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-start">
                    <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                    <span>{userData.uazapi_error}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button onClick={testConnection} disabled={testingConnection || loadingUser} size="sm">
              {testingConnection ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Testar Conexão
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/configuracoes/conexoes/uazapi">
                <QrCode className="mr-2 h-4 w-4" />
                Ler QR Code / Configurar
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle>Atividade Recente do Sistema</CardTitle>
            <CardDescription>Últimos processos e webhooks.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 px-0 pb-0">
            {loadingLogs ? (
              <div className="space-y-4 px-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 px-6">
                Nenhuma atividade recente.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px] pl-6">Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="pr-6">Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground pl-6">
                        {format(new Date(log.created), 'dd/MM HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {log.type}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="text-xs truncate max-w-[120px] pr-6"
                        title={log.message}
                      >
                        {log.message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter className="pt-4">
            <Button asChild variant="ghost" className="w-full text-sm">
              <Link to="/logs">
                <Activity className="mr-2 h-4 w-4" />
                Ver todos os logs
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <Settings className="w-4 h-4 mr-2" /> Remarketing
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Gerencie suas campanhas de remarketing e sincronização.
          </CardContent>
          <CardFooter>
            <Button asChild variant="secondary" size="sm" className="w-full">
              <Link to="/configuracoes/remarketing">Ir para Remarketing</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <LinkIcon className="w-4 h-4 mr-2" /> Conexões Meta
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Configurar Facebook, Instagram e Pixel (CAPI).
          </CardContent>
          <CardFooter>
            <Button asChild variant="secondary" size="sm" className="w-full">
              <Link to="/configuracoes/conexoes/meta-capi">Ir para Conexões</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" /> Inteligência Bia
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Ajuste as diretrizes e comportamentos da IA.
          </CardContent>
          <CardFooter>
            <Button asChild variant="secondary" size="sm" className="w-full">
              <Link to="/configuracoes/bia">Ir para IA</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
