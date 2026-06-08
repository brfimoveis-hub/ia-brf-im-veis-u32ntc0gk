import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, Database, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRealtime } from '@/hooks/use-realtime'
import { useState, useEffect } from 'react'

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

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || ''
    if (s === 'connected' || s === 'active' || s === 'open') return 'text-green-500 bg-green-500/10'
    if (s === 'error' || s === 'disconnected') return 'text-red-500 bg-red-500/10'
    return 'text-yellow-500 bg-yellow-500/10'
  }

  const getStatusText = (status: string) => {
    if (!status) return 'Desconhecido'
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const isBiaConfigured = currentUser?.bia_instructions && currentUser?.ai_instructions

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do sistema e status das integrações em tempo real.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uazapi Status</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getStatusText(currentUser?.uazapi_status)}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  getStatusColor(currentUser?.uazapi_status).replace('text-', 'bg-').split(' ')[0],
                )}
              />
              Conexão WhatsApp
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meta CAPI Status</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getStatusText(currentUser?.meta_capi_status)}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  getStatusColor(currentUser?.meta_capi_status)
                    .replace('text-', 'bg-')
                    .split(' ')[0],
                )}
              />
              Sincronização de Eventos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IA Mãe (Bia)</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isBiaConfigured ? 'Configurada' : 'Pendente'}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  isBiaConfigured ? 'bg-green-500' : 'bg-yellow-500',
                )}
              />
              Instruções base
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
