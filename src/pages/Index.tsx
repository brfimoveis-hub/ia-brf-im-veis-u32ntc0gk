import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Activity,
  Bot,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export default function Index() {
  const { user } = useAuth()
  const [currentUser, setCurrentUser] = useState<any>(user)

  useEffect(() => {
    setCurrentUser(user)
  }, [user])

  useRealtime('users', (e) => {
    if (e.action === 'update' && e.record.id === user?.id) {
      setCurrentUser(e.record)
    }
  })

  const getStatusIcon = (status: string) => {
    const s = status?.toLowerCase() || ''
    if (s === 'connected' || s === 'active' || s === 'open')
      return <CheckCircle2 className="h-5 w-5 text-green-500" />
    if (s === 'disconnected' || s === 'error') return <XCircle className="h-5 w-5 text-red-500" />
    return <AlertCircle className="h-5 w-5 text-yellow-500" />
  }

  const getStatusText = (status: string) => {
    const s = status?.toLowerCase() || ''
    if (s === 'connected' || s === 'active' || s === 'open') return 'Conectado'
    if (s === 'disconnected' || s === 'error') return 'Desconectado / Erro'
    return status || 'Desconhecido'
  }

  return (
    <div className="container mx-auto py-8 max-w-5xl space-y-8 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Conectividade</h1>
        <p className="text-slate-500">
          Bem-vindo, {currentUser?.name || currentUser?.email}. Monitore o status das suas
          integrações em tempo real.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card
          className={cn(
            'transition-all duration-300 border-l-4',
            currentUser?.uazapi_status === 'connected' || currentUser?.uazapi_status === 'open'
              ? 'border-l-green-500'
              : 'border-l-red-500',
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conexão Uazapi</CardTitle>
            <MessageSquare className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getStatusIcon(currentUser?.uazapi_status)}
              <span className="text-2xl font-bold">
                {getStatusText(currentUser?.uazapi_status)}
              </span>
            </div>
            {currentUser?.uazapi_error && (
              <p className="text-xs text-red-500 mt-2 truncate" title={currentUser?.uazapi_error}>
                {currentUser?.uazapi_error}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-2">
              Instância: {currentUser?.uazapi_instance_number || 'Não configurada'}
            </p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'transition-all duration-300 border-l-4',
            currentUser?.meta_capi_status === 'active' ||
              currentUser?.meta_capi_status === 'connected'
              ? 'border-l-green-500'
              : 'border-l-yellow-500',
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Meta Remarketing</CardTitle>
            <RefreshCw className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getStatusIcon(currentUser?.meta_capi_status)}
              <span className="text-2xl font-bold">
                {getStatusText(currentUser?.meta_capi_status)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Pixel ID: {currentUser?.meta_pixel_id || 'Não configurado'}
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">IA Mãe (Bia)</CardTitle>
            <Bot className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">Ativa</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 truncate" title={currentUser?.ai_name}>
              Nome: {currentUser?.ai_name || 'Bia'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
          <CardDescription>Acompanhe os últimos eventos e integrações de sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <Activity className="h-8 w-8 text-slate-400 mb-3" />
            <p className="text-sm text-slate-500">
              O log de atividades integrado será exibido aqui em breve.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
