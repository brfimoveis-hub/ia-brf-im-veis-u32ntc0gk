import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Target, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function SettingsRemarketing() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)

  const [formData, setFormData] = useState({
    meta_pixel_id: '',
    meta_capi_token: '',
    meta_dataset_id: '',
    meta_offline_event_set_id: '',
    meta_app_id: '',
    meta_app_secret: '',
    google_ads_webhook_key: '',
  })

  const [status, setStatus] = useState({
    meta_token_status: '',
    meta_capi_status: '',
    meta_capi_error: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        meta_pixel_id: user.meta_pixel_id || '',
        meta_capi_token: user.meta_capi_token || '',
        meta_dataset_id: user.meta_dataset_id || '',
        meta_offline_event_set_id: user.meta_offline_event_set_id || '',
        meta_app_id: user.meta_app_id || '',
        meta_app_secret: user.meta_app_secret || '',
        google_ads_webhook_key: user.google_ads_webhook_key || '',
      })
      setStatus({
        meta_token_status: user.meta_token_status || '',
        meta_capi_status: user.meta_capi_status || '',
        meta_capi_error: user.meta_capi_error || '',
      })
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    if (!user) return
    setLoading(true)
    try {
      await pb.collection('users').update(user.id, formData)
      toast({
        title: 'Sucesso',
        description: 'Configurações de remarketing atualizadas com sucesso.',
      })
    } catch (err: unknown) {
      const fieldErrors = extractFieldErrors(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: Object.values(fieldErrors)[0] || (err as Error).message || 'Erro desconhecido',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    try {
      try {
        await pb.send('/backend/v1/meta-capi/test-connection', { method: 'POST' })
      } catch {
        try {
          await pb.send('/backend/v1/meta/test-connection', { method: 'POST' })
        } catch {
          // Fallback silently if exact route isn't matched; log will still be fetched.
        }
      }

      await new Promise((r) => setTimeout(r, 2000))

      const logs = await pb.collection('system_logs').getList(1, 5, {
        sort: '-created',
        filter: 'type ~ "meta" || type ~ "capi"',
      })

      if (logs.items.length > 0) {
        const latest = logs.items[0]
        const hasError =
          latest.type === 'meta_capi_error' || latest.message.toLowerCase().includes('erro')
        toast({
          title: hasError ? 'Erro no Teste' : 'Resultado do Teste',
          description: latest.message,
          variant: hasError ? 'destructive' : 'default',
        })
      } else {
        toast({
          title: 'Teste concluído',
          description:
            'O comando foi enviado, mas não foram encontrados logs de resposta recentes.',
        })
      }
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Erro no teste',
        description: (err as Error).message || 'Falha ao testar conexão',
      })
    } finally {
      setTesting(false)
    }
  }

  const getStatusBadge = (statusText: string) => {
    if (!statusText) return <Badge variant="outline">Não Configurado</Badge>
    const lower = statusText.toLowerCase()
    if (lower === 'active' || lower === 'connected' || lower === 'valid') {
      return (
        <Badge className="bg-green-500 hover:bg-green-600 text-white border-transparent">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Conectado
        </Badge>
      )
    }
    if (lower === 'error' || lower === 'invalid' || lower === 'disconnected') {
      return (
        <Badge variant="destructive">
          <AlertCircle className="w-3 h-3 mr-1" /> Erro
        </Badge>
      )
    }
    return <Badge variant="secondary">{statusText}</Badge>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Remarketing</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as credenciais do Meta Pixel, Conversions API (CAPI) e Google Ads.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Meta (Facebook/Instagram)</CardTitle>
            <CardDescription>
              Configurações para rastreamento de eventos e envio de conversões offline via CAPI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Status do Token
                </p>
                {getStatusBadge(status.meta_token_status)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Status CAPI
                </p>
                {getStatusBadge(status.meta_capi_status)}
              </div>
            </div>

            {status.meta_capi_error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro na Integração</AlertTitle>
                <AlertDescription>{status.meta_capi_error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meta_pixel_id">Pixel ID</Label>
                <Input
                  id="meta_pixel_id"
                  name="meta_pixel_id"
                  value={formData.meta_pixel_id}
                  onChange={handleChange}
                  placeholder="Ex: 123456789012345"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta_dataset_id">Dataset ID</Label>
                <Input
                  id="meta_dataset_id"
                  name="meta_dataset_id"
                  value={formData.meta_dataset_id}
                  onChange={handleChange}
                  placeholder="Ex: 123456789012345"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="meta_capi_token">Conversions API Token</Label>
                <Input
                  id="meta_capi_token"
                  name="meta_capi_token"
                  type="password"
                  value={formData.meta_capi_token}
                  onChange={handleChange}
                  placeholder="EAAB..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta_app_id">App ID</Label>
                <Input
                  id="meta_app_id"
                  name="meta_app_id"
                  value={formData.meta_app_id}
                  onChange={handleChange}
                  placeholder="Ex: 1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta_app_secret">App Secret</Label>
                <Input
                  id="meta_app_secret"
                  name="meta_app_secret"
                  type="password"
                  value={formData.meta_app_secret}
                  onChange={handleChange}
                  placeholder="Secreto do aplicativo"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="meta_offline_event_set_id">Offline Event Set ID</Label>
                <Input
                  id="meta_offline_event_set_id"
                  name="meta_offline_event_set_id"
                  value={formData.meta_offline_event_set_id}
                  onChange={handleChange}
                  placeholder="Ex: 123456789012345"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t p-6">
            <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
              {testing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Target className="mr-2 h-4 w-4" />
              )}
              Testar Pixel/CAPI
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Configurações
            </Button>
          </CardFooter>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Google Ads</CardTitle>
            <CardDescription>
              Webhook Key para integração com campanhas do Google Ads.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="google_ads_webhook_key">Google Ads Webhook Key</Label>
              <Input
                id="google_ads_webhook_key"
                name="google_ads_webhook_key"
                value={formData.google_ads_webhook_key}
                onChange={handleChange}
                placeholder="Chave do webhook (opcional)"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t p-6">
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Configurações
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
