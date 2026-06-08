import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'

export function MetaCapiConfig() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [pixelId, setPixelId] = useState(user?.meta_pixel_id || '')
  const [capiToken, setCapiToken] = useState(user?.meta_capi_token || '')
  const [businessId, setBusinessId] = useState(user?.meta_whatsapp_business_id || '')

  const [status, setStatus] = useState<'idle' | 'testing' | 'saving'>('idle')
  const [connectionStatus, setConnectionStatus] = useState(user?.meta_capi_status || 'disconnected')
  const [errorMessage, setErrorMessage] = useState(user?.meta_capi_error || '')

  useEffect(() => {
    if (user) {
      setPixelId(user.meta_pixel_id || '')
      setCapiToken(user.meta_capi_token || '')
      setBusinessId(user.meta_whatsapp_business_id || '')
      setConnectionStatus(user.meta_capi_status || 'disconnected')
      setErrorMessage(user.meta_capi_error || '')
    }
  }, [user])

  useRealtime('users', (e) => {
    if (e.record.id === user?.id) {
      setConnectionStatus(e.record.meta_capi_status || 'disconnected')
      setErrorMessage(e.record.meta_capi_error || '')
    }
  })

  const handleSave = async () => {
    if (!pixelId || !capiToken) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Pixel ID e Token são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    try {
      setStatus('saving')
      await pb.collection('users').update(user.id, {
        meta_pixel_id: pixelId,
        meta_capi_token: capiToken,
        meta_whatsapp_business_id: businessId,
      })
      toast({
        title: 'Sucesso',
        description: 'Configurações salvas.',
      })
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setStatus('idle')
    }
  }

  const handleTestConnection = async () => {
    if (!pixelId || !capiToken) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Pixel ID e Token são obrigatórios para o teste.',
        variant: 'destructive',
      })
      return
    }

    try {
      setStatus('testing')
      const res = await pb.send('/backend/v1/meta_capi_test_connection', {
        method: 'POST',
        body: JSON.stringify({
          pixel_id: pixelId,
          access_token: capiToken,
          business_id: businessId,
        }),
      })

      if (res.success) {
        if (user?.id) {
          await pb.collection('users').update(user.id, {
            meta_capi_status: 'connected',
            meta_capi_error: '',
          })
        }
        toast({
          title: 'Conexão bem sucedida',
          description: 'A comunicação com a Meta API está funcionando perfeitamente.',
        })
      }
    } catch (err: any) {
      const msg = err?.response?.error?.message || err?.message || 'Erro ao testar a conexão'
      if (user?.id) {
        await pb
          .collection('users')
          .update(user.id, {
            meta_capi_status: 'error',
            meta_capi_error: msg,
          })
          .catch(() => {})
      }
      toast({
        title: 'Falha na conexão',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setStatus('idle')
    }
  }

  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Meta Conversions API (CAPI)</h1>
        <p className="text-muted-foreground mt-2">
          Configure a integração com o Meta CAPI para envio de eventos com qualidade aprimorada.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Credenciais de Integração</CardTitle>
          <CardDescription>Insira os dados do seu Gerenciador de Negócios da Meta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {connectionStatus === 'connected' && (
            <div className="bg-green-50 text-green-700 p-4 rounded-md flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium">Status: Verificado</h4>
                <p className="text-sm mt-1">
                  Sua conexão com o Meta CAPI está ativa e configurada corretamente.
                </p>
              </div>
            </div>
          )}

          {connectionStatus === 'error' && (
            <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium">Erro de Conexão</h4>
                <p className="text-sm mt-1">
                  {errorMessage || 'Verifique suas credenciais e tente novamente.'}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pixelId">Pixel ID</Label>
              <Input
                id="pixelId"
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                placeholder="Ex: 123456789012345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capiToken">Token de Acesso (CAPI)</Label>
              <Input
                id="capiToken"
                type="password"
                value={capiToken}
                onChange={(e) => setCapiToken(e.target.value)}
                placeholder="Ex: EAAB..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessId">Business ID (Opcional)</Label>
              <Input
                id="businessId"
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                placeholder="ID do Gerenciador de Negócios"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t">
            <Button onClick={handleSave} disabled={status !== 'idle'}>
              {status === 'saving' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar Configurações
            </Button>

            <Button variant="outline" onClick={handleTestConnection} disabled={status !== 'idle'}>
              {status === 'testing' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Testar Conexão
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
