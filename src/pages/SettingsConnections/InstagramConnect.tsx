import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Instagram, CheckCircle2, AlertCircle, Info, MessageSquare } from 'lucide-react'

export function InstagramConnect() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [igConnected, setIgConnected] = useState(!!user?.meta_instagram_business_id)
  const [msgConnected, setMsgConnected] = useState(!!user?.meta_page_access_token)

  useRealtime('users', (e) => {
    if (!user?.id || e.record.id !== user.id) return
    const newIg = !!e.record.meta_instagram_business_id
    const newMsg = !!e.record.meta_page_access_token
    if (newIg !== igConnected) setIgConnected(newIg)
    if (newMsg !== msgConnected) setMsgConnected(newMsg)
  })

  const hasAppConfig = !!user?.meta_app_id && !!user?.meta_app_secret
  const redirectUri = `${window.location.origin}/settings/connections/instagram/callback`

  const handleConnect = () => {
    if (!hasAppConfig) {
      toast({
        variant: 'destructive',
        title: 'Configuração incompleta',
        description:
          'Preencha o Meta App ID e App Secret na aba "Meta API Configuration" primeiro.',
      })
      return
    }

    const scope =
      'instagram_basic,instagram_manage_messages,pages_manage_metadata,pages_read_engagement,pages_show_list,pages_messaging'
    const oauthUrl = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${user!.meta_app_id}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`

    window.open(oauthUrl, '_blank')
    toast({
      title: 'Abrindo login do Facebook',
      description: 'Uma nova aba foi aberta para você autorizar a conexão.',
    })
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <Instagram className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl">Instagram Business &amp; Messenger</CardTitle>
        </div>
        <CardDescription>
          Conecte sua conta do Instagram Business e Messenger para receber mensagens diretamente no
          CRM.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {!hasAppConfig && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-700">Configuração necessária</AlertTitle>
            <AlertDescription className="text-yellow-600">
              Antes de conectar, preencha o <strong>Meta App ID</strong> e{' '}
              <strong>App Secret</strong> na aba &quot;Meta API Configuration&quot; acima.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          <Button onClick={handleConnect} className="gap-2">
            <Instagram className="h-4 w-4" />
            Conectar Instagram
          </Button>

          <div className="flex items-center gap-3 flex-wrap">
            <Badge
              className={igConnected ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}
              variant={igConnected ? 'default' : 'secondary'}
            >
              {igConnected ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Instagram Conectado
                </>
              ) : (
                'Instagram Aguardando'
              )}
            </Badge>
            <Badge
              className={msgConnected ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}
              variant={msgConnected ? 'default' : 'secondary'}
            >
              {msgConnected ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Messenger Conectado
                </>
              ) : (
                'Messenger Aguardando'
              )}
            </Badge>
          </div>
        </div>

        <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground mb-1">Como funciona:</p>
            <p>
              Clique em &quot;Conectar Instagram&quot; para abrir o login do Facebook em uma nova
              aba. Após autorizar, o Instagram Business ID e os tokens serão configurados
              automaticamente. O status dos cards acima será atualizado em tempo real.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default InstagramConnect
