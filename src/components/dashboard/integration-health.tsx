import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export function IntegrationHealth({ user }: { user: any }) {
  const uazapiNeedsFix = user?.uazapi_status !== 'connected'
  const metaNeedsFix =
    !user?.meta_token_status ||
    user.meta_token_status.toLowerCase().includes('expired') ||
    user.meta_token_status.toLowerCase().includes('invalid')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saúde das Integrações</CardTitle>
        <CardDescription>Status dos serviços conectados.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!uazapiNeedsFix ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-destructive" />
            )}
            <span className="font-medium">UAZAPI (WhatsApp)</span>
          </div>
          {!uazapiNeedsFix ? (
            <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
              Conectado
            </Badge>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="destructive">Desconectado</Badge>
              <Button size="sm" variant="outline" asChild>
                <Link to="/configuracoes">Resolver</Link>
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!metaNeedsFix ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-destructive" />
            )}
            <span className="font-medium">Meta CAPI</span>
          </div>
          {!metaNeedsFix ? (
            <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
              Ativo
            </Badge>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="destructive">Atenção</Badge>
              <Button size="sm" variant="outline" asChild>
                <Link to="/configuracoes/meta-capi">Resolver</Link>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
