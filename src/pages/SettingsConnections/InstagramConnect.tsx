import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import pb from '@/lib/pocketbase/client'
import {
  getInstagramOAuthUrl,
  exchangeInstagramCode,
  testInstagramConnection,
  testMessengerConnection,
} from '@/services/instagram'
import { StatusTrafficLight } from './StatusTrafficLight'
import { Instagram, MessageSquare, Loader2, RefreshCw, Link2, AlertCircle } from 'lucide-react'

const OAUTH_STATE = 'instagram_oauth'
const REDIRECT_PATH = '/settings/connections'

export function InstagramConnect() {
  const { user, loading } = useAuth()
  const { toast } = useToast()
  const [exchanging, setExchanging] = useState(false)
  const [testingInstagram, setTestingInstagram] = useState(false)
  const [testingMessenger, setTestingMessenger] = useState(false)
  const [showMissingConfig, setShowMissingConfig] = useState(false)

  const appId = user?.meta_app_id || ''
  const appSecret = user?.meta_app_secret || ''
  const instagramConnected = !!user?.meta_instagram_business_id
  const messengerConnected = !!user?.meta_page_access_token

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')

    if (!code || state !== OAUTH_STATE) return

    setExchanging(true)
    const redirectUri = window.location.origin + REDIRECT_PATH

    exchangeInstagramCode(code, redirectUri)
      .then(async () => {
        try {
          await pb.collection('users').authRefresh()
        } catch {
          /* intentionally ignored */
        }
        toast({ title: 'Instagram conectado com sucesso' })
      })
      .catch((err) => {
        toast({
          title: `Falha ao conectar Instagram: ${getErrorMessage(err)}`,
          variant: 'destructive',
        })
      })
      .finally(() => {
        const url = new URL(window.location.href)
        url.searchParams.delete('code')
        url.searchParams.delete('state')
        window.history.replaceState({}, document.title, url.toString())
        setExchanging(false)
      })
  }, [toast])

  const handleConnect = useCallback(() => {
    if (!appId || !appSecret) {
      setShowMissingConfig(true)
      toast({
        title:
          'Preencha o App ID e App Secret na aba Meta API Configuration antes de conectar o Instagram.',
        variant: 'destructive',
      })
      return
    }
    setShowMissingConfig(false)
    const redirectUri = window.location.origin + REDIRECT_PATH
    window.location.href = getInstagramOAuthUrl(appId, redirectUri)
  }, [appId, appSecret, toast])

  const handleTestInstagram = useCallback(async () => {
    setTestingInstagram(true)
    try {
      await testInstagramConnection()
      toast({ title: 'Instagram Business: Conectado' })
    } catch (err) {
      toast({
        title: `Instagram Business: ${getErrorMessage(err)}`,
        variant: 'destructive',
      })
    } finally {
      setTestingInstagram(false)
    }
  }, [toast])

  const handleTestMessenger = useCallback(async () => {
    setTestingMessenger(true)
    try {
      await testMessengerConnection()
      toast({ title: 'Messenger: Conectado' })
    } catch (err) {
      toast({
        title: `Messenger: ${getErrorMessage(err)}`,
        variant: 'destructive',
      })
    } finally {
      setTestingMessenger(false)
    }
  }, [toast])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          <div className="h-10 w-full bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Instagram className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-lg">Instagram Business & Messenger</CardTitle>
            <CardDescription>Conecte via Facebook OAuth</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showMissingConfig && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Preencha o App ID e App Secret na aba Meta API Configuration antes de conectar o
              Instagram.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <Instagram className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Instagram Business</span>
              <StatusTrafficLight status={instagramConnected ? 'connected' : ''} />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestInstagram}
              disabled={testingInstagram || !instagramConnected}
            >
              {testingInstagram ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Verificar Agora
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Messenger</span>
              <StatusTrafficLight status={messengerConnected ? 'connected' : ''} />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestMessenger}
              disabled={testingMessenger || !messengerConnected}
            >
              {testingMessenger ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Verificar Agora
            </Button>
          </div>
        </div>

        <Button onClick={handleConnect} disabled={exchanging} className="w-full">
          {exchanging ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Conectando...
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4" />
              Conectar Instagram
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
