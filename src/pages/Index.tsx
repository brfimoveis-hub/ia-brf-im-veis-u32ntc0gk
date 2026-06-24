import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Bot, Layers, Target } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({ leads: 0, customers: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const [leadsRes, customersRes] = await Promise.all([
          pb.collection('leads').getList(1, 1, { filter: "status != 'converted'" }),
          pb.collection('customers').getList(1, 1),
        ])
        setStats({ leads: leadsRes.totalItems, customers: customersRes.totalItems })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Cérebro do Sistema</h1>
        <p className="text-muted-foreground">
          Visão geral do seu Pipeline e atividade da Inteligência Artificial.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : stats.leads}</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando conversão no Pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes no Pipeline</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : stats.customers}</div>
            <p className="text-xs text-muted-foreground mt-1">Total de oportunidades ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estágios do Pipeline</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">10</div>
            <p className="text-xs text-muted-foreground mt-1">D0 até D9 estruturados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atividade da BIA</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ativa</div>
            <p className="text-xs text-muted-foreground mt-1">Monitorando interações</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
