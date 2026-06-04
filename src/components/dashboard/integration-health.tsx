import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

export function IntegrationHealth({ user }: { user: any }) {
  const instanceNumber = user?.uazapi_instance_number || '554892098050'
  const isConnected = user?.uazapi_status === 'connected'
  const isQrReady = user?.uazapi_status === 'qr_ready'

  let errorMsg = user?.uazapi_error || ''
  if (errorMsg.includes('Not Found') || errorMsg.includes('404')) {
    errorMsg = 'Instância não encontrada. Verifique se o ID da Instância e o Token estão corretos.'
  }

  return (
    <Card className="h-full animate-fade-in-up">
      <CardHeader>
        <CardTitle>Saúde das Integrações</CardTitle>
        <CardDescription>Status das conexões ativas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col space-y-2 border rounded-lg p-4 bg-card/50 shadow-sm transition-colors hover:bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="font-semibold text-base text-foreground">WhatsApp (Uazapi)</div>
            <div>
              {isConnected ? (
                <Badge
                  variant="default"
                  className="bg-green-500 hover:bg-green-600 cursor-default shadow-none"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Conectado
                </Badge>
              ) : isQrReady ? (
                <Badge
                  variant="outline"
                  className="text-yellow-600 border-yellow-600 cursor-default bg-yellow-50 dark:bg-yellow-950/20"
                >
                  <AlertCircle className="w-3.5 h-3.5 mr-1" /> Aguardando QR
                </Badge>
              ) : (
                <Badge variant="destructive" className="cursor-default shadow-none">
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Desconectado
                </Badge>
              )}
            </div>
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            <span className="font-medium text-foreground/80">Instância:</span> {instanceNumber}
          </div>
          {isConnected && user?.profileName && (
            <div className="text-sm mt-1">
              <span className="font-medium text-foreground/80">Perfil:</span> {user.profileName}
              {user.currentPresence && (
                <span className="ml-1 text-muted-foreground">({user.currentPresence})</span>
              )}
            </div>
          )}
          {!isConnected && errorMsg && (
            <div className="text-sm text-destructive mt-3 bg-destructive/10 p-3 rounded-md border border-destructive/20 font-medium">
              {errorMsg}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
