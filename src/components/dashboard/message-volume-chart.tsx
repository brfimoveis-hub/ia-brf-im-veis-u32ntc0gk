import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, Legend } from 'recharts'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useRealtime } from '@/hooks/use-realtime'
import { getMessageVolume, type MessageVolumeDataPoint } from '@/services/analytics'
import { Loader2 } from 'lucide-react'

export function MessageVolumeChart() {
  const [data, setData] = useState<MessageVolumeDataPoint[]>([])
  const [period, setPeriod] = useState<'7' | '14'>('7')
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const result = await getMessageVolume(parseInt(period))
      setData(result)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    setLoading(true)
    loadData()
  }, [loadData])

  useRealtime('conversations', () => {
    loadData()
  })

  const chartConfig = {
    received: { label: 'Recebidas', color: '#3b82f6' },
    sent: { label: 'Enviadas', color: '#10b981' },
  }

  const hasData = data.some((d) => d.received > 0 || d.sent > 0)

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle>Volume de Mensagens</CardTitle>
            <CardDescription>Mensagens recebidas vs. enviadas por dia.</CardDescription>
          </div>
          <ToggleGroup
            type="single"
            value={period}
            onValueChange={(v) => v && setPeriod(v as '7' | '14')}
          >
            <ToggleGroupItem value="7" className="text-xs">
              7 dias
            </ToggleGroupItem>
            <ToggleGroupItem value="14" className="text-xs">
              14 dias
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="pl-0 pb-4 flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasData ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
            Nenhum dado de mensagem disponível para este período.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full mt-4">
            <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="label"
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar dataKey="received" fill="var(--color-received)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sent" fill="var(--color-sent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
