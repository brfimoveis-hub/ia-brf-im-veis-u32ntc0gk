import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts'
import { MessageCircle, Clock, Users, Zap, RotateCw, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

const chartData = [
  { date: 'Seg', messages: 120 },
  { date: 'Ter', messages: 210 },
  { date: 'Qua', messages: 180 },
  { date: 'Qui', messages: 290 },
  { date: 'Sex', messages: 350 },
  { date: 'Sáb', messages: 150 },
  { date: 'Dom', messages: 90 },
]

const recentEvents = [
  { id: 1, title: 'IA respondeu a João Silva', time: 'Há 2 min', type: 'msg' },
  { id: 2, title: 'Novo contato iniciou fluxo', time: 'Há 15 min', type: 'flow' },
  { id: 3, title: 'IA pausada por operador', time: 'Há 1 hora', type: 'pause' },
  { id: 4, title: 'Instância reconectada', time: 'Há 3 horas', type: 'system' },
  { id: 5, title: 'IA respondeu a Maria Oliveira', time: 'Há 4 horas', type: 'msg' },
]

export default function Index() {
  const { toast } = useToast()

  const handleRestart = () => {
    toast({
      title: 'Reiniciando instância...',
      description: 'Aguarde enquanto a conexão com o WhatsApp é restabelecida.',
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Status Card */}
      <Card className="bg-primary/5 border-primary/20 shadow-sm overflow-hidden relative">
        <div className="absolute right-0 top-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center shadow-inner">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-secondary tracking-tight">55 48 992098050</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  Instância Uazapi_01 • <span className="text-primary font-semibold">Online</span>
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            className="shrink-0 bg-background shadow-sm hover:scale-[1.02] transition-transform"
            onClick={handleRestart}
          >
            <RotateCw className="mr-2 h-4 w-4" />
            Reiniciar Instância
          </Button>
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-subtle hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Mensagens</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">1,390</div>
            <p className="text-xs text-primary font-medium mt-1">
              +20% em relação à semana passada
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-subtle hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Respostas da IA</CardTitle>
            <Bot className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">1,104</div>
            <p className="text-xs text-muted-foreground mt-1">79.4% de taxa de automação</p>
          </CardContent>
        </Card>
        <Card className="shadow-subtle hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio de Resposta</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">4.2s</div>
            <p className="text-xs text-primary font-medium mt-1">-1.1s de melhoria no mês</p>
          </CardContent>
        </Card>
        <Card className="shadow-subtle hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">342</div>
            <p className="text-xs text-muted-foreground mt-1">Nos últimos 7 dias</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7 lg:grid-cols-8">
        <Card className="md:col-span-4 lg:col-span-5 shadow-subtle">
          <CardHeader>
            <CardTitle className="text-secondary">Volume de Interações</CardTitle>
            <CardDescription>Mensagens processadas pela IA nos últimos 7 dias.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ messages: { label: 'Mensagens', color: 'hsl(var(--primary))' } }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="messages"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorMessages)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 lg:col-span-3 shadow-subtle">
          <CardHeader>
            <CardTitle className="text-secondary">Atividade Recente</CardTitle>
            <CardDescription>Últimas ações da inteligência artificial.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-4">
                  <div
                    className={cn(
                      'mt-1 h-2.5 w-2.5 rounded-full shrink-0 shadow-sm',
                      event.type === 'pause'
                        ? 'bg-amber-500'
                        : event.type === 'system'
                          ? 'bg-blue-500'
                          : 'bg-primary',
                    )}
                  />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none text-secondary">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              className="w-full mt-6 text-sm text-primary hover:text-primary/80 hover:bg-primary/10"
            >
              Ver todos os logs
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
