import React, { useId } from 'react'
import type { WhatsAppStatsDailyPoint } from '@/services/whatsapp_stats'

interface MessagesDailyChartProps {
  data: WhatsAppStatsDailyPoint[]
  days?: number
}

export function MessagesDailyChart({ data, days = 30 }: MessagesDailyChartProps) {
  const chartId = useId()
  const sliced = data.slice(-days)
  const maxVal = Math.max(1, ...sliced.map((d) => Math.max(d.sent, d.received)))

  const hasData = sliced.some((d) => d.sent > 0 || d.received > 0)

  if (!hasData) {
    return (
      <div className="flex h-56 w-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-500">
        Nenhum registro de mensagem no período selecionado.
      </div>
    )
  }

  // Altura do SVG
  const svgHeight = 200
  const svgWidth = 600
  const paddingX = 20
  const paddingY = 24
  const innerWidth = svgWidth - paddingX * 2
  const innerHeight = svgHeight - paddingY * 2

  const step = innerWidth / (sliced.length || 1)
  const barWidth = Math.max(3, Math.min(10, step * 0.35))

  return (
    <div className="w-full">
      <div className="flex items-center justify-end gap-4 pb-2 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
          <span>Enviadas (Bia / Corretor)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
          <span>Recebidas (Clientes)</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="h-56 w-full min-w-[500px]"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`${chartId}-sent`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id={`${chartId}-recv`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingY + innerHeight * (1 - ratio)
            const labelVal = Math.round(maxVal * ratio)
            return (
              <g key={ratio}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text x={paddingX - 4} y={y + 3} fontSize="9" fill="#94a3b8" textAnchor="end">
                  {labelVal}
                </text>
              </g>
            )
          })}

          {/* Barras duplas: Enviadas (verde) e Recebidas (azul) */}
          {sliced.map((pt, idx) => {
            const xCenter = paddingX + idx * step + step / 2
            const sentHeight = (pt.sent / maxVal) * innerHeight
            const recvHeight = (pt.received / maxVal) * innerHeight

            const sentY = paddingY + innerHeight - sentHeight
            const recvY = paddingY + innerHeight - recvHeight

            // Mostrar rótulo de data a cada 5 dias
            const showDate = idx % 5 === 0 || idx === sliced.length - 1
            const dayMonth = pt.date.substring(5).replace('-', '/')

            return (
              <g key={pt.date} className="group cursor-pointer">
                <title>{`${dayMonth}: ${pt.sent} enviadas, ${pt.received} recebidas`}</title>

                {/* Barra Enviadas */}
                {sentHeight > 0 && (
                  <rect
                    x={xCenter - barWidth - 1}
                    y={sentY}
                    width={barWidth}
                    height={sentHeight}
                    rx="2"
                    fill={`url(#${chartId}-sent)`}
                    className="transition-all hover:opacity-80"
                  />
                )}

                {/* Barra Recebidas */}
                {recvHeight > 0 && (
                  <rect
                    x={xCenter + 1}
                    y={recvY}
                    width={barWidth}
                    height={recvHeight}
                    rx="2"
                    fill={`url(#${chartId}-recv)`}
                    className="transition-all hover:opacity-80"
                  />
                )}

                {/* Rótulo de data */}
                {showDate && (
                  <text
                    x={xCenter}
                    y={svgHeight - 6}
                    fontSize="9"
                    fill="#64748b"
                    textAnchor="middle"
                  >
                    {dayMonth}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

interface LeadsDailyChartProps {
  data: WhatsAppStatsDailyPoint[]
  days?: number
}

export function LeadsDailyChart({ data, days = 30 }: LeadsDailyChartProps) {
  const chartId = useId()
  const sliced = data.slice(-days)
  const maxLeads = Math.max(1, ...sliced.map((d) => d.leads))
  const hasData = sliced.some((d) => d.leads > 0)

  if (!hasData) {
    return (
      <div className="flex h-56 w-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-500">
        Nenhum novo lead registrado nos últimos {days} dias.
      </div>
    )
  }

  const svgHeight = 200
  const svgWidth = 600
  const paddingX = 20
  const paddingY = 24
  const innerWidth = svgWidth - paddingX * 2
  const innerHeight = svgHeight - paddingY * 2

  const step = innerWidth / (sliced.length || 1)
  const barWidth = Math.max(4, Math.min(14, step * 0.5))

  return (
    <div className="w-full">
      <div className="flex items-center justify-end gap-2 pb-2 text-xs text-slate-600">
        <span className="h-2.5 w-2.5 rounded-sm bg-purple-500" />
        <span>Novos Leads cadastrados por dia</span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="h-56 w-full min-w-[500px]"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`${chartId}-leads`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.5, 1].map((ratio) => {
            const y = paddingY + innerHeight * (1 - ratio)
            const labelVal = Math.round(maxLeads * ratio)
            return (
              <g key={ratio}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text x={paddingX - 4} y={y + 3} fontSize="9" fill="#94a3b8" textAnchor="end">
                  {labelVal}
                </text>
              </g>
            )
          })}

          {sliced.map((pt, idx) => {
            const xCenter = paddingX + idx * step + step / 2
            const lHeight = (pt.leads / maxLeads) * innerHeight
            const y = paddingY + innerHeight - lHeight
            const showDate = idx % 5 === 0 || idx === sliced.length - 1
            const dayMonth = pt.date.substring(5).replace('-', '/')

            return (
              <g key={pt.date} className="group cursor-pointer">
                <title>{`${dayMonth}: ${pt.leads} novos leads`}</title>
                {lHeight > 0 && (
                  <rect
                    x={xCenter - barWidth / 2}
                    y={y}
                    width={barWidth}
                    height={lHeight}
                    rx="3"
                    fill={`url(#${chartId}-leads)`}
                    className="transition-all hover:opacity-80"
                  />
                )}
                {showDate && (
                  <text
                    x={xCenter}
                    y={svgHeight - 6}
                    fontSize="9"
                    fill="#64748b"
                    textAnchor="middle"
                  >
                    {dayMonth}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

interface CostComparisonCardProps {
  currentCost: number
  projectedCost: number
  costPerLeadCurrent: number
  costPerLeadProjected: number
  freeQuotaRemaining: number
  serviceCurrentMonth: number
}

export function CostComparisonCard({
  currentCost,
  projectedCost,
  costPerLeadCurrent,
  costPerLeadProjected,
  freeQuotaRemaining,
  serviceCurrentMonth,
}: CostComparisonCardProps) {
  const diff = projectedCost - currentCost
  const maxVal = Math.max(1, currentCost, projectedCost)
  const currentPct = Math.round((currentCost / maxVal) * 100)
  const projPct = Math.round((projectedCost / maxVal) * 100)

  return (
    <div className="space-y-4">
      {/* Barras visuais comparativas */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
            <span>Cenário Atual (Setembro / Serviços Grátis)</span>
            <span className="font-semibold text-emerald-600">R$ {currentCost.toFixed(2)}</span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.max(5, currentPct)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Custo por lead: R$ {costPerLeadCurrent.toFixed(2)}
          </p>
        </div>

        <div>
          <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
            <span>Projetado Pós-01/10 (Cobrança após 1.000 msgs)</span>
            <span className="font-semibold text-amber-600">R$ {projectedCost.toFixed(2)}</span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-500"
              style={{ width: `${Math.max(5, projPct)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Custo por lead estimado: R$ {costPerLeadProjected.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Indicador de impacto */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-600 flex items-center justify-between">
        <div>
          <span className="font-medium text-slate-800">Diferença prevista pós-01/10:</span>{' '}
          <span
            className={diff > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}
          >
            {diff > 0 ? `+ R$ ${diff.toFixed(2)}/mês` : 'R$ 0,00 (dentro da cota grátis)'}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-slate-500">
            {serviceCurrentMonth} msgs de serviço este mês ({freeQuotaRemaining} grátis restantes)
          </span>
        </div>
      </div>
    </div>
  )
}
