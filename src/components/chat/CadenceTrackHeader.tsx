import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Calendar,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  Send,
  Zap,
} from 'lucide-react'
import type { Customer } from '@/services/customers'
import { CadenceStepCircle } from '@/components/chat/CadenceStepCircle'

// Definição visual dos degraus da régua de retomada/persistência
export const CADENCE_STEPS_CONFIG = [
  { key: 'remarketing', label: 'Retomada', shortLabel: 'Retomada', color: 'blue' },
  { key: 'd1', label: 'Degrau D+1', shortLabel: 'D1', color: 'cyan' },
  { key: 'd3', label: 'Degrau D+3', shortLabel: 'D3', color: 'teal' },
  { key: 'd7', label: 'Degrau D+7', shortLabel: 'D7', color: 'indigo' },
  { key: 'd14', label: 'Degrau D+14', shortLabel: 'D14', color: 'amber' },
  { key: 'nurturing_monthly', label: 'Mensal', shortLabel: 'Mensal', color: 'purple' },
] as const

export type CadenceStepKey =
  | 'all'
  | 'remarketing'
  | 'd1'
  | 'd3'
  | 'd7'
  | 'd14'
  | 'nurturing_monthly'
  | 'finalizado'

export function normalizeCadenceStep(step?: string): string {
  if (!step) return 'd1'
  const s = step.toLowerCase().trim()
  if (s === 'retomada' || s === 'remarketing') return 'remarketing'
  if (s === 'd1' || s === 'd+1') return 'd1'
  if (s === 'd3' || s === 'd+3') return 'd3'
  if (s === 'd7' || s === 'd+7') return 'd7'
  if (s === 'd14' || s === 'd+14') return 'd14'
  if (s === 'nurturing_monthly' || s === 'mensal' || s === 'mensal_nurturing')
    return 'nurturing_monthly'
  if (s === 'finalizado' || s === 'concluido') return 'finalizado'
  return s
}

export function formatCadenceStepLabel(step?: string): string {
  const norm = normalizeCadenceStep(step)
  switch (norm) {
    case 'remarketing':
      return 'Retomada'
    case 'd1':
      return 'Degrau D1'
    case 'd3':
      return 'Degrau D3'
    case 'd7':
      return 'Degrau D7'
    case 'd14':
      return 'Degrau D14'
    case 'nurturing_monthly':
      return 'Aquecimento Mensal'
    case 'finalizado':
      return 'Finalizado'
    default:
      return norm.toUpperCase()
  }
}

function formatNextDateHuman(dateString?: string, lastFollowUpAt?: string): string {
  if (!dateString) {
    if (lastFollowUpAt) {
      const last = new Date(lastFollowUpAt)
      if (!Number.isNaN(last.getTime())) {
        // Estima próximo (+2 a +30 dias)
        const est = new Date(last.getTime() + 2 * 24 * 60 * 60 * 1000)
        return `Est. ${est.toLocaleDateString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`
      }
    }
    return 'Aguardando agendamento'
  }

  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return 'Data não definida'

  const now = new Date()
  const isPast = d.getTime() <= now.getTime()
  const isToday = d.toDateString() === now.toDateString()

  const tomorrow = new Date()
  tomorrow.setDate(now.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()

  const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (isPast) {
    return `Na fila para envio (${timeStr})`
  }
  if (isToday) {
    return `Hoje às ${timeStr}`
  }
  if (isTomorrow) {
    return `Amanhã às ${timeStr}`
  }

  // Próximos dias da semana
  const daysDiff = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysDiff < 7) {
    const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' })
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} às ${timeStr}`
  }

  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${timeStr}`
}

interface CadenceTrackHeaderProps {
  customer: Customer | null
  fallbackCustomerName?: string
  defaultOpen?: boolean
}

export function CadenceTrackHeader({
  customer,
  fallbackCustomerName,
  defaultOpen = false,
}: CadenceTrackHeaderProps) {
  const [expanded, setExpanded] = useState(defaultOpen)

  if (!customer) return null

  const rawTags = customer.tags || []
  const tagsStr = Array.isArray(rawTags) ? rawTags.join(' ').toLowerCase() : ''
  const isAiPaused =
    tagsStr.includes('ai_paused') ||
    customer.persistence_status === 'pausado' ||
    customer.is_blocked === true

  const stepKey = normalizeCadenceStep(customer.follow_up_step)
  const stepLabel = formatCadenceStepLabel(customer.follow_up_step)
  const stepIndex = CADENCE_STEPS_CONFIG.findIndex((s) => s.key === stepKey)

  const statusLabel = isAiPaused
    ? 'Régua Pausada'
    : customer.persistence_status === 'aguardando_momento'
      ? 'Aguardando momento'
      : customer.persistence_status === 'convertido'
        ? 'Convertido'
        : 'Régua Ativa'

  const nextDateFormatted = formatNextDateHuman(
    customer.next_follow_up_at,
    customer.last_follow_up_at,
  )

  const stageTitle = customer.status || '1. Acolhimento'
  const followUpCount = customer.follow_up_count ?? 0

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white border-b border-slate-800/80 shadow-xs shrink-0 transition-all">
      {/* Barra compacta superior (sempre visível no mobile) */}
      <div className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {/* Badge Estágio do Funil */}
          <Badge
            variant="outline"
            className="bg-white/10 text-slate-100 border-white/20 text-[10.5px] px-2 py-0.5 font-medium shrink-0 flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3 text-amber-400 shrink-0" />
            <span className="truncate max-w-[130px] sm:max-w-none">{stageTitle}</span>
          </Badge>

          {/* Bolinha Colorida com Número do Degrau + Badge */}
          <div className="flex items-center gap-1.5 shrink-0 bg-white/10 px-2 py-0.5 rounded-md border border-white/15">
            <CadenceStepCircle step={customer.follow_up_step} size="sm" />
            <span className="text-[11px] font-semibold text-white">{stepLabel}</span>
            {followUpCount > 0 && (
              <span className="text-[9.5px] opacity-80 ml-0.5 text-slate-300">
                ({followUpCount}º envio)
              </span>
            )}
          </div>

          {/* Status Ativo/Pausado */}
          <div className="flex items-center gap-1 text-[11px] font-medium shrink-0">
            {isAiPaused ? (
              <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-400/30">
                <PauseCircle className="h-3 w-3" />
                <span>Pausado</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-400/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Ativo</span>
              </span>
            )}
          </div>

          {/* Próximo envio no header compacto */}
          {!isAiPaused && (
            <div className="hidden sm:flex items-center gap-1 text-slate-300 text-[11px]">
              <Clock className="h-3 w-3 text-cyan-300" />
              <span>Próximo disparo:</span>
              <strong className="text-white font-medium">{nextDateFormatted}</strong>
            </div>
          )}
        </div>

        {/* Botão de colapso/expansão */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((prev) => !prev)}
          className="h-6 px-1.5 text-[11px] text-slate-300 hover:text-white hover:bg-white/10 shrink-0 gap-1"
          title={expanded ? 'Recolher detalhes da cadência' : 'Ver trilha visual da cadência'}
        >
          <span className="hidden xs:inline">{expanded ? 'Ocultar trilha' : 'Ver trilha'}</span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Painel colapsável: Trilha visual passo-a-passo e resumo dos disparos */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-700/60 bg-slate-950/40 space-y-2.5">
          {/* Trilha horizontal de degraus */}
          <div>
            <div className="flex items-center justify-between text-[10.5px] text-slate-300 mb-1">
              <span className="font-semibold uppercase tracking-wider text-slate-400">
                Evolução da Régua de Retomada
              </span>
              <span>
                {stepIndex >= 0 ? `Degrau ${stepIndex + 1} de ${CADENCE_STEPS_CONFIG.length}` : '—'}
              </span>
            </div>

            <div className="grid grid-cols-6 gap-1 bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
              {CADENCE_STEPS_CONFIG.map((cfg, idx) => {
                const isCurrent = cfg.key === stepKey
                const isPassed = stepIndex >= 0 && idx < stepIndex
                return (
                  <div
                    key={cfg.key}
                    className={cn(
                      'flex flex-col items-center justify-center p-1 rounded text-center transition-all',
                      isCurrent &&
                        'bg-emerald-500/25 border border-emerald-400/50 text-white font-bold shadow-xs',
                      isPassed && 'bg-slate-800/80 text-emerald-300 font-medium',
                      !isCurrent && !isPassed && 'text-slate-400 bg-slate-950/40 opacity-70',
                    )}
                  >
                    <div className="flex items-center gap-0.5 text-[10px]">
                      {isPassed ? (
                        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                      ) : isCurrent ? (
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                      )}
                      <span className="truncate">{cfg.shortLabel}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Dados operacionais: última mensagem, próxima prevista e promessas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded border border-slate-800/80 text-slate-300">
              <Clock className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 mr-1">Próximo disparo:</span>
                <span className="font-medium text-white">{nextDateFormatted}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded border border-slate-800/80 text-slate-300">
              <Calendar className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 mr-1">Último disparo:</span>
                <span className="font-medium text-white">
                  {customer.last_follow_up_at
                    ? new Date(customer.last_follow_up_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Ainda não realizado'}
                </span>
              </div>
            </div>
          </div>

          {customer.promise_pending && (
            <div className="bg-amber-950/50 border border-amber-600/40 text-amber-200 p-2 rounded text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
              <span>
                <strong>Promessa pendente:</strong>{' '}
                {customer.promise_context || 'Retorno prioritário com Mauro programado.'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
