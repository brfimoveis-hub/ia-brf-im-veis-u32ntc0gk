import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Customer } from '@/services/customers'
import { PHASES } from './constants'
import { Users, TrendingUp } from 'lucide-react'

export function CustomerDashboard({ leads }: { leads: Customer[] }) {
  const funnelData = PHASES.map((phase) => {
    const currentCount = leads.filter((l) => {
      const s = l.status?.trim() || 'Novo'
      if (phase.aliases && phase.aliases.includes(s)) return true
      if (phase.title === 'Base de Clientes/Novo LYD') {
        return s === 'Novo' || s === 'Lead Novo' || s === 'lead' || s === ''
      }
      if (phase.title === 'Fechamento') {
        return s === 'Fechamento' || s === 'closed'
      }
      if (phase.title === 'Qualificação') return s === 'Qualificação'
      if (phase.title === 'Engajamento') return s === 'Engajamento' || s === 'contact'
      if (phase.title === 'Demo Realiz.') return s === 'Demo Realiz.'
      if (phase.title === 'Visita') return s === 'Visita'
      return false
    }).length
    return {
      phase: phase.title,
      currentCount,
      accumulated: 0,
      conversionRate: 0,
    }
  })

  for (let i = funnelData.length - 1; i >= 0; i--) {
    if (i === funnelData.length - 1) {
      funnelData[i].accumulated = funnelData[i].currentCount
    } else {
      funnelData[i].accumulated = funnelData[i].currentCount + funnelData[i + 1].accumulated
    }
  }

  return (
    <div className="p-4 space-y-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Total Analisado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads.length} leads</div>
            <p className="text-xs text-muted-foreground mt-1">Na visualização atual</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" /> Conversão Global (Novo → Fechamento)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {funnelData[0]?.accumulated > 0
                ? Math.round(
                    (funnelData[funnelData.length - 1].accumulated / funnelData[0].accumulated) *
                      100,
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">Taxa de fechamento global</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Painel de Controle de Leads (Dashboard de Conversão)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fase do Funil</TableHead>
                <TableHead className="text-right">Leads Atuais na Fase</TableHead>
                <TableHead className="text-right">Volume Acumulado (Passaram por aqui)</TableHead>
                <TableHead className="text-right">Taxa de Conversão (para próxima fase)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funnelData.map((data, index) => {
                const nextAcc =
                  index < funnelData.length - 1 ? funnelData[index + 1].accumulated : 0
                const convToNext =
                  data.accumulated > 0 ? Math.round((nextAcc / data.accumulated) * 100) : 0

                return (
                  <TableRow key={data.phase}>
                    <TableCell className="font-medium">{data.phase}</TableCell>
                    <TableCell className="text-right font-semibold">{data.currentCount}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {data.accumulated}
                    </TableCell>
                    <TableCell className="text-right">
                      {index < funnelData.length - 1 ? (
                        <span className="text-primary font-medium">{convToNext}%</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
