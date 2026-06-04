import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, MessageSquare, Share2 } from 'lucide-react'

export function IntegrationHealth({ user }: { user: any }) {
  const isUazapiConnected = user?.uazapi_status === 'connected'
  const isUazapiPending = user?.uazapi_status === 'qr_ready'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Saúde das Integrações
        </CardTitle>
        <CardDescription>Status das conexões do sistema em tempo real.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Uazapi Status */}
        <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">WhatsApp (Uazapi)</p>
              <p className="text-xs text-muted-foreground">
                Instância: {user?.uazapi_instance_number || 'N/A'}
              </p>
              {user?.uazapi_error && !isUazapiConnected && (
                <p className="text-xs text-red-500 mt-1 line-clamp-1" title={user.uazapi_error}>
                  {user.uazapi_error}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isUazapiConnected ? 'bg-emerald-400' : isUazapiPending ? 'bg-amber-400' : 'bg-red-400'}`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isUazapiConnected ? 'bg-emerald-500' : isUazapiPending ? 'bg-amber-500' : 'bg-red-500'}`}
              ></span>
            </span>
            <Badge
              variant={isUazapiConnected ? 'default' : 'secondary'}
              className={
                isUazapiConnected
                  ? 'bg-emerald-500 hover:bg-emerald-600'
                  : isUazapiPending
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
              }
            >
              {isUazapiConnected ? 'Conectado' : 'Desconectado'}
            </Badge>
          </div>
        </div>

        {/* Generic Example for maintaining layout structure */}
        <div className="flex items-center justify-between p-3 border rounded-lg bg-card opacity-70">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <Share2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Meta CAPI</p>
              <p className="text-xs text-muted-foreground">API de Conversões</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              user?.meta_capi_status === 'connected' ? 'border-emerald-500 text-emerald-500' : ''
            }
          >
            {user?.meta_capi_status === 'connected' ? 'Conectado' : 'Pendente'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
