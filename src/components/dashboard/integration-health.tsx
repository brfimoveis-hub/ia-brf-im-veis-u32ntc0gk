import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle } from 'lucide-react'

export function IntegrationHealth({ user }: { user: any }) {
  const isMetaConnected =
    user?.meta_capi_status === 'connected' ||
    user?.meta_capi_status === 'active' ||
    user?.meta_token_status === 'valid'

  return (
    <Card className="h-full animate-fade-in-up">
      <CardHeader>
        <CardTitle>Saúde das Integrações</CardTitle>
        <CardDescription>Status das conexões ativas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col space-y-2 border rounded-lg p-4 bg-card/50 shadow-sm transition-colors hover:bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="font-semibold text-base text-foreground">Meta CAPI</div>
            <div>
              {isMetaConnected ? (
                <Badge
                  variant="default"
                  className="bg-green-500 hover:bg-green-600 cursor-default shadow-none"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Conectado
                </Badge>
              ) : (
                <Badge variant="destructive" className="cursor-default shadow-none">
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Desconectado
                </Badge>
              )}
            </div>
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            <span className="font-medium text-foreground/80">Pixel:</span>{' '}
            {user?.meta_pixel_id || user?.meta_dataset_id || 'Não configurado'}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
