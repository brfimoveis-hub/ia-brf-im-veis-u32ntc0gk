import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, MessageSquare, Bot, Activity, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function Dashboard() {
  const { user } = useAuth()
  const [customerCount, setCustomerCount] = useState(0)
  const [cadenceCount, setCadenceCount] = useState(0)
  const [iaInteractions, setIaInteractions] = useState(0)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const customersRes = await pb.collection('customers').getList(1, 1, { fields: 'id' })
        setCustomerCount(customersRes.totalItems)

        const cadencesRes = await pb
          .collection('cadences')
          .getList(1, 1, { filter: 'is_active = true', fields: 'id' })
        setCadenceCount(cadencesRes.totalItems)

        const iaRes = await pb.collection('leads').getList(1, 1, { fields: 'id' })
        setIaInteractions(iaRes.totalItems)
      } catch (err) {
        console.error(err)
      }
    }
    if (user) {
      fetchStats()
    }
  }, [user])

  useRealtime('customers', () => {
    pb.collection('customers')
      .getList(1, 1, { fields: 'id' })
      .then((res) => setCustomerCount(res.totalItems))
      .catch(console.error)
  })

  useRealtime('cadences', () => {
    pb.collection('cadences')
      .getList(1, 1, { filter: 'is_active = true', fields: 'id' })
      .then((res) => setCadenceCount(res.totalItems))
      .catch(console.error)
  })

  useRealtime('leads', () => {
    pb.collection('leads')
      .getList(1, 1, { fields: 'id' })
      .then((res) => setIaInteractions(res.totalItems))
      .catch(console.error)
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">CRM Pipeline (Dashboard)</h2>
        <p className="text-muted-foreground">
          Bem-vindo de volta, {user?.name || 'Administrador'}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerCount}</div>
            <p className="text-xs text-muted-foreground">Na base de dados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Cadências</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cadenceCount}</div>
            <p className="text-xs text-muted-foreground">Ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Uazapi Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${user?.uazapi_status === 'Conectado' ? 'text-emerald-600' : ''}`}
            >
              {user?.uazapi_status === 'Conectado' ? 'Ativo' : 'Inativo'}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Instância: {user?.uazapi_instance_number || 'Não configurada'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">IA Interações</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{iaInteractions}</div>
            <p className="text-xs text-muted-foreground">Leads Totais</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Configurações Rápidas</CardTitle>
            <CardDescription>Acesso rápido aos módulos principais da plataforma.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
              <div className="space-y-1">
                <h4 className="font-medium text-sm">Integração WhatsApp</h4>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Gerencie sua conexão com o Uazapi, número da instância e tokens de acesso para
                  garantir o funcionamento da IA.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/configuracoes">
                  Configurar Uazapi <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
