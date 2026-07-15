import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, MessageCircle, CheckCircle2, AlertCircle, Copy } from 'lucide-react'

const WEBHOOK_URL = 'https://ia-uazapi-6d79e.shrd00.internal.goskip.dev/backend/v1/webhook/whatsapp'

export function MetaWhatsAppPanel() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [phoneNumberId, setPhoneNumberId] = useState(user?.meta_whatsapp_phone_number_id || '')
  const [accessToken, setAccessToken] = useState(user?.meta_whatsapp_access_token || '')
  const [businessId, setBusinessId] = useState(user?.meta_whatsapp_business_id || '')
  const [verifyToken, setVerifyToken] = useState(user?.meta_whatsapp_verify_token || '')
  const [status, setStatus] = useState(user?.meta_whatsapp_status || 'disconnected')
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useRealtime('users', (e) => {
    if (!user?.id || e.record.id !== user.id) return
    const newStatus = e.record.meta_whatsapp_status || 'disconnected'
    setStatus((prev) => (prev !== newStatus ? newStatus : prev))
  })

  const validate = useCallback(() => {
    const errs: Record<string, string> = {}
    if (!phoneNumberId.trim())
      errs.meta_whatsapp_phone_number_id = 'ID do Número de Telefone é obrigatório.'
    if (!accessToken.trim()) errs.meta_whatsapp_access_token = 'Token de Acesso é obrigatório.'
    if (!businessId.trim()) errs.meta_whatsapp_business_id = 'ID da Conta Business é obrigatório.'
    if (!verifyToken.trim()) errs.meta_whatsapp_verify_token = 'Token de Verificação é obrigatório.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [phoneNumberId, accessToken, businessId, verifyToken])

  const handleSave = useCallback(async () => {
    if (!user) return
    if (!validate()) {
      toast({
        variant: 'destructive',
        title: 'Erro de Validação',
        description: 'Preencha todos os campos obrigatórios.',
      })
      return
    }
    setIsSaving(true)
    try {
      await pb.collection('users').update(user.id, {
        meta_whatsapp_phone_number_id: phoneNumberId.trim(),
        meta_whatsapp_access_token: accessToken.trim(),
        meta_whatsapp_business_id: businessId.trim(),
        meta_whatsapp_verify_token: verifyToken.trim(),
      })
      toast({
        title: 'Configurações salvas',
        description: 'As credenciais do WhatsApp foram atualizadas.',
      })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message })
    } finally {
      setIsSaving(false)
    }
  }, [user, phoneNumberId, accessToken, businessId, verifyToken, validate, toast])

  const handleTestConnection = useCallback(async () => {
    if (!user) return
    if (!phoneNumberId.trim() || !accessToken.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'ID do Número e Token de Acesso são obrigatórios para testar.',
      })
      return
    }
    setIsTesting(true)
    setTestResult(null)
    try {
      await pb.collection('users').update(user.id, {
        meta_whatsapp_phone_number_id: phoneNumberId.trim(),
        meta_whatsapp_access_token: accessToken.trim(),
        meta_whatsapp_business_id: businessId.trim(),
        meta_whatsapp_verify_token: verifyToken.trim(),
      })
      const res = await pb.send('/backend/v1/meta/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          business_id: businessId.trim(),
          phone_number_id: phoneNumberId.trim(),
          access_token: accessToken.trim(),
        }),
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.success) {
        setStatus('connected')
        setTestResult({ success: true, message: 'Conexão WhatsApp validada com sucesso.' })
        await pb
          .collection('users')
          .update(user.id, { meta_whatsapp_status: 'connected' })
          .catch(() => {})
        toast({
          title: 'Conexão validada',
          description: 'A comunicação com a Meta WhatsApp API está funcionando.',
        })
      } else {
        const msg = res.error?.message || 'Erro ao testar a conexão.'
        setStatus('error')
        setTestResult({ success: false, message: msg })
        await pb
          .collection('users')
          .update(user.id, { meta_whatsapp_status: 'error' })
          .catch(() => {})
        toast({ variant: 'destructive', title: 'Falha na conexão', description: msg })
      }
    } catch (err: any) {
      const msg = err?.response?.message || err?.message || 'Erro ao testar a conexão.'
      setStatus('error')
      setTestResult({ success: false, message: msg })
      await pb
        .collection('users')
        .update(user.id, { meta_whatsapp_status: 'error' })
        .catch(() => {})
      toast({ variant: 'destructive', title: 'Falha na conexão', description: msg })
    } finally {
      setIsTesting(false)
    }
  }, [user, phoneNumberId, accessToken, businessId, verifyToken, toast])

  const copyWebhookUrl = useCallback(() => {
    navigator.clipboard.writeText(WEBHOOK_URL)
    toast({
      title: 'URL copiada',
      description: 'A URL do webhook foi copiada para a área de transferência.',
    })
  }, [toast])

  const isConnected = status.toLowerCase() === 'connected' || status.toLowerCase() === 'active'

  if (!user) {
    return (
      <Card className="shadow-sm border-slate-200">
        <CardContent className="py-10 text-center text-muted-foreground">
          Carregando dados do usuário...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="bg-slate-50/50 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">Meta WhatsApp Cloud API</CardTitle>
          </div>
          <Badge
            variant={isConnected ? 'default' : 'secondary'}
            className={
              isConnected ? 'bg-green-500 hover:bg-green-600 text-sm py-1' : 'text-sm py-1'
            }
          >
            {isConnected ? 'Conectado' : status || 'Desconectado'}
          </Badge>
        </div>
        <CardDescription className="pt-2">
          Configure a API do WhatsApp Cloud para envio e recebimento de mensagens integrado ao CRM.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <Alert className="border-blue-500/50 bg-blue-500/10">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-700">URL do Webhook</AlertTitle>
          <AlertDescription className="text-blue-600">
            <p className="mb-2">
              Copie esta URL e configure-a no Meta Developer Portal (WhatsApp &gt; Configuração do
              Webhook):
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-white rounded text-xs text-slate-800 break-all font-mono">
                {WEBHOOK_URL}
              </code>
              <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        {testResult && (
          <Alert
            key={testResult.success ? 'wa-test-success' : 'wa-test-error'}
            variant={testResult.success ? 'default' : 'destructive'}
            className={testResult.success ? 'border-green-500/50 bg-green-500/10' : ''}
          >
            {testResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>{testResult.success ? 'Teste Bem-sucedido' : 'Falha no Teste'}</AlertTitle>
            <AlertDescription>{testResult.message}</AlertDescription>
            {!testResult.success ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="mt-3"
              >
                {isTesting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="mr-2 h-4 w-4" />
                )}
                Tentar Novamente
              </Button>
            ) : null}
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="meta_wa_phone_id">
              ID do Número de Telefone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="meta_wa_phone_id"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="Ex: 1122334455"
              className={errors.meta_whatsapp_phone_number_id ? 'border-destructive' : ''}
            />
            {errors.meta_whatsapp_phone_number_id && (
              <p className="text-xs text-destructive">{errors.meta_whatsapp_phone_number_id}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="meta_wa_business_id">
              ID da Conta Business <span className="text-destructive">*</span>
            </Label>
            <Input
              id="meta_wa_business_id"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value.replace(/\D/g, ''))}
              placeholder="Ex: 9876543210"
              className={errors.meta_whatsapp_business_id ? 'border-destructive' : ''}
            />
            {errors.meta_whatsapp_business_id && (
              <p className="text-xs text-destructive">{errors.meta_whatsapp_business_id}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="meta_wa_access_token">
              Token de Acesso de Longa Duração <span className="text-destructive">*</span>
            </Label>
            <Input
              id="meta_wa_access_token"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="EAA..."
              className={errors.meta_whatsapp_access_token ? 'border-destructive' : ''}
            />
            {errors.meta_whatsapp_access_token && (
              <p className="text-xs text-destructive">{errors.meta_whatsapp_access_token}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="meta_wa_verify_token">
              Token de Verificação do Webhook <span className="text-destructive">*</span>
            </Label>
            <Input
              id="meta_wa_verify_token"
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              placeholder="MeuTokenDeVerificacao"
              className={errors.meta_whatsapp_verify_token ? 'border-destructive' : ''}
            />
            {errors.meta_whatsapp_verify_token && (
              <p className="text-xs text-destructive">{errors.meta_whatsapp_verify_token}</p>
            )}
          </div>
        </div>

        <div className="pt-6 border-t flex flex-col sm:flex-row gap-3">
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Salvar Credenciais
          </Button>
          <Button
            onClick={handleTestConnection}
            disabled={isTesting}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {isTesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="mr-2 h-4 w-4" />
            )}
            Testar Conexão
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default MetaWhatsAppPanel
