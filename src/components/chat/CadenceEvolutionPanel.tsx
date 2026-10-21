import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Zap,
  CheckCircle2,
  PauseCircle,
  MessageCircle,
  Send,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import {
  CADENCE_STEPS_CONFIG,
  type CadenceStepKey,
  normalizeCadenceStep,
} from '@/components/chat/CadenceTrackHeader'
import { CadenceStepCircle } from '@/components/chat/CadenceStepCircle'

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
  isMobileCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function CadenceEvolutionPanel({
  stats,
  selectedStep,
  onSelectStep,
  isMobileCollapsed = false,
  onToggleCollapse,
}: CadenceEvolutionPanelProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-xl shadow-xs p-2.5 sm:p-3 space-y-2.5">
      {/* Linha superior de KPIs rápidos (mobile-friendly horizontal scroll ou flex-wrap) */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <span>Evolução da Cadência</span>
              <span className="text-[10px] font-normal lowercase text-muted-foreground">
                ({stats.total} clientes)
              </span>
            </h2>
          </div>
        </div>

        {/* Mini contadores operacionais: Ativos, Pausados, Respostas Hoje, Envios Hoje */}
        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 font-medium"
            title="Clientes com régua ativa recebendo disparos"
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
            title="Clientes que responderam hoje"
          >
            <MessageCircle className="h-3 w-3 text-blue-500" />
            <span>{stats.repliedTodayCount} responderam hoje</span>
          </div>

          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 font-medium"
            title="Disparos automáticos da régua enviados hoje"
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
        </div>
      </div>

      {/* Barra de Filtro interativo por Degrau da Régua (chips scrolláveis no mobile) */}
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

        {/* Chip "Finalizado" se houver */}
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
    </div>
  )
}
