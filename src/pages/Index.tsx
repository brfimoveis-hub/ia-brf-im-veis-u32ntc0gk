import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { KPICards } from '@/components/dashboard/kpi-cards'
import { PipelineChart } from '@/components/dashboard/pipeline-chart'
import { ActivityMonitor } from '@/components/dashboard/activity-monitor'
import { IntegrationHealth } from '@/components/dashboard/integration-health'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { getDashboardCustomers } from '@/services/customers'
import { getRecentConversations, getAiConversations } from '@/services/conversations'
import { getCurrentUser } from '@/services/users'
import { Loader2 } from 'lucide-react'

export default function Index() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<any[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [aiConversations, setAiConversations] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(user)

  const loadData = async () => {
    if (!user) return
    try {
      const [custs, convs, aiConvs, usr] = await Promise.all([
        getDashboardCustomers(),
        getRecentConversations(),
        getAiConversations(),
        getCurrentUser(user.id),
      ])
      setCustomers(custs)
      setConversations(convs.items)
      setAiConversations(aiConvs)
      setCurrentUser(usr)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useRealtime('customers', () => {
    loadData()
  })
  useRealtime('conversations', () => {
    loadData()
  })
  useRealtime('users', () => {
    loadData()
  })

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe seu funil de vendas, IA e saúde das integrações em tempo real.
          </p>
        </div>
        <QuickActions />
      </div>

      <KPICards customers={customers} aiConversations={aiConversations} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6">
        <div className="lg:col-span-4 h-full">
          <PipelineChart customers={customers} />
        </div>
        <div className="lg:col-span-3 space-y-6">
          <IntegrationHealth user={currentUser} />
          <ActivityMonitor conversations={conversations} />
        </div>
      </div>
    </div>
  )
}
