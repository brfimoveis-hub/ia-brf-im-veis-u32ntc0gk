import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis } from 'recharts'

// 5 fases macro canônicas mapeadas sobre os 10 estágios da Constituição v3.1:
// 1. Lead: "1. Acolhimento" (+ legados de entrada)
// 2. Atendimento: "2. Qualificação", "3. Apresentação Consultiva", "4. Sondagem Financeira", "5. Nutrição de Interesse"
// 3. Visita: "6. Convite de Visita", "7. Confirmação e Rota", "8. Feedback da Visita"
// 4. Proposta: "9. Proposta e Condições"
// 5. Fechamento: "10. Pós-venda e Indicação"
const MACRO_PHASES = [
  {
    phase: 'Lead',
    description: '1. Acolhimento',
    matches: (s: string) =>
      s === '1. Acolhimento' ||
      s === 'Novo' ||
      s === 'lead' ||
      s === 'Lead Novo' ||
      s === 'Captura + Identificação' ||
      s === 'D0 - Contato Imediato' ||
      s === '',
  },
  {
    phase: 'Atendimento',
    description: 'Etapas 2 a 5',
    matches: (s: string) =>
      s.startsWith('2.') ||
      s.startsWith('3.') ||
      s.startsWith('4.') ||
      s.startsWith('5.') ||
      s === 'Validação no CRM' ||
      s === 'Contato Personalizado' ||
      s === 'Mapeamento de Perfil' ||
      s === 'Nutrição Automática' ||
      s === 'Qualificação' ||
      s === 'Engajamento' ||
      s.startsWith('D1') ||
      s.startsWith('D2') ||
      s.startsWith('D3') ||
      s.startsWith('D4'),
  },
  {
    phase: 'Visita',
    description: 'Etapas 6 a 8',
    matches: (s: string) =>
      s.startsWith('6.') ||
      s.startsWith('7.') ||
      s.startsWith('8.') ||
      s === 'Agendamento de Visita' ||
      s === 'Pré-Visita' ||
      s === 'Pós-Visita' ||
      s === 'Visita' ||
      s === 'Demo Realiz.' ||
      s.startsWith('D5') ||
      s.startsWith('D6') ||
      s.startsWith('D7') ||
      s.startsWith('D8') ||
      s.startsWith('D9'),
  },
  {
    phase: 'Proposta',
    description: '9. Proposta e Condições',
    matches: (s: string) =>
      s === '9. Proposta e Condições' || s === 'Proposta e Negociação' || s === 'Proposta',
  },
  {
    phase: 'Fechamento',
    description: '10. Pós-venda e Indicação',
    matches: (s: string) =>
      s === '10. Pós-venda e Indicação' ||
      s === 'Fechamento e Pós-Venda' ||
      s === 'Fechamento' ||
      s === 'closed',
  },
]

export function PipelineChart({ customers }: { customers: any[] }) {
  const chartData = useMemo(() => {
    return MACRO_PHASES.map((macro) => {
      const count = customers.filter((c) => macro.matches(c.status || '')).length
      return {
        status: macro.phase,
        label: `${macro.phase} (${macro.description})`,
        count,
      }
    })
  }, [customers])

  const chartConfig = {
    count: {
      label: 'Leads',
      color: 'hsl(var(--primary))',
    },
  }

  return (
    <Card className="col-span-4 h-full flex flex-col">
      <CardHeader>
        <CardTitle>Funil de Vendas (5 Fases Macro)</CardTitle>
        <CardDescription>
          Consolidação dos 10 estágios: Lead, Atendimento, Visita, Proposta e Fechamento.
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-0 pb-4 flex-1">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
            Nenhum dado disponível.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full mt-4">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="status"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
