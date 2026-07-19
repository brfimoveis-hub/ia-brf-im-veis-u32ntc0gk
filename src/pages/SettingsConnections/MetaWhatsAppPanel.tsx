import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { MetaSetupGuide } from './MetaSetupGuide'
import { StatusTrafficLight } from './StatusTrafficLight'
import { MaskedInput } from './MaskedInput'
import { Loader2, MessageCircle, CheckCircle2, AlertCircle, Copy } from 'lucide-react'

const WEBHOOK_BASE = `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/meta_whatsapp_webhook`

export function MetaWhatsAppPanel() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [phoneId, setPhoneId] = useState(user?.meta_whatsapp_phone_number_id || '')
  const [accessToken, setAccessToken] = useState(user?.meta_whatsapp_access_token || '')
  const [businessId, setBusinessId] = useState(user?.meta_whatsapp_business_id || '')
  const [verifyToken, setVerifyToken] = useState(user?.meta_whatsapp_verify_token || '')
  const [tokenStatus, setTokenStatus] = useState(user?.meta_token_status || '')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useRealtime('users', (e) => {
    if (!user?.id || e.record.id !== user.id) return
    setTokenStatus(e.record.meta_token_status || '')
  })

  const webhookUrl = user?.id ? `${WEBHOOK_BASE}?user_id=${user.id}` : WEBHOOK_BASE

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: `${label} copiado` })
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      const updated = await pb.collection('users').update(user.id, {
        meta_whatsapp_phone_number_id: phoneId.trim(),
        meta_whatsapp_access_token: accessToken.trim(),
        meta_whatsapp_business_id: businessId.trim(),
        meta_whatsapp_verify_token: verifyToken.trim(),
      })
      pb.authStore.save(pb.authStore.token, updated)
      toast({ title: 'Credenciais salvas com sucesso' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!user) return
    if (!phoneId.trim() || !accessToken.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Phone Number ID e Access Token são obrigatórios para testar.',
      })
      return
    }
    setTesting(true)
    try {
      await pb.send('/backend/v1/meta_whatsapp_test', {
        method: 'POST',
        body: {
          phone_number_id: phoneId.trim(),
          access_token: accessToken.trim(),
          business_id: businessId.trim(),
        },
      })
      setTokenStatus('active')
      toast({ title: 'Conexão validada', description: 'Meta WhatsApp API está funcionando.' })
    } catch (err: any) {
      setTokenStatus('error')
      toast({
        variant: 'destructive',
        title: 'Falha na conexão',
        description: err?.message || 'Erro ao testar conexão',
      })
    } finally {
      setTesting(false)
    }
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">Carregando...</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl">Meta WhatsApp Cloud API</CardTitle>
            </div>
            <StatusTrafficLight status={tokenStatus} />
          </div>
          <CardDescription>
            Configure a API do WhatsApp Cloud para envio e recebimento de mensagens integrado ao
            CRM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-700">URL do Webhook (Callback URL)</AlertTitle>
            <AlertDescription className="text-blue-600">
              <p className="mb-2 text-sm">
                Copie esta URL e configure-a no Meta Developer Portal (WhatsApp &gt; Configuration
                &gt; Webhook):
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white rounded text-xs text-slate-800 break-all font-mono">
                  {webhookUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copy(webhookUrl, 'URL do Webhook')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>
                ID do Número de Telefone <span className="text-destructive">*</span>
              </Label>
              <Input
                value={phoneId}
                onChange={(e) => setPhoneId(e.target.value)}
                placeholder="Ex: 1122334455"
              />
            </div>
            <div className="space-y-2">
              <Label>ID da Conta Business</Label>
              <Input
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 9876543210"
              />
            </div>
            <MaskedInput
              id="wa_access_token"
              label="Token de Acesso"
              value={accessToken}
              onChange={setAccessToken}
              placeholder="EAA..."
              required
            />
            <MaskedInput
              id="wa_verify_token"
              label="Token de Verificação do Webhook"
              value={verifyToken}
              onChange={setVerifyToken}
              placeholder="MeuTokenDeVerificacao"
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Salvar Credenciais
            </Button>
            <Button onClick={handleTest} disabled={testing} variant="outline">
              {testing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MessageCircle className="mr-2 h-4 w-4" />
              )}
              Testar Conexão WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

      <MetaSetupGuide webhookUrl={webhookUrl} verifyToken={verifyToken} />
    </div>
  )
}

export default MetaWhatsAppPanel
