import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis } from 'recharts'

export function PipelineChart({ customers }: { customers: any[] }) {
  const chartData = useMemo(() => {
    const counts = customers.reduce(
      (acc, c) => {
        const status = c.status || 'Novo'
        acc[status] = (acc[status] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.keys(counts)
      .map((key) => ({
        status: key,
        count: counts[key],
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
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
        <CardTitle>Distribuição do Funil</CardTitle>
        <CardDescription>Distribuição de leads por status.</CardDescription>
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
