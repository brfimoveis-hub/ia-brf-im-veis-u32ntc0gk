import { useState, useEffect } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

export function MetaCapiConfig() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [pixelId, setPixelId] = useState(user?.meta_pixel_id || '')
  const [capiToken, setCapiToken] = useState(user?.meta_capi_token || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  const [status, setStatus] = useState<'pending' | 'connected' | 'error'>(
    user?.meta_capi_status || 'pending',
  )
  const [errorMsg, setErrorMsg] = useState(user?.meta_capi_error || '')

  useRealtime('users', (e) => {
    if (e.record.id === user?.id) {
      if (e.record.meta_capi_status !== status) {
        setStatus(e.record.meta_capi_status || 'pending')
      }
      if (e.record.meta_capi_error !== errorMsg) {
        setErrorMsg(e.record.meta_capi_error || '')
      }
      if (e.record.meta_pixel_id && e.record.meta_pixel_id !== pixelId && !isSaving) {
        setPixelId(e.record.meta_pixel_id)
      }
      if (e.record.meta_capi_token && e.record.meta_capi_token !== capiToken && !isSaving) {
        setCapiToken(e.record.meta_capi_token)
      }
    }
  })

  useEffect(() => {
    if (user) {
      setPixelId(user.meta_pixel_id || '')
      setCapiToken(user.meta_capi_token || '')
      setStatus(user.meta_capi_status || 'pending')
      setErrorMsg(user.meta_capi_error || '')
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      await pb.collection('users').update(user.id, {
        meta_pixel_id: pixelId,
        meta_capi_token: capiToken,
      })
      toast({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso.',
      })
      await handleTest()
    } catch (err: any) {
      const fieldErrors = extractFieldErrors(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: Object.values(fieldErrors).join(', ') || err.message,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    try {
      await pb.send('/backend/v1/meta_capi_test_connection', {
        method: 'POST',
        body: JSON.stringify({
          pixel_id: pixelId,
          access_token: capiToken,
        }),
      })
      toast({
        title: 'Teste de Conexão',
        description: 'Conexão com a Meta CAPI estabelecida com sucesso.',
      })
    } catch (err: any) {
      const msg =
        err.response?.error?.message ||
        err.response?.message ||
        err.message ||
        'Falha no teste de conexão.'
      toast({
        variant: 'destructive',
        title: 'Falha na Conexão',
        description: msg,
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meta Conversions API (CAPI)</h1>
        <p className="text-muted-foreground">
          Configure a integração com a Meta para enviar eventos de conversão diretamente do
          servidor.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status da Conexão</CardTitle>
          <CardDescription>
            Acompanhe o estado da sua integração com a Meta em tempo real.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'connected' ? (
            <Alert className="bg-green-500/10 text-green-700 border-green-500/20">
              <CheckCircle2 className="h-4 w-4 stroke-green-700" />
              <AlertTitle>Conectado</AlertTitle>
              <AlertDescription>
                A integração com a Meta CAPI está ativa e funcionando perfeitamente.
              </AlertDescription>
            </Alert>
          ) : status === 'error' ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Falha na Conexão</AlertTitle>
              <AlertDescription>
                {errorMsg ||
                  'Não foi possível conectar com a Meta CAPI. Verifique suas credenciais.'}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Pendente</AlertTitle>
              <AlertDescription>
                A conexão ainda não foi testada ou as credenciais estão incompletas. Preencha os
                campos abaixo e faça um teste.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credenciais da API</CardTitle>
          <CardDescription>
            Insira o ID do seu Pixel e o Token de Acesso gerado no Gerenciador de Eventos da Meta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pixelId">Pixel ID</Label>
            <Input
              id="pixelId"
              placeholder="Ex: 123456789012345"
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="capiToken">Token de Acesso (CAPI)</Label>
            <Input
              id="capiToken"
              type="password"
              placeholder="Ex: EAAB..."
              value={capiToken}
              onChange={(e) => setCapiToken(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t p-6">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={isTesting || !pixelId || !capiToken}
          >
            {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Testar Conexão
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !pixelId || !capiToken}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar Configurações
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
