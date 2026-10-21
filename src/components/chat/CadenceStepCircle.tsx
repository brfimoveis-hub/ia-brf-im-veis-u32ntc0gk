import React from 'react'
import { cn } from '@/lib/utils'
import { normalizeCadenceStep } from './CadenceTrackHeader'

/**
 * Mapeamento da "Bolinha de Escala":
 * 1 = retomada (azul)
 * 2 = D1 (ciano)
 * 3 = D3 (turquesa / esmeralda)
 * 4 = D7 (índigo)
 * 5 = D14 (âmbar)
 * 6 = Mensal (roxo / preenchida)
 * finalizado = cinza
 * outros / vazio = fallback neutro
 */
export interface CadenceBadgeInfo {
  number: number | null
  shortLabel: string
  label: string
  bgClass: string
  textClass: string
  borderClass: string
  ringClass: string
  isFilled: boolean
  isFinished: boolean
}

export function getCadenceStepBadgeInfo(step?: string): CadenceBadgeInfo {
  const norm = normalizeCadenceStep(step)
  switch (norm) {
    case 'remarketing':
      return {
        number: 1,
        shortLabel: 'Retomada',
        label: 'Degrau 1 · Retomada',
        bgClass: 'bg-blue-500 text-white shadow-xs',
        textClass: 'text-blue-700 dark:text-blue-300',
        borderClass: 'border-blue-400/40',
        ringClass: 'ring-blue-400/30',
        isFilled: false,
        isFinished: false,
      }
    case 'd1':
      return {
        number: 2,
        shortLabel: 'D1',
        label: 'Degrau 2 · D+1',
        bgClass: 'bg-cyan-500 text-white shadow-xs',
        textClass: 'text-cyan-700 dark:text-cyan-300',
        borderClass: 'border-cyan-400/40',
        ringClass: 'ring-cyan-400/30',
        isFilled: false,
        isFinished: false,
      }
    case 'd3':
      return {
        number: 3,
        shortLabel: 'D3',
        label: 'Degrau 3 · D+3',
        bgClass: 'bg-teal-500 text-white shadow-xs',
        textClass: 'text-teal-700 dark:text-teal-300',
        borderClass: 'border-teal-400/40',
        ringClass: 'ring-teal-400/30',
        isFilled: false,
        isFinished: false,
      }
    case 'd7':
      return {
        number: 4,
        shortLabel: 'D7',
        label: 'Degrau 4 · D+7',
        bgClass: 'bg-indigo-600 text-white shadow-xs',
        textClass: 'text-indigo-700 dark:text-indigo-300',
        borderClass: 'border-indigo-400/40',
        ringClass: 'ring-indigo-400/30',
        isFilled: false,
        isFinished: false,
      }
    case 'd14':
      return {
        number: 5,
        shortLabel: 'D14',
        label: 'Degrau 5 · D+14',
        bgClass: 'bg-amber-500 text-white shadow-xs',
        textClass: 'text-amber-700 dark:text-amber-300',
        borderClass: 'border-amber-400/40',
        ringClass: 'ring-amber-400/30',
        isFilled: false,
        isFinished: false,
      }
    case 'nurturing_monthly':
      return {
        number: 6,
        shortLabel: 'Mensal',
        label: 'Degrau 6 · Mensal',
        // Bolinha cheia marcante
        bgClass: 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-300 dark:ring-purple-900',
        textClass: 'text-purple-700 dark:text-purple-300',
        borderClass: 'border-purple-400/50',
        ringClass: 'ring-purple-400/40',
        isFilled: true,
        isFinished: false,
      }
    case 'finalizado':
      return {
        number: null,
        shortLabel: 'Fim',
        label: 'Finalizado',
        bgClass: 'bg-slate-400 text-white dark:bg-slate-600',
        textClass: 'text-slate-600 dark:text-slate-400',
        borderClass: 'border-slate-300 dark:border-slate-700',
        ringClass: 'ring-slate-400/20',
        isFilled: false,
        isFinished: true,
      }
    default:
      return {
        number: 2, // fallback para D1 que é a base padrão
        shortLabel: 'D1',
        label: 'Degrau 2 · D+1',
        bgClass: 'bg-cyan-500 text-white shadow-xs',
        textClass: 'text-cyan-700 dark:text-cyan-300',
        borderClass: 'border-cyan-400/40',
        ringClass: 'ring-cyan-400/30',
        isFilled: false,
        isFinished: false,
      }
  }
}

export function getStepRank(step?: string): number {
  const norm = normalizeCadenceStep(step)
  switch (norm) {
    case 'remarketing':
      return 1
    case 'd1':
      return 2
    case 'd3':
      return 3
    case 'd7':
      return 4
    case 'd14':
      return 5
    case 'nurturing_monthly':
      return 6
    case 'finalizado':
      return 7
    default:
      return 0
  }
}

interface CadenceStepCircleProps {
  step?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
  title?: string
}

export function CadenceStepCircle({
  step,
  size = 'md',
  showText = false,
  className,
  title,
}: CadenceStepCircleProps) {
  const info = getCadenceStepBadgeInfo(step)

  const sizeClasses = {
    sm: 'h-4 w-4 text-[10px]',
    md: 'h-5 w-5 text-[11px]',
    lg: 'h-6 w-6 text-xs',
  }[size]

  const resolvedTitle = title || info.label

  return (
    <div
      className={cn('inline-flex items-center gap-1.5 shrink-0 select-none', className)}
      title={resolvedTitle}
    >
      <span
        className={cn(
          'rounded-full flex items-center justify-center font-bold leading-none shrink-0 transition-transform',
          sizeClasses,
          info.bgClass,
        )}
      >
        {info.isFinished ? '—' : (info.number ?? '•')}
      </span>
      {showText && (
        <span className={cn('text-[11px] font-medium truncate', info.textClass)}>
          {info.shortLabel}
        </span>
      )}
    </div>
  )
}
