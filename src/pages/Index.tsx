import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, MessageSquare, Target, AlertCircle, Link } from 'lucide-react'
import { UazapiConfig } from '@/components/UazapiConfig'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useRealtime } from '@/hooks/use-realtime'

export default function Index() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ customers: 0, leads: 0, conversations: 0 })
  const [status, setStatus] = useState(user?.uazapi_status || 'disconnected')
  const [errorMsg, setErrorMsg] = useState(user?.uazapi_error || '')

  useEffect(() => {
    if (user) {
      setStatus(user.uazapi_status || 'disconnected')
      setErrorMsg(user.uazapi_error || '')
    }
  }, [user])

  useRealtime('users', (e) => {
    if (e.record.id === user?.id) {
      setStatus(e.record.uazapi_status || 'disconnected')
      setErrorMsg(e.record.uazapi_error || '')
    }
  })

  // Listen to collection changes to keep stats up to date
  useRealtime('customers', () => fetchStats())
  useRealtime('leads', () => fetchStats())
  useRealtime('conversations', () => fetchStats())

  const fetchStats = async () => {
    try {
      const [customersRes, leadsRes, conversationsRes] = await Promise.all([
        pb.collection('customers').getList(1, 1, { $autoCancel: false }),
        pb.collection('leads').getList(1, 1, { $autoCancel: false }),
        pb.collection('conversations').getList(1, 1, { $autoCancel: false }),
      ])
      setStats({
        customers: customersRes.totalItems,
        leads: leadsRes.totalItems,
        conversations: conversationsRes.totalItems,
      })
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard CRM</h1>
        <p className="text-muted-foreground mt-2">
          Visão geral do sistema e status das integrações do WhatsApp.
        </p>
      </div>

      {(status === 'error' || status === 'disconnected') && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Atenção à Conexão Uazapi</AlertTitle>
          <AlertDescription>
            Sua instância do WhatsApp está atualmente{' '}
            <strong>{status === 'error' ? 'com erro' : 'desconectada'}</strong>.
            {errorMsg && <div className="mt-1 font-mono text-sm opacity-80">{errorMsg}</div>}
            Por favor, verifique suas credenciais abaixo e clique em &quot;Testar Conexão&quot;.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.customers}</div>
            <p className="text-xs text-muted-foreground mt-1">Registrados no sistema</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.leads}</div>
            <p className="text-xs text-muted-foreground mt-1">Em prospecção atual</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversas Registradas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversations}</div>
            <p className="text-xs text-muted-foreground mt-1">Interações capturadas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            Configurações de Integração
          </h2>
          <UazapiConfig />
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            Status do Webhook
          </h2>
          <Card className="border-border/50 bg-muted/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Link className="h-5 w-5" />
                Webhook Transparency Tool
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Para que a IA consiga responder automaticamente, a plataforma Uazapi precisa enviar
                os eventos para o nosso sistema em tempo real.
              </p>
              <div className="space-y-2 bg-muted/30 p-4 rounded-md border border-border/50">
                <strong className="text-foreground">Eventos Obrigatórios:</strong>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">messages.upsert</code>
                  </li>
                  <li>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">messages.update</code>
                  </li>
                  <li>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">connection.update</code>
                  </li>
                </ul>
              </div>
              <p>
                A URL do Webhook deve ser copiada da seção de configuração ao lado e colada no
                painel da sua instância Uazapi. Certifique-se de que a URL seja exatamente igual à
                gerada para o seu ambiente.
              </p>
              <div className="bg-primary/5 p-4 rounded-md border border-primary/20">
                <p className="text-primary font-medium text-xs break-all">
                  {import.meta.env.VITE_POCKETBASE_URL}/backend/v1/uazapi/webhook
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
