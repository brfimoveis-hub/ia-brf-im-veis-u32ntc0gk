import { useEffect, useState } from 'react'
import { getCustomers } from '@/services/customers'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Users, AlertCircle, TrendingUp, UserCheck, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { RecordModel } from 'pocketbase'

export default function Dashboard() {
  const [customers, setCustomers] = useState<RecordModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const loadData = async () => {
    try {
      setError(false)
      const data = await getCustomers()
      setCustomers(data)
    } catch (e) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('customers', () => {
    loadData()
  })

  if (loading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium text-slate-700">Erro ao carregar dados do painel.</p>
        <Button onClick={loadData}>Tentar Novamente</Button>
      </div>
    )
  }

  const statusBreakdown = customers.reduce(
    (acc, c) => {
      const status = c.status || 'Sem status'
      acc[status] = (acc[status] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Painel de Controle</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{customers.length}</div>
            <p className="text-xs mt-1 opacity-80">Registrados no CRM</p>
          </CardContent>
        </Card>

        {Object.entries(statusBreakdown).map(([status, count]) => {
          let Icon = TrendingUp
          if (
            status.toLowerCase().includes('fechamento') ||
            status.toLowerCase().includes('closed')
          ) {
            Icon = UserCheck
          } else if (
            status.toLowerCase().includes('novo') ||
            status.toLowerCase().includes('lead')
          ) {
            Icon = Inbox
          }

          return (
            <Card key={status}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle
                  className="text-sm font-medium truncate pr-2"
                  title={`Status: ${status}`}
                >
                  {status}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
