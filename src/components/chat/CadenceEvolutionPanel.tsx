import React, { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, formatPhone } from '@/lib/utils'
import {
  Zap,
  CheckCheck,
  Eye,
  AlertTriangle,
  PauseCircle,
  MessageCircle,
  Send,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Users,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import { CADENCE_STEPS_CONFIG, type CadenceStepKey } from '@/components/chat/CadenceTrackHeader'
import { CadenceStepCircle } from '@/components/chat/CadenceStepCircle'
import {
  getWhatsAppSendStats,
  type WhatsAppSendStatsResponse,
  type WhatsAppSendRecipient,
} from '@/services/whatsapp_stats'

export interface CadenceStats {
  total: number
  activeCount: number
  pausedCount: number
  repliedTodayCount: number
  sentTodayCount: number
  advancesTodayCount?: number
  byStep: {
    remarketing: number
    d1: number
    d3: number
    d7: number
    d14: number
    nurturing_monthly: number
    finalizado: number
  }
}

interface CadenceEvolutionPanelProps {
  stats: CadenceStats
  selectedStep: CadenceStepKey
  onSelectStep: (step: CadenceStepKey) => void
  onSelectCustomer?: (customerId: string) => void
  isMobileCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function CadenceEvolutionPanel({
  stats,
  selectedStep,
  onSelectStep,
  onSelectCustomer,
}: CadenceEvolutionPanelProps) {
  const [expandedDetails, setExpandedDetails] = useState(false)
  const [sendStats, setSendStats] = useState<WhatsAppSendStatsResponse | null>(null)
  const [loadingSendStats, setLoadingSendStats] = useState(false)
  const [sendStatsError, setSendStatsError] = useState<string | null>(null)
  const [recipientSearch, setRecipientSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'enviada' | 'entregue' | 'lida' | 'falhou'
  >('all')

  const loadExactStats = async () => {
    setLoadingSendStats(true)
    setSendStatsError(null)
    try {
      const res = await getWhatsAppSendStats()
      setSendStats(res)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setSendStatsError(msg || 'Erro ao carregar controle exato de envios')
    } finally {
      setLoadingSendStats(false)
    }
  }

  // Carrega ao montar para já ter os números vivos dos últimos 7 dias à mão
  useEffect(() => {
    loadExactStats()
  }, [])

  const totals = sendStats?.totals
  const rates = sendStats?.rates_percent

  // Filtragem da lista nome a nome
  const filteredRecipients = (sendStats?.recipients || []).filter((item: WhatsAppSendRecipient) => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'enviada' && item.status !== 'enviada') return false
      if (statusFilter === 'entregue' && item.status !== 'entregue') return false
      if (statusFilter === 'lida' && item.status !== 'lida') return false
      if (statusFilter === 'falhou' && item.status !== 'falhou') return false
    }
    if (recipientSearch.trim()) {
      const term = recipientSearch.toLowerCase()
      const nameMatch = (item.customer_name || '').toLowerCase().includes(term)
      const phoneMatch = (item.customer_phone || '').includes(term.replace(/\D/g, ''))
      const textMatch = (item.text_preview || '').toLowerCase().includes(term)
      return nameMatch || phoneMatch || textMatch
    }
    return true
  })

  const formatDateTime = (isoStr: string) => {
    if (!isoStr) return '-'
    try {
      const d = new Date(isoStr)
      if (Number.isNaN(d.getTime())) return isoStr
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const hours = String(d.getHours()).padStart(2, '0')
      const mins = String(d.getMinutes()).padStart(2, '0')
      return `${day}/${month} às ${hours}:${mins}`
    } catch (_) {
      return isoStr
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'lida':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
            <Eye className="h-3 w-3" />
            Lida
          </span>
        )
      case 'entregue':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCheck className="h-3 w-3" />
            Entregue
          </span>
        )
      case 'falhou':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
            <AlertTriangle className="h-3 w-3" />
            Falha
          </span>
        )
      case 'enviada':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Send className="h-3 w-3" />
            Enviada
          </span>
        )
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-xl shadow-xs p-2.5 sm:p-3 space-y-2.5 transition-all">
      {/* 1. LINHA SUPERIOR: TÍTULO UNIFICADO + DISTINÇÃO CLARA ENTRE BASE (294) E DISPAROS VIVOS */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
              <span>Estatística &amp; Evolução da Régua</span>
              <span className="text-[10px] font-normal lowercase text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                base:{' '}
                <strong className="text-slate-800 dark:text-slate-200 font-bold">
                  {stats.total}
                </strong>{' '}
                contatos
              </span>
            </h2>
          </div>
        </div>

        {/* Mini contadores operacionais unificados + botão de expandir detalhamento */}
        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 font-medium"
            title="Clientes com régua ativa no funil"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{stats.activeCount} ativos</span>
          </div>

          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 font-medium"
            title="Clientes com régua pausada"
          >
            <PauseCircle className="h-3 w-3 text-amber-500" />
            <span>{stats.pausedCount} pausados</span>
          </div>

          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 font-medium"
            title="Clientes que responderam hoje no CRM"
          >
            <MessageCircle className="h-3 w-3 text-blue-500" />
            <span>{stats.repliedTodayCount} responderam hoje</span>
          </div>

          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 font-medium"
            title="Disparos automáticos enviados hoje"
          >
            <Send className="h-3 w-3 text-purple-500" />
            <span>{stats.sentTodayCount} disparos hoje</span>
          </div>

          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 font-bold"
            title="Clientes que avançaram de degrau hoje"
          >
            <Zap className="h-3 w-3 text-emerald-500 fill-emerald-500" />
            <span>{stats.advancesTodayCount ?? 0} avanços hoje</span>
          </div>

          {/* Botão de alternar visão detalhada do controle exato de envios */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setExpandedDetails((prev) => !prev)}
            className={cn(
              'h-6 px-2 text-[11px] gap-1 font-semibold transition-all border',
              expandedDetails
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'text-slate-700 dark:text-slate-300 hover:border-emerald-300',
            )}
            title="Exibir controle exato de envios, callbacks da Meta e lista nome a nome"
          >
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            <span>{expandedDetails ? 'Ocultar Controle Exato' : 'Controle Exato (7 dias)'}</span>
            {expandedDetails ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* 2. BARRA DE FILTRO POR DEGRAU DA RÉGUA (CHIPS MOBILE-FRIENDLY) */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-0.5 scrollbar-none -mx-1 px-1">
        {/* Chip "Todos" */}
        <button
          type="button"
          onClick={() => onSelectStep('all')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 border',
            selectedStep === 'all'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 hover:border-slate-300',
          )}
        >
          <span>Todos</span>
          <span
            className={cn(
              'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
              selectedStep === 'all'
                ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
            )}
          >
            {stats.total}
          </span>
        </button>

        {/* Chips de cada degrau da cadência */}
        {CADENCE_STEPS_CONFIG.map((cfg) => {
          const count = stats.byStep[cfg.key as keyof typeof stats.byStep] || 0
          const isSelected = selectedStep === cfg.key
          return (
            <button
              key={cfg.key}
              type="button"
              onClick={() => onSelectStep(cfg.key as CadenceStepKey)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 border',
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300 hover:text-emerald-700',
              )}
            >
              <CadenceStepCircle step={cfg.key} size="sm" />
              <span className="capitalize">{cfg.shortLabel}</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                  isSelected
                    ? 'bg-white/25 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}

        {/* Chip "Finalizado" */}
        {stats.byStep.finalizado > 0 && (
          <button
            type="button"
            onClick={() => onSelectStep('finalizado')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 border',
              selectedStep === 'finalizado'
                ? 'bg-slate-700 text-white border-slate-700 font-semibold'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
            )}
          >
            <CadenceStepCircle step="finalizado" size="sm" />
            <span>Finalizados</span>{' '}
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700">
              {stats.byStep.finalizado}
            </span>
          </button>
        )}
      </div>

      {/* 3. PAINEL INTEGRADO DE CONTROLE EXATO (ÚLTIMOS 7 DIAS + TOTAIS + LISTA NOME A NOME) */}
      {expandedDetails && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Controle Exato e Preciso de Envios (Últimos 7 dias)
              </span>
              <Badge
                variant="outline"
                className="text-[10px] h-4 px-1.5 bg-slate-50 dark:bg-slate-800"
              >
                Auditoria Meta Oficial
              </Badge>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={loadExactStats}
              disabled={loadingSendStats}
              className="h-7 px-2 text-xs gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-900"
              title="Atualizar dados do servidor"
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', loadingSendStats && 'animate-spin text-emerald-600')}
              />
              <span>{loadingSendStats ? 'Carregando...' : 'Atualizar'}</span>
            </Button>
          </div>

          {sendStatsError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-700 dark:text-red-300">
              {sendStatsError}
            </div>
          )}

          {/* Cards de Contadores Vivos (Últimos 7 dias) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {/* Enviadas */}
            <div className="p-2.5 rounded-lg border bg-slate-50/70 dark:bg-slate-800/50 space-y-0.5">
              <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                <span className="flex items-center gap-1">
                  <Send className="h-3 w-3 text-blue-500" />
                  Enviadas
                </span>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {totals?.enviadas ?? 0}
              </div>
              <div className="text-[9px] text-muted-foreground leading-tight">
                Disparos gerados pela Bia
              </div>
            </div>

            {/* Clientes Distintos */}
            <div className="p-2.5 rounded-lg border bg-slate-50/70 dark:bg-slate-800/50 space-y-0.5">
              <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-indigo-500" />
                  Clientes Distintos
                </span>
              </div>
              <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                {totals?.clientes_distintos ?? 0}
              </div>
              <div className="text-[9px] text-muted-foreground leading-tight">
                Pessoas contactadas
              </div>
            </div>

            {/* Entregues */}
            <div className="p-2.5 rounded-lg border bg-slate-50/70 dark:bg-slate-800/50 space-y-0.5">
              <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                <span className="flex items-center gap-1">
                  <CheckCheck className="h-3 w-3 text-emerald-500" />
                  Entregues
                </span>
                {rates?.taxa_entrega !== undefined && (
                  <Badge
                    variant="outline"
                    className="text-[9px] h-3.5 px-1 bg-emerald-50 text-emerald-700 border-emerald-200"
                  >
                    {rates.taxa_entrega}%
                  </Badge>
                )}
              </div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {totals?.entregues ?? 0}
              </div>
              <div className="text-[9px] text-muted-foreground leading-tight">
                No aparelho do cliente
              </div>
            </div>

            {/* Lidas */}
            <div className="p-2.5 rounded-lg border bg-slate-50/70 dark:bg-slate-800/50 space-y-0.5">
              <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3 text-cyan-500" />
                  Lidas (Read)
                </span>
                {rates?.taxa_leitura !== undefined && (
                  <Badge
                    variant="outline"
                    className="text-[9px] h-3.5 px-1 bg-cyan-50 text-cyan-700 border-cyan-200"
                  >
                    {rates.taxa_leitura}%
                  </Badge>
                )}
              </div>
              <div className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
                {totals?.lidas ?? 0}
              </div>
              <div className="text-[9px] text-muted-foreground leading-tight">
                Visualizadas pelo cliente
              </div>
            </div>

            {/* Responderam */}
            <div className="p-2.5 rounded-lg border bg-slate-50/70 dark:bg-slate-800/50 space-y-0.5">
              <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3 text-amber-500" />
                  Responderam
                </span>
                {rates?.taxa_resposta !== undefined && (
                  <Badge
                    variant="outline"
                    className="text-[9px] h-3.5 px-1 bg-amber-50 text-amber-700 border-amber-200"
                  >
                    {rates.taxa_resposta}%
                  </Badge>
                )}
              </div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {totals?.recebidas_de_clientes ?? 0}
              </div>
              <div className="text-[9px] text-muted-foreground leading-tight">
                Mensagens de clientes
              </div>
            </div>

            {/* Falhas */}
            <div className="p-2.5 rounded-lg border bg-slate-50/70 dark:bg-slate-800/50 space-y-0.5">
              <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  Falhas
                </span>
              </div>
              <div
                className={cn(
                  'text-xl font-bold',
                  (totals?.falhas ?? 0) > 0 ? 'text-red-600' : 'text-slate-500',
                )}
              >
                {totals?.falhas ?? 0}
              </div>
              <div className="text-[9px] text-muted-foreground leading-tight">
                Erros reportados Meta
              </div>
            </div>
          </div>

          {/* Tabela dos Últimos 7 Dias (Por Dia) */}
          <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-900">
            <div className="bg-slate-50 dark:bg-slate-800/70 px-3 py-1.5 border-b text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Totais Diários dos Últimos 7 Dias</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Enviadas, clientes distintos, entregues, lidas e respostas
              </span>
            </div>
            <div className="overflow-x-auto max-h-48 scrollbar-thin">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-slate-100/60 dark:bg-slate-800/50 text-muted-foreground text-[11px]">
                    <th className="py-1.5 px-3 text-left font-medium">Data</th>
                    <th className="py-1.5 px-2.5 text-right font-medium">Enviadas</th>
                    <th className="py-1.5 px-2.5 text-right font-medium">Clientes</th>
                    <th className="py-1.5 px-2.5 text-right font-medium">Entregues</th>
                    <th className="py-1.5 px-2.5 text-right font-medium">Lidas</th>
                    <th className="py-1.5 px-2.5 text-right font-medium">Falhas</th>
                    <th className="py-1.5 px-2.5 text-right font-medium">Responderam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(sendStats?.daily_history || []).map((day) => {
                    const [y, m, d] = day.date.split('-')
                    const formattedDate = `${d}/${m}/${y}`
                    return (
                      <tr
                        key={day.date}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                      >
                        <td className="py-1.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                          {formattedDate}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-semibold text-blue-600">
                          {day.enviadas}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-semibold text-indigo-600">
                          {day.clientes_distintos ?? 0}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-semibold text-emerald-600">
                          {day.entregues}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-semibold text-cyan-600">
                          {day.lidas}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-semibold text-red-600">
                          {day.falhas}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-semibold text-amber-600">
                          {day.recebidas_de_clientes}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* LISTA NOME A NOME DE QUEM RECEBEU O QUÊ E QUANDO */}
          <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-900 space-y-2 p-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Lista Nome a Nome (Quem recebeu o quê, quando e status)
                </span>
                <span className="text-[10px] text-muted-foreground">
                  ({filteredRecipients.length} registros)
                </span>
              </div>

              {/* Filtros de busca e status */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente, tel ou mensagem..."
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    className="pl-7 h-7 text-xs w-48 sm:w-56 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded text-[10px]">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={cn(
                      'px-2 py-0.5 rounded font-medium',
                      statusFilter === 'all'
                        ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-white'
                        : 'text-muted-foreground',
                    )}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('entregue')}
                    className={cn(
                      'px-2 py-0.5 rounded font-medium',
                      statusFilter === 'entregue'
                        ? 'bg-white dark:bg-slate-900 shadow-xs text-emerald-600'
                        : 'text-muted-foreground',
                    )}
                  >
                    Entregues
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('lida')}
                    className={cn(
                      'px-2 py-0.5 rounded font-medium',
                      statusFilter === 'lida'
                        ? 'bg-white dark:bg-slate-900 shadow-xs text-cyan-600'
                        : 'text-muted-foreground',
                    )}
                  >
                    Lidas
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('falhou')}
                    className={cn(
                      'px-2 py-0.5 rounded font-medium',
                      statusFilter === 'falhou'
                        ? 'bg-white dark:bg-slate-900 shadow-xs text-red-600'
                        : 'text-muted-foreground',
                    )}
                  >
                    Falhas
                  </button>
                </div>
              </div>
            </div>

            {/* Listagem scrollável e mobile-friendly */}
            {filteredRecipients.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Nenhum envio encontrado para os filtros selecionados.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto scrollbar-thin">
                {filteredRecipients.map((rec) => (
                  <div
                    key={rec.id}
                    className="py-2 px-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 rounded transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {rec.customer_id && onSelectCustomer ? (
                          <button
                            type="button"
                            onClick={() => onSelectCustomer(rec.customer_id!)}
                            className="font-semibold text-xs text-emerald-700 dark:text-emerald-400 hover:underline text-left truncate max-w-[200px]"
                            title="Abrir conversa deste cliente"
                          >
                            {rec.customer_name}
                          </button>
                        ) : (
                          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                            {rec.customer_name}
                          </span>
                        )}

                        {rec.customer_phone && (
                          <span className="text-[11px] text-muted-foreground font-mono">
                            ({formatPhone(rec.customer_phone)})
                          </span>
                        )}

                        {rec.step && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1 capitalize">
                            {rec.step}
                          </Badge>
                        )}

                        {getStatusBadge(rec.status)}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 italic">
                        "{rec.text_preview}"
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground sm:text-right shrink-0">
                      <Clock className="h-3 w-3" />
                      <span>{formatDateTime(rec.sent_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
