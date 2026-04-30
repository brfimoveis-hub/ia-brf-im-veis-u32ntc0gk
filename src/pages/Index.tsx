import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCustomers, Customer } from '@/services/customers'
import { getSystemLogs, SystemLog } from '@/services/system_logs'
import { getConversations, Conversation } from '@/services/conversations'
import { useRealtime } from '@/hooks/use-realtime'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, Activity, Users, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/hooks/use-auth'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export default function Index() {
  const { user } = useAuth()
  const [currentUser, setCurrentUser] = useState(user)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const [custData, logsData, convData] = await Promise.all([
        getCustomers(),
        getSystemLogs(1, 100),
        getConversations(),
      ])
      setCustomers(custData)
      setLogs(logsData.items)
      setConversations(convData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setCurrentUser(user)
  }, [user])

  useRealtime('users', (e) => {
    if (e.action === 'update' && e.record.id === user?.id) {
      setCurrentUser(e.record as any)
    }
  })

  useRealtime('customers', (e) => {
    if (e.action === 'create') setCustomers((prev) => [e.record as Customer, ...prev])
    else if (e.action === 'update')
      setCustomers((prev) => prev.map((c) => (c.id === e.record.id ? (e.record as Customer) : c)))
    else if (e.action === 'delete') setCustomers((prev) => prev.filter((c) => c.id !== e.record.id))
  })

  useRealtime('system_logs', (e) => {
    if (e.action === 'create') setLogs((prev) => [e.record as SystemLog, ...prev].slice(0, 100))
  })

  useRealtime('conversations', (e) => {
    if (e.action === 'create') setConversations((prev) => [...prev, e.record as Conversation])
  })

  const funnelData = useMemo(() => {
    const counts = customers.reduce(
      (acc, c) => {
        const status = (c.status || 'sem_status').toLowerCase()
        acc[status] = (acc[status] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const statusOrder = [
      'novo',
      'em_atendimento',
      'qualificado',
      'agendado',
      'visita_realizada',
      'proposta',
      'vendido',
      'perdido',
    ]

    return Object.entries(counts)
      .map(([status, count]) => ({
        status: status.replace(/_/g, ' ').toUpperCase(),
        count,
        rawStatus: status,
      }))
      .sort((a, b) => {
        const idxA = statusOrder.indexOf(a.rawStatus.toLowerCase())
        const idxB = statusOrder.indexOf(b.rawStatus.toLowerCase())
        if (idxA !== -1 && idxB !== -1) return idxA - idxB
        if (idxA !== -1) return -1
        if (idxB !== -1) return 1
        return b.count - a.count
      })
  }, [customers])

  const deliveryStatus = useMemo(() => {
    if (!currentUser) return { active: true, reason: '' }
    if (currentUser.delivery_enabled === false)
      return { active: false, reason: 'Envios pausados manualmente' }

    const days = currentUser.delivery_days || [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
    ]
    const start = currentUser.delivery_start_time || '08:00'
    const end = currentUser.delivery_end_time || '18:00'

    const now = new Date()
    const brTime = new Date(now.getTime() - 3 * 3600 * 1000)
    const dayOfWeek = brTime.getUTCDay()
    const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const currentDay = daysMap[dayOfWeek]

    const h = brTime.getUTCHours().toString().padStart(2, '0')
    const m = brTime.getUTCMinutes().toString().padStart(2, '0')
    const timeStr = `${h}:${m}`

    if (!days.includes(currentDay))
      return { active: false, reason: `Hoje não é dia de envio ativo` }
    if (timeStr < start || timeStr > end)
      return { active: false, reason: `Fora do horário (${start} às ${end})` }

    return { active: true, reason: 'Ativo e dentro do horário' }
  }, [currentUser])

  const chartConfig = {
    count: {
      label: 'Leads',
      color: 'hsl(var(--primary))',
    },
  }

  const identityChecks = useMemo(() => {
    if (!currentUser) return { active: false, warnings: [], reasons: ['Usuário não carregado'] }
    const reasons: string[] = []
    const warnings: string[] = []
    const hasName = !!currentUser.ai_name?.trim()
    const hasInstructions = !!currentUser.ai_instructions?.trim()
    const metaStatus = currentUser.meta_token_status
    const hasMeta = metaStatus === 'active' || metaStatus === 'valid' || metaStatus === 'Connected'

    if (!hasName) reasons.push('Nome da IA não configurado.')
    if (!hasInstructions) reasons.push('Instruções da IA não configuradas.')
    if (!hasMeta) warnings.push('Integração Meta Ads pendente ou com erro.')

    return {
      active: hasName && hasInstructions,
      warnings,
      reasons,
    }
  }, [currentUser])

  const kpis = useMemo(() => {
    const totalLeads = customers.length
    const remarketingActive = customers.filter((c) => c.tags && c.tags.length > 0).length

    const remarketingLogs = logs.filter((l) => l.type.toUpperCase().includes('REMARKETING'))
    const successLogs = remarketingLogs.filter(
      (l) =>
        !l.message.toLowerCase().includes('erro') &&
        !l.message.toLowerCase().includes('falha') &&
        l.payload?.success !== false,
    )
    const syncHealth =
      remarketingLogs.length > 0
        ? Math.round((successLogs.length / remarketingLogs.length) * 100)
        : 100

    const captures24h = customers.filter(
      (c) => new Date(c.created).getTime() > Date.now() - 24 * 60 * 60 * 1000,
    ).length
    const activeIntegrations = 3 // Website, Instagram, YouTube

    return { totalLeads, remarketingActive, syncHealth, captures24h, activeIntegrations }
  }, [customers, logs])

  const performanceTableData = useMemo(() => {
    const latestInteractions = conversations.reduce(
      (acc, conv) => {
        if (
          !acc[conv.customer_id] ||
          new Date(conv.created) > new Date(acc[conv.customer_id].created)
        ) {
          acc[conv.customer_id] = conv
        }
        return acc
      },
      {} as Record<string, Conversation>,
    )

    return customers
      .map((c) => ({
        ...c,
        lastInteraction: latestInteractions[c.id]?.created || c.updated,
      }))
      .sort((a, b) => new Date(b.lastInteraction).getTime() - new Date(a.lastInteraction).getTime())
      .slice(0, 10)
  }, [customers, conversations])

  const integrationLogs = useMemo(() => {
    return logs
      .filter(
        (l) =>
          l.type.toUpperCase().includes('REMARKETING') ||
          l.type.toUpperCase().includes('DIAGNOSTIC') ||
          l.type.toUpperCase().includes('META'),
      )
      .slice(0, 20)
  }, [logs])

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-2 md:p-4 pb-20">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard de Vendas</h2>
          <div className="flex items-center gap-4">
            {currentUser && currentUser.ai_name && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full border shadow-sm">
                <div className="h-6 w-6 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
                  {currentUser.ai_avatar ? (
                    <img
                      src={pb.files.getURL(currentUser, currentUser.ai_avatar)}
                      alt={currentUser.ai_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] font-bold text-primary">
                      {currentUser.ai_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-secondary">{currentUser.ai_name}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-fit">
                  <Badge
                    variant={deliveryStatus.active ? 'default' : 'secondary'}
                    className={cn(
                      'px-3 py-1 cursor-help text-sm',
                      deliveryStatus.active && 'bg-blue-500 hover:bg-blue-600',
                      !deliveryStatus.active && 'bg-orange-500 hover:bg-orange-600 text-white',
                    )}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Envios: {deliveryStatus.active ? 'Ativos' : 'Pausados'}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end" className="max-w-[300px] p-3">
                <div className="space-y-1">
                  <p className="font-semibold text-sm">Status de Envio</p>
                  <p className="text-xs text-muted-foreground">{deliveryStatus.reason}</p>
                  <p className="text-[10px] text-muted-foreground pt-1 border-t mt-2">
                    Controla o disparo automático da IA para leads baseado nas configurações de
                    horário.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-fit">
                  <Badge
                    variant={identityChecks.active ? 'default' : 'destructive'}
                    className={cn(
                      'px-3 py-1 cursor-help text-sm',
                      identityChecks.active &&
                        identityChecks.warnings.length === 0 &&
                        'bg-green-500 hover:bg-green-600',
                      identityChecks.active &&
                        identityChecks.warnings.length > 0 &&
                        'bg-amber-500 hover:bg-amber-600 text-white',
                    )}
                  >
                    {identityChecks.active ? (
                      identityChecks.warnings.length > 0 ? (
                        <AlertCircle className="w-4 h-4 mr-2" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )
                    ) : (
                      <AlertCircle className="w-4 h-4 mr-2" />
                    )}
                    Identidade {identityChecks.active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              </TooltipTrigger>
              {(!identityChecks.active || identityChecks.warnings.length > 0) && (
                <TooltipContent side="bottom" align="end" className="max-w-[300px] p-3">
                  <div className="space-y-2">
                    {!identityChecks.active && (
                      <>
                        <p className="font-semibold text-sm text-destructive">
                          Ações Necessárias (Bloqueantes):
                        </p>
                        <ul className="text-xs list-disc pl-4 space-y-1 text-muted-foreground">
                          {identityChecks.reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                        <p className="text-[10px] text-muted-foreground pt-1 border-t mt-2">
                          A IA não responderá novos leads até que estas pendências sejam resolvidas
                          nas Configurações.
                        </p>
                      </>
                    )}
                    {identityChecks.active && identityChecks.warnings.length > 0 && (
                      <>
                        <p className="font-semibold text-sm text-amber-500">
                          Avisos (Não bloqueantes):
                        </p>
                        <ul className="text-xs list-disc pl-4 space-y-1 text-muted-foreground">
                          {identityChecks.warnings.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                        <p className="text-[10px] text-muted-foreground pt-1 border-t mt-2">
                          A IA continuará respondendo, mas algumas funcionalidades (como
                          rastreamento Meta) podem estar limitadas.
                        </p>
                      </>
                    )}
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
        <p className="text-muted-foreground">
          Acompanhe seu funil de vendas e a performance do remarketing em tempo real.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalLeads}</div>
            <p className="text-xs text-muted-foreground">Leads registrados no CRM</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Capturas (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+{kpis.captures24h}</div>
            <p className="text-xs text-muted-foreground">Novos leads hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Integrações Ativas</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{kpis.activeIntegrations}</div>
            <p className="text-xs text-muted-foreground">Fontes de captura saudáveis</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Remarketing Ativo</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.remarketingActive}</div>
            <p className="text-xs text-muted-foreground">Leads com tags</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Saúde do Meta Sync</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.syncHealth}%</div>
            <p className="text-xs text-muted-foreground">Taxa de sucesso</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Funil de Vendas</CardTitle>
            <CardDescription>Distribuição de leads por etapa do pipeline</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
              <BarChart
                data={funnelData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="status"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  width={120}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={32}>
                  {funnelData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`hsl(var(--primary) / ${1 - index * 0.15})`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Logs de Integração (Meta)</CardTitle>
            <CardDescription>Eventos recentes de remarketing e diagnóstico</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {integrationLogs.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    Nenhum log de integração encontrado.
                  </div>
                ) : (
                  integrationLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="mt-1 bg-muted p-1.5 rounded-full shrink-0">
                        {log.message.toLowerCase().includes('erro') ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <RefreshCw className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1 w-full min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">{log.type}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {format(new Date(log.created), 'dd/MM HH:mm')}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground line-clamp-2">
                          {log.message}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Recente</CardTitle>
          <CardDescription>
            Últimos leads que interagiram com a IA ou tiveram status atualizado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Última Interação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceTableData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      Nenhum lead encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  performanceTableData.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {customer.name || 'Sem nome'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal whitespace-nowrap">
                          {customer.source || 'Orgânico'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-[10px] uppercase whitespace-nowrap"
                        >
                          {customer.status?.replace(/_/g, ' ') || 'NOVO'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm whitespace-nowrap">
                        {format(new Date(customer.lastInteraction), "dd 'de' MMM 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
