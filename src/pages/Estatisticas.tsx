import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getWhatsAppStats,
  updateWhatsAppStatsSettings,
  type WhatsAppStatsResponse,
  type WhatsAppStatsCampaign,
} from '@/services/whatsapp_stats'
import {
  MessagesDailyChart,
  LeadsDailyChart,
  CostComparisonCard,
} from '@/components/statistics/wa-charts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from '@/hooks/use-toast'
import {
  MessageSquare,
  TrendingUp,
  DollarSign,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Send,
  HelpCircle,
  RefreshCw,
  Sliders,
  Calendar,
  Sparkles,
  BarChart3,
  ExternalLink,
} from 'lucide-react'

export default function Estatisticas() {
  const [data, setData] = useState<WhatsAppStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  // Formulário de configurações
  const [usdRate, setUsdRate] = useState<string>('5.65')
  const [marketingRate, setMarketingRate] = useState<string>('0.0625')
  const [serviceRate, setServiceRate] = useState<string>('0.008')
  const [leadsGoal, setLeadsGoal] = useState<string>('50')
  const [budgetGoal, setBudgetGoal] = useState<string>('300')

  const loadStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await getWhatsAppStats()
      setData(res)
      if (res.settings) {
        setUsdRate(String(res.settings.usd_to_brl_rate ?? '5.65'))
        setMarketingRate(String(res.settings.marketing_rate_usd ?? '0.0625'))
        setServiceRate(String(res.settings.service_rate_usd ?? '0.008'))
        setLeadsGoal(String(res.settings.monthly_leads_goal ?? '50'))
        setBudgetGoal(String(res.settings.monthly_investment_budget_brl ?? '300'))
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar estatísticas',
        description: err?.message || 'Não foi possível carregar os dados agora.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      if (isRefresh) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    try {
      await updateWhatsAppStatsSettings({
        usd_to_brl_rate: parseFloat(usdRate.replace(',', '.')) || 5.65,
        marketing_rate_usd: parseFloat(marketingRate.replace(',', '.')) || 0.0625,
        service_rate_usd: parseFloat(serviceRate.replace(',', '.')) || 0.008,
        monthly_leads_goal: parseInt(leadsGoal, 10) || 50,
        monthly_investment_budget_brl: parseFloat(budgetGoal.replace(',', '.')) || 300,
      })
      toast({
        title: 'Configurações salvas!',
        description: 'As tarifas e projeções foram recalculadas com sucesso.',
      })
      await loadStats(true)
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar configurações',
        description: err?.message || 'Verifique os valores e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSavingSettings(false)
    }
  }

  const summary = data?.summary
  const health = data?.health
  const campaigns = data?.campaigns || []
  const settings = data?.settings

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Estatísticas & Gerenciamento
            </h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              WhatsApp & Meta
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Gestão transparente de investimento, entrega de mensagens e projeção dos custos da Meta
            para o dono da imobiliária.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadStats(true)}
            disabled={loading || refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar Dados'}
          </Button>
        </div>
      </div>

      {/* Alerta de Destaque: A mudança de 01/10 */}
      <Alert className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-950">
        <Sparkles className="h-5 w-5 text-amber-600" />
        <div className="ml-2">
          <AlertTitle className="text-base font-semibold text-amber-900 flex items-center gap-2">
            A mudança de 01/10/2026 na Meta — O que você precisa saber
            <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-[10px]">
              Importante
            </Badge>
          </AlertTitle>
          <AlertDescription className="text-xs md:text-sm text-amber-900/90 mt-1 leading-relaxed">
            Hoje as respostas de rotina da Bia são 100% grátis. A partir de{' '}
            <strong>01/10/2026</strong>, a Meta oferecerá{' '}
            <strong>1.000 respostas grátis por mês</strong> para o seu número. Após essa cota, cada
            resposta de serviço custará cerca de{' '}
            <strong>R$ {settings ? settings.service_rate_brl.toFixed(3) : '0,045'}</strong> (US$
            0,008). Mensagens originadas de{' '}
            <strong>anúncios no Meta Ads (Click-to-WhatsApp)</strong> continuam com{' '}
            <strong>janela de 72 horas 100% gratuitas</strong>!
          </AlertDescription>
        </div>
      </Alert>

      {/* Abas Principais */}
      <Tabs defaultValue="resumo" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="resumo" className="text-xs md:text-sm">
            Resumo & Métricas
          </TabsTrigger>
          <TabsTrigger value="saude" className="text-xs md:text-sm">
            Saúde da Meta
          </TabsTrigger>
          <TabsTrigger value="campanhas" className="text-xs md:text-sm">
            Campanhas ({campaigns.length})
          </TabsTrigger>
          <TabsTrigger value="custos" className="text-xs md:text-sm">
            Custos & Projeção 01/10
          </TabsTrigger>
          <TabsTrigger value="config" className="text-xs md:text-sm">
            Configurações
          </TabsTrigger>
        </TabsList>

        {/* ---------------- ABA 1: RESUMO ---------------- */}
        <TabsContent value="resumo" className="space-y-6">
          {/* Cards de Métricas Principais */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">
                    Mensagens Enviadas (30d)
                  </span>
                  <Send className="h-4 w-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-slate-900">
                  {summary ? summary.total_sent_30d.toLocaleString('pt-BR') : '—'}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {summary ? summary.service_sent_30d : 0} da Bia / corretores
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Respostas Recebidas</span>
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-slate-900">
                  {summary ? summary.incoming_received_30d.toLocaleString('pt-BR') : '—'}
                </div>
                <p className="text-[11px] text-emerald-600 font-medium mt-1">
                  Taxa de resposta: {summary ? summary.response_rate_percent : 0}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Novos Leads (30d)</span>
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-slate-900">
                  {summary ? summary.new_leads_30d : '—'}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {summary ? summary.ad_referral_leads_30d : 0} vieram de anúncios Meta
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Conversas Ativas (24h)</span>
                  <Activity className="h-4 w-4 text-indigo-600" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-slate-900">
                  {summary ? summary.active_conversations_24h : '—'}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Janela de resposta gratuita ativa</p>
              </CardContent>
            </Card>
          </div>

          {/* Cards Secundários: Custos & Metas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                    Custo WhatsApp (Últimos 30d)
                  </span>
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-emerald-950">
                  R$ {summary ? summary.current_cost_brl_30d.toFixed(2) : '0,00'}
                </div>
                <p className="text-xs text-emerald-700 mt-1">
                  Custo por lead:{' '}
                  <strong>
                    R$ {summary ? summary.cost_per_lead_current_brl.toFixed(2) : '0,00'}
                  </strong>
                </p>
                <div className="mt-3 pt-3 border-t border-emerald-200/60 text-[11px] text-emerald-800">
                  Cenário atual: apenas mensagens de campanha são cobradas.
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/30">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                    Custo Projetado Pós-01/10
                  </span>
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-amber-950">
                  R$ {summary ? summary.projected_cost_brl_30d.toFixed(2) : '0,00'}
                </div>
                <p className="text-xs text-amber-700 mt-1">
                  Custo por lead projetado:{' '}
                  <strong>
                    R$ {summary ? summary.cost_per_lead_projected_brl.toFixed(2) : '0,00'}
                  </strong>
                </p>
                <div className="mt-3 pt-3 border-t border-amber-200/60 text-[11px] text-amber-800">
                  Inclui 1.000 respostas grátis + excedente da Bia e campanhas.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Meta de Leads do Mês
                  </span>
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold text-slate-900">
                    {summary ? summary.leads_current_month : 0}
                    <span className="text-sm font-normal text-slate-500">
                      {' '}
                      / {settings?.monthly_leads_goal || 50} leads
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-purple-600">
                    {settings?.leads_goal_percent || 0}%
                  </span>
                </div>
                <Progress value={settings?.leads_goal_percent || 0} className="h-2 mt-2" />
                <p className="text-[11px] text-slate-500 mt-2">
                  Investimento previsto: R${' '}
                  {settings?.monthly_investment_budget_brl?.toFixed(2) || '300,00'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos de Volume e Leads */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900">
                  Volume de Mensagens (Últimos 30 Dias)
                </CardTitle>
                <CardDescription>
                  Comparativo de mensagens enviadas pela IA/corretores vs. recebidas dos clientes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MessagesDailyChart data={data?.daily_history || []} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900">
                  Novos Leads Captados por Dia
                </CardTitle>
                <CardDescription>
                  Evolução diária de novos contatos que entraram via WhatsApp ou anúncios.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeadsDailyChart data={data?.daily_history || []} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---------------- ABA 2: SAÚDE DA META ---------------- */}
        <TabsContent value="saude" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status do WhatsApp e Número */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  Conexão WhatsApp Cloud API
                </CardTitle>
                <CardDescription>
                  Status do número comercial verificado e token de envio oficial.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border">
                  <div>
                    <div className="text-xs text-slate-500">Número da Imobiliária</div>
                    <div className="text-sm font-semibold text-slate-900">
                      {health?.whatsapp_number || '+55 48 9209-8050'}
                    </div>
                  </div>
                  <Badge
                    className={
                      health?.whatsapp_status === 'connected'
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                    }
                  >
                    {health?.whatsapp_status === 'connected' ? 'Ativo & Conectado' : 'Atenção'}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b">
                    <span className="text-slate-600">Identificador Phone ID Meta:</span>
                    <span className="font-mono text-slate-800">
                      {health?.whatsapp_phone_id_configured
                        ? 'Configurado ✅'
                        : 'Não configurado ❌'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b">
                    <span className="text-slate-600">Webhook de Notificação (Recebimento):</span>
                    <span className="font-mono text-slate-800">
                      {health?.webhook_configured ? 'Pronto & Ativo ✅' : 'Pendente ❌'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b">
                    <span className="text-slate-600">Cobrança de Mensagens:</span>
                    <span className="font-medium text-emerald-600">
                      Apenas por mensagens entregues
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status CAPI & Instagram */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Meta Conversions API (CAPI) & Redes
                </CardTitle>
                <CardDescription>
                  Sincronização de eventos de conversão e rastreamento de campanhas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg border bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-slate-700">Status do CAPI</div>
                    <Badge
                      variant="outline"
                      className={
                        health?.capi_status === 'connected'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }
                    >
                      {health?.capi_status === 'connected' ? 'Operacional' : 'Aviso Conhecido'}
                    </Badge>
                  </div>

                  {health?.capi_error_details ? (
                    <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                      <strong>Aviso CAPI:</strong> {health.capi_error_details}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Eventos de leads e contatos são encaminhados para otimização de anúncios no
                      Meta Ads.
                    </p>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b">
                    <span className="text-slate-600">OAuth do Instagram:</span>
                    <span className="font-medium text-slate-800">
                      {health?.instagram_status === 'connected' ? (
                        <span className="text-emerald-600">Conectado ✅</span>
                      ) : (
                        <span className="text-amber-600">Pendente de autenticação</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b">
                    <span className="text-slate-600">Templates WhatsApp Aprovados:</span>
                    <span className="font-semibold text-emerald-600">
                      {health?.templates.approved || 0} de {health?.templates.total || 0} aprovados
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cards de Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">
                Templates de Mensagens (WhatsApp Cloud)
              </CardTitle>
              <CardDescription>
                Modelos aprovados pela Meta para disparo de campanhas ativas de marketing e
                utilidade.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg border p-3 text-center bg-slate-50">
                  <div className="text-2xl font-bold text-slate-900">
                    {health?.templates.total || 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Total de Modelos</div>
                </div>
                <div className="rounded-lg border border-emerald-200 p-3 text-center bg-emerald-50/50">
                  <div className="text-2xl font-bold text-emerald-600">
                    {health?.templates.approved || 0}
                  </div>
                  <div className="text-xs text-emerald-800 mt-1">Aprovados pela Meta</div>
                </div>
                <div className="rounded-lg border border-amber-200 p-3 text-center bg-amber-50/50">
                  <div className="text-2xl font-bold text-amber-600">
                    {health?.templates.pending || 0}
                  </div>
                  <div className="text-xs text-amber-800 mt-1">Em Análise</div>
                </div>
                <div className="rounded-lg border border-red-200 p-3 text-center bg-red-50/50">
                  <div className="text-2xl font-bold text-red-600">
                    {health?.templates.rejected || 0}
                  </div>
                  <div className="text-xs text-red-800 mt-1">Rejeitados</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- ABA 3: CAMPANHAS ---------------- */}
        <TabsContent value="campanhas" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">
                  Campanhas de Remarketing & Ativação
                </CardTitle>
                <CardDescription>
                  Desempenho financeiro e taxa de engajamento de cada disparo de WhatsApp.
                </CardDescription>
              </div>

              <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-md text-slate-700">
                Tarifa de marketing: <strong>US$ {settings?.marketing_rate_usd || 0.0625}</strong>{' '}
                (~R$ {settings ? settings.marketing_rate_brl.toFixed(3) : '0,35'})
              </div>
            </CardHeader>

            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p className="text-sm">Nenhuma campanha de remarketing disparada ainda.</p>
                  <p className="text-xs mt-1">
                    Quando você disparar uma campanha, os custos e respostas aparecerão aqui.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campanha</TableHead>
                        <TableHead>Segmento</TableHead>
                        <TableHead className="text-center">Enviadas</TableHead>
                        <TableHead className="text-center">Falhas</TableHead>
                        <TableHead className="text-center">Respostas</TableHead>
                        <TableHead className="text-center">Taxa Resposta</TableHead>
                        <TableHead className="text-right">Custo Estimado</TableHead>
                        <TableHead className="text-right">Custo / Resposta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((camp) => (
                        <TableRow key={camp.id}>
                          <TableCell className="font-medium text-slate-900">
                            <div>{camp.name}</div>
                            <div className="text-[11px] text-slate-400">
                              {new Date(camp.created).toLocaleDateString('pt-BR')}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            <Badge variant="secondary" className="font-normal text-[11px]">
                              {camp.segment}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm font-semibold text-slate-800">
                            {camp.sent_count}
                          </TableCell>
                          <TableCell className="text-center text-xs text-red-600">
                            {camp.failed_count > 0 ? camp.failed_count : '—'}
                          </TableCell>
                          <TableCell className="text-center text-sm font-semibold text-emerald-600">
                            {camp.replies_count}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={
                                camp.response_rate_percent > 15
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 text-xs'
                              }
                            >
                              {camp.response_rate_percent}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm font-bold text-slate-900">
                            R$ {camp.cost_brl.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold text-slate-700">
                            {camp.replies_count > 0
                              ? `R$ ${camp.cost_per_reply_brl.toFixed(2)}`
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- ABA 4: CUSTOS & PROJEÇÃO 01/10 ---------------- */}
        <TabsContent value="custos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Comparativo de Custos */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900">
                  Comparativo de Custos: Atual vs. Pós-01/10/2026
                </CardTitle>
                <CardDescription>
                  Entenda exatamente o que muda nas cobranças da Meta para o orçamento da
                  imobiliária.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CostComparisonCard
                  currentCost={summary?.current_cost_brl_30d || 0}
                  projectedCost={summary?.projected_cost_brl_30d || 0}
                  costPerLeadCurrent={summary?.cost_per_lead_current_brl || 0}
                  costPerLeadProjected={summary?.cost_per_lead_projected_brl || 0}
                  freeQuotaRemaining={summary?.service_free_quota_remaining || 1000}
                  serviceCurrentMonth={summary?.service_messages_current_month || 0}
                />
              </CardContent>
            </Card>

            {/* Medidor da Cota Grátis do Mês */}
            <Card className="border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-indigo-950">
                  Cota Grátis do Mês (1.000 msgs)
                </CardTitle>
                <CardDescription className="text-indigo-900/70">
                  Respostas enviadas pela Bia no mês corrente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-2">
                  <div className="text-4xl font-extrabold text-indigo-950">
                    {summary?.service_messages_current_month || 0}
                    <span className="text-sm font-normal text-indigo-600"> / 1.000</span>
                  </div>
                  <p className="text-xs text-indigo-700 mt-1">
                    mensagens de serviço enviadas este mês
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-indigo-950 font-medium">
                    <span>Cota consumida</span>
                    <span>{summary?.service_free_quota_percent_used || 0}%</span>
                  </div>
                  <Progress
                    value={summary?.service_free_quota_percent_used || 0}
                    className="h-2.5 bg-indigo-100"
                  />
                </div>

                <div className="rounded-md bg-white p-3 border border-indigo-100 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Restam gratuitas:</span>
                    <strong className="text-emerald-600">
                      {summary?.service_free_quota_remaining || 1000} mensagens
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Previsão de estouro:</span>
                    <span className="text-slate-500">
                      {(summary?.service_messages_current_month || 0) > 1000
                        ? 'Excedida'
                        : 'Dentro do limite'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dicas Práticas de Otimização */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 bg-slate-50/80">
              <div className="flex items-start gap-3">
                <span className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Janela Gratuita de 72h</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Leads que iniciam a conversa através de{' '}
                    <strong>anúncios Click-to-WhatsApp</strong> têm entrega gratuita durante 72
                    horas.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-slate-50/80">
              <div className="flex items-start gap-3">
                <span className="p-2 rounded-lg bg-blue-100 text-blue-800">
                  <Clock className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Cobrança Apenas Entregue</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    A Meta só tarifa mensagens que chegam no celular do lead. Mensagens falhas ou
                    recebidas do cliente são gratuitas.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-slate-50/80">
              <div className="flex items-start gap-3">
                <span className="p-2 rounded-lg bg-purple-100 text-purple-800">
                  <TrendingUp className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Economia no Remarketing</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Priorize disparos para listas qualificadas por tags de empreendimento para
                    manter a taxa de resposta alta e custo baixo.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ---------------- ABA 5: CONFIGURAÇÕES ---------------- */}
        <TabsContent value="config" className="space-y-6">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Sliders className="h-5 w-5 text-slate-600" />
                Parâmetros Financeiros & Metas
              </CardTitle>
              <CardDescription>
                Ajuste a cotação do dólar, as tarifas padrão da Meta e suas metas mensais da
                imobiliária.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="usdRate" className="text-xs font-medium">
                      Cotação USD → BRL (R$)
                    </Label>
                    <Input
                      id="usdRate"
                      value={usdRate}
                      onChange={(e) => setUsdRate(e.target.value)}
                      placeholder="5.65"
                      className="text-sm"
                      required
                    />
                    <span className="text-[11px] text-slate-400">
                      Usado para converter os custos de US$ da Meta para R$.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="marketingRate" className="text-xs font-medium">
                      Tarifa Marketing Meta (US$)
                    </Label>
                    <Input
                      id="marketingRate"
                      value={marketingRate}
                      onChange={(e) => setMarketingRate(e.target.value)}
                      placeholder="0.0625"
                      className="text-sm"
                      required
                    />
                    <span className="text-[11px] text-slate-400">
                      Padrão Brasil: ~US$ 0,0625 (~R${' '}
                      {settings ? settings.marketing_rate_brl.toFixed(3) : '0,35'})
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="serviceRate" className="text-xs font-medium">
                      Tarifa de Serviço Pós-1.000 (US$)
                    </Label>
                    <Input
                      id="serviceRate"
                      value={serviceRate}
                      onChange={(e) => setServiceRate(e.target.value)}
                      placeholder="0.008"
                      className="text-sm"
                      required
                    />
                    <span className="text-[11px] text-slate-400">
                      Válida após 01/10/2026: ~US$ 0,008 (~R${' '}
                      {settings ? settings.service_rate_brl.toFixed(3) : '0,045'})
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="leadsGoal" className="text-xs font-medium">
                      Meta Mensal de Novos Leads
                    </Label>
                    <Input
                      id="leadsGoal"
                      type="number"
                      value={leadsGoal}
                      onChange={(e) => setLeadsGoal(e.target.value)}
                      placeholder="50"
                      className="text-sm"
                      required
                    />
                    <span className="text-[11px] text-slate-400">
                      Objetivo de captação de clientes para o mês.
                    </span>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="budgetGoal" className="text-xs font-medium">
                      Orçamento Mensal WhatsApp (R$)
                    </Label>
                    <Input
                      id="budgetGoal"
                      value={budgetGoal}
                      onChange={(e) => setBudgetGoal(e.target.value)}
                      placeholder="300"
                      className="text-sm"
                      required
                    />
                    <span className="text-[11px] text-slate-400">
                      Teto planejado de investimento em envios de WhatsApp por mês.
                    </span>
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <Button type="submit" disabled={savingSettings} className="gap-2">
                    {savingSettings ? 'Salvando...' : 'Salvar Configurações'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
