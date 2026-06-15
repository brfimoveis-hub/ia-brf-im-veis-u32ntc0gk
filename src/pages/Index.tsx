import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Bot,
  User as UserIcon,
  Activity,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { RecordModel } from 'pocketbase'

export default function Dashboard() {
  const { user: authUser } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [userSettings, setUserSettings] = useState<RecordModel | null>(null)
  const [customers, setCustomers] = useState<RecordModel[]>([])
  const [cadences, setCadences] = useState<RecordModel[]>([])
  const [isSyncing, setIsSyncing] = useState(false)

  const loadData = async () => {
    if (!authUser?.id) return
    try {
      const [uRes, cRes, cadRes] = await Promise.all([
        pb.collection('users').getOne(authUser.id),
        pb.collection('customers').getFullList(),
        pb.collection('cadences').getFullList({ sort: 'order' }),
      ])
      setUserSettings(uRes)
      setCustomers(cRes)
      setCadences(cadRes)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [authUser?.id])

  useRealtime('users', (e) => {
    if (e.action === 'update' && e.record.id === authUser?.id) {
      setUserSettings(e.record)
    }
  })

  useRealtime('customers', () => {
    pb.collection('customers').getFullList().then(setCustomers).catch(console.error)
  })

  const handleResync = async () => {
    setIsSyncing(true)
    try {
      await pb.send('/backend/v1/uazapi/resync', { method: 'POST' })
      toast({ title: 'Sincronização concluída', description: 'Status atualizado com sucesso.' })
    } catch (err) {
      toast({
        title: 'Falha na sincronização',
        description: 'Não foi possível conectar ao Uazapi.',
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center flex-col gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-lg font-medium text-muted-foreground animate-pulse">
          Carregando CRM Inteligente...
        </span>
      </div>
    )
  }

  const stages = [
    'Novo',
    'lead',
    'contact',
    'Qualificação',
    'Engajamento',
    'Demo Realiz.',
    'Visita',
    'Proposta',
    'Fechamento',
    'closed',
  ]

  const customerCountsByStage = stages.reduce(
    (acc, stage) => {
      acc[stage] = customers.filter(
        (c) => c.status === stage || (stage === 'lead' && c.status === 'Lead Novo'),
      ).length
      return acc
    },
    {} as Record<string, number>,
  )

  const hasUazapiConfig = !!(userSettings?.uazapi_token || userSettings?.uazapi_domain)
  const isConnected = userSettings?.uazapi_status === 'connected'

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel de Controle</h1>
        <p className="text-muted-foreground mt-1">Gerencie seu ambiente do CRM Inteligente</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Conexão Uazapi
            </CardTitle>
            <CardDescription>Status da integração com WhatsApp</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Status da API</p>
                {isConnected ? (
                  <Badge
                    variant="default"
                    className="bg-green-500 hover:bg-green-600 font-medium px-3 py-1 text-sm"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Conectado
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="font-medium px-3 py-1 text-sm">
                    <XCircle className="h-4 w-4 mr-2" /> Offline / Desconectado
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground mb-1">Instância</p>
                <p className="font-semibold text-lg">
                  {userSettings?.uazapi_instance_number || '---'}
                </p>
              </div>
            </div>

            {hasUazapiConfig && !isConnected && (
              <div className="pt-2">
                <Button
                  onClick={handleResync}
                  disabled={isSyncing}
                  variant="outline"
                  className="w-full h-11 border-primary/20 hover:bg-primary/5"
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2 text-primary" />
                  )}
                  Re-sincronizar Conexão
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-500" />
              Identidade da IA
            </CardTitle>
            <CardDescription>Perfil e diretrizes da assistente virtual</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex gap-6 items-start">
            <div className="h-24 w-24 rounded-full overflow-hidden bg-secondary flex items-center justify-center border-4 border-background shadow-md shrink-0">
              {userSettings?.ai_avatar ? (
                <img
                  src={pb.files.getURL(userSettings, userSettings.ai_avatar)}
                  alt="AI Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserIcon className="h-12 w-12 text-muted-foreground/50" />
              )}
            </div>
            <div className="space-y-3 flex-1">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nome da Persona
                </p>
                <p className="font-bold text-lg">{userSettings?.ai_name || 'Bia'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  ID da Voz
                </p>
                <Badge variant="secondary" className="mt-1 font-mono text-xs">
                  {userSettings?.ai_voice_id || 'padrão'}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Instruções Base
                </p>
                <p className="text-sm text-foreground/80 line-clamp-2 mt-1 bg-muted/50 p-2 rounded-md">
                  {userSettings?.bia_instructions ||
                    userSettings?.ai_instructions ||
                    'Sistema utilizando as diretrizes globais.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Funil de Cadência Automatizado (10 Estágios)</CardTitle>
          <CardDescription>Movimentação automática guiada pelas interações da IA</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {stages.map((stage, idx) => (
              <div
                key={stage}
                className="bg-card border shadow-sm rounded-xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-primary/50 transition-all duration-300"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-muted group-hover:bg-primary transition-colors duration-300" />
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                  Etapa {idx + 1}
                </span>
                <span className="font-bold text-sm mb-3 text-card-foreground line-clamp-1">
                  {stage}
                </span>
                <div
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center text-xl font-black mb-1 transition-colors duration-300',
                    customerCountsByStage[stage] > 0
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {customerCountsByStage[stage] || 0}
                </div>
                <span className="text-[10px] text-muted-foreground uppercase">clientes</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
