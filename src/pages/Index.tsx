import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Target,
  Users,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Bot,
  MessagesSquare,
  BellRing,
} from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Customer {
  id: string
  name: string
  status: string
  urgency: number
  neighborhood: string
  price_range: string
  created: string
}

interface Log {
  id: string
  type: string
  message: string
  details: string
  created: string
}

export default function Dashboard() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const [customersRes, logsRes] = await Promise.all([
        pb.collection('customers').getList<Customer>(1, 5, {
          sort: '-updated',
          filter: 'urgency >= 4',
        }),
        pb.collection('system_logs').getList<Log>(1, 10, {
          sort: '-created',
          filter: 'type = "notification"',
        }),
      ])
      setCustomers(customersRes.items)
      setLogs(logsRes.items)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('customers', (e) => {
    if (e.action === 'update' && e.record.urgency >= 4) {
      toast.error('Lead de Alta Urgência!', {
        description: `${e.record.name} atingiu nível de urgência ${e.record.urgency}.`,
        duration: 8000,
        icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
      })
      loadData()
    } else if (e.action === 'create' && e.record.urgency >= 4) {
      toast.error('Novo Lead Quente!', {
        description: `${e.record.name} entrou com nível de urgência ${e.record.urgency}.`,
        duration: 8000,
        icon: <Target className="h-5 w-5 text-destructive" />,
      })
      loadData()
    }
  })

  useRealtime('system_logs', (e) => {
    if (e.action === 'create' && e.record.type === 'notification') {
      loadData()
    }
  })

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard BIA</h2>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="px-3 py-1">
            <Bot className="w-4 h-4 mr-2 text-primary" />
            Agente 10-Passos Ativo
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Qualificados</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+24</div>
            <p className="text-xs text-muted-foreground">esta semana</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgência Alta (4-5)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground">precisam de atenção de corretor</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visitas Agendadas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+3 para hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interações BIA</CardTitle>
            <MessagesSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.240</div>
            <p className="text-xs text-muted-foreground">
              mensagens enviadas no fluxo de 10 passos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Leads Quentes (Urgência 4-5)</CardTitle>
            <CardDescription>
              Leads identificados pela BIA que precisam de intervenção humana imediata.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-6">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center p-6 text-muted-foreground">
                Nenhum lead com alta urgência no momento.
              </div>
            ) : (
              <div className="space-y-4">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <p className="font-medium leading-none">{customer.name || 'Sem nome'}</p>
                      <p className="text-sm text-muted-foreground">
                        {customer.neighborhood || 'Bairro não informado'} •{' '}
                        {customer.price_range || 'Valor não informado'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="destructive" className="ml-auto">
                        Urgência {customer.urgency}
                      </Badge>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/customers/${customer.id}`}>
                          Ver CRM <ArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Notificações do Sistema</CardTitle>
            <CardDescription>Alertas gerados pela qualificação da BIA.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-6">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center p-6 text-muted-foreground">
                Nenhuma notificação recente.
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="mt-1 bg-primary/10 p-2 rounded-full flex-shrink-0">
                      <BellRing className="w-4 h-4 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{log.message}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{log.details}</p>
                      <p className="text-[10px] text-muted-foreground pt-1">
                        {format(new Date(log.created), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
