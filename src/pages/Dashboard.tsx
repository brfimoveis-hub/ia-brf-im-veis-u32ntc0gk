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

  const [currentUser, setCurrentUser] = useState<any>(user)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user) {
          const usr = await pb.collection('users').getOne(user.id)
          setCurrentUser(usr)
        }

        const customersRes = await pb.collection('customers').getList(1, 1, { fields: 'id' })
        setCustomerCount(customersRes.totalItems)

        const cadencesRes = await pb
          .collection('cadences')
          .getList(1, 1, { filter: 'is_active = true', fields: 'id' })
        setCadenceCount(cadencesRes.totalItems)

        const iaRes = await pb.collection('leads').getList(1, 1, { fields: 'id' })
        setIaInteractions(iaRes.totalItems)

        // Poll Uazapi status silently so dashboard shows updated state
        pb.send('/backend/v1/uazapi/status', { method: 'GET' }).catch(() => {})
      } catch (err) {
        console.error(err)
      }
    }
    if (user) {
      fetchStats()
    }
  }, [user])

  useRealtime('users', () => {
    if (user) {
      pb.collection('users')
        .getOne(user.id)
        .then((res) => setCurrentUser(res))
        .catch(console.error)
    }
  })

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
          Bem-vindo de volta, {currentUser?.name || user?.name || 'Administrador'}.
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
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentUser?.uazapi_status === 'connected' ? 'bg-emerald-400' : 'bg-red-400'}`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${currentUser?.uazapi_status === 'connected' ? 'bg-emerald-500' : currentUser?.uazapi_status === 'qr_ready' ? 'bg-amber-500' : 'bg-red-500'}`}
                ></span>
              </span>
              <div
                className={`text-2xl font-bold ${currentUser?.uazapi_status === 'connected' ? 'text-emerald-600' : currentUser?.uazapi_status === 'qr_ready' ? 'text-amber-600' : 'text-red-600'}`}
              >
                {currentUser?.uazapi_status === 'connected' ? 'Conectado' : 'Desconectado'}
              </div>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-1">
              Instância: {currentUser?.uazapi_instance_number || 'Não configurada'}
            </p>
            {currentUser?.uazapi_error && currentUser.uazapi_status !== 'connected' && (
              <p
                className="text-xs text-red-500 mt-1 line-clamp-2"
                title={currentUser.uazapi_error}
              >
                Erro: {currentUser.uazapi_error}
              </p>
            )}
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
