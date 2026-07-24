import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { formatDisplayPhone } from '@/lib/meta-format'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { MetaSetupGuide } from './MetaSetupGuide'
import { StatusTrafficLight } from './StatusTrafficLight'
import { MaskedInput } from './MaskedInput'
import {
  Loader2,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Copy,
  Phone,
  Info,
  Clock,
  XCircle,
  HelpCircle,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const WEBHOOK_BASE = `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/meta_whatsapp_webhook`

export function MetaWhatsAppPanel() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [phoneId, setPhoneId] = useState(user?.meta_whatsapp_phone_number_id || '')
  const [accessToken, setAccessToken] = useState(user?.meta_whatsapp_access_token || '')
  const [businessId, setBusinessId] = useState(user?.meta_whatsapp_business_id || '')
  const [verifyToken, setVerifyToken] = useState(user?.meta_whatsapp_verify_token || '')
  const [tokenStatus, setTokenStatus] = useState(user?.meta_token_status || '')
  const [displayNumber, setDisplayNumber] = useState(user?.meta_whatsapp_status || '')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testError, setTestError] = useState('')
  const [lastTestAt, setLastTestAt] = useState('')
  const [phoneIdTouched, setPhoneIdTouched] = useState(false)
  const phoneIdInvalid = !phoneId.trim() || !/^\d+$/.test(phoneId.trim())
  const phoneIdError = phoneIdTouched && phoneIdInvalid ? 'Insira um ID numérico válido' : ''

  useRealtime('users', (e) => {
    if (!user?.id || e.record.id !== user.id) return
    setTokenStatus(e.record.meta_token_status || '')
    setDisplayNumber(e.record.meta_whatsapp_status || '')
  })

  const webhookUrl = user?.id ? `${WEBHOOK_BASE}?user_id=${user.id}` : WEBHOOK_BASE
  const isActive = tokenStatus === 'active'
  const isError = tokenStatus === 'error'
  const formattedNumber = formatDisplayPhone(displayNumber)

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: `${label} copiado` })
  }

  const runTest = async () => {
    if (!user) return
    const pnId = phoneId.trim()
    const tok = accessToken.trim()
    if (!pnId || !tok) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Phone Number ID e Access Token são obrigatórios para testar.',
      })
      return
    }
    if (!/^\d+$/.test(pnId)) {
      setPhoneIdTouched(true)
      toast({
        variant: 'destructive',
        title: 'Phone Number ID inválido',
        description: 'O ID deve conter apenas dígitos numéricos.',
      })
      return
    }
    setTesting(true)
    setTestError('')
    try {
      const res: any = await pb.send('/backend/v1/meta_whatsapp_test', {
        method: 'POST',
        body: {
          phone_number_id: pnId,
          access_token: tok,
          business_id: businessId.trim(),
        },
      })
      const testedAt = res?.tested_at || new Date().toISOString()
      setLastTestAt(testedAt)
      if (res?.success === false) {
        const errMsg =
          res?.error || 'Falha ao validar a conexão. Verifique o Phone Number ID e o Access Token.'
        setTokenStatus('error')
        setDisplayNumber('')
        setTestError(errMsg)
        toast({
          variant: 'destructive',
          title: 'Falha na conexão WhatsApp',
          description: errMsg,
        })
      } else {
        setTokenStatus('active')
        if (res?.display_phone_number) {
          setDisplayNumber(res.display_phone_number)
        }
        setTestError('')
        toast({ title: 'Conexão validada', description: 'Meta WhatsApp API está funcionando.' })
      }
    } catch (err: any) {
      setLastTestAt(new Date().toISOString())
      setTokenStatus('error')
      setDisplayNumber('')
      const errMsg =
        err?.message ||
        'Falha ao testar a conexão WhatsApp. Verifique as credenciais e tente novamente.'
      setTestError(errMsg)
      toast({
        variant: 'destructive',
        title: 'Falha na conexão',
        description: errMsg,
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!user) return
    if (phoneIdInvalid) {
      setPhoneIdTouched(true)
      toast({
        variant: 'destructive',
        title: 'Phone Number ID inválido',
        description: 'Corrija o ID antes de salvar.',
      })
      return
    }
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
      setSaving(false)
      await runTest()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message })
      setSaving(false)
    }
  }

  const handleTest = () => runTest()

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
            CRM. Número alvo: <strong>4448992098050</strong> (exibição +55 48 99209-8050).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {isActive && formattedNumber && (
            <Alert className="border-green-500/50 bg-green-500/10 animate-fade-in">
              <Phone className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-700">Número WhatsApp Ativo</AlertTitle>
              <AlertDescription className="text-green-700">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm">Número verificado conectado:</span>
                  <Badge variant="secondary" className="font-mono text-sm">
                    {formattedNumber}
                  </Badge>
                </div>
                {lastTestAt && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                    <Clock className="h-3 w-3" />
                    Último teste bem-sucedido: {new Date(lastTestAt).toLocaleString('pt-BR')}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {isError && (
            <Alert className="border-red-500/50 bg-red-500/10 animate-fade-in">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-700">Falha na Conexão WhatsApp</AlertTitle>
              <AlertDescription className="text-red-600">
                <p className="text-sm">
                  {testError ||
                    'A última tentativa de conexão falhou. Verifique as credenciais e tente novamente.'}
                </p>
                {lastTestAt && (
                  <div className="flex items-center gap-1 mt-2 text-xs">
                    <Clock className="h-3 w-3" />
                    Último teste: {new Date(lastTestAt).toLocaleString('pt-BR')}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

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
              <div className="flex items-center gap-2 flex-wrap">
                <Label>
                  ID do Número de Telefone <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                      Como encontrar meu Phone Number ID?
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Como encontrar seu Phone Number ID:</p>
                      <ol className="text-xs space-y-1.5 list-decimal list-inside text-muted-foreground">
                        <li>
                          Acesse o{' '}
                          <a
                            href="https://developers.facebook.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Meta Developer Portal
                          </a>
                          .
                        </li>
                        <li>Selecione seu aplicativo.</li>
                        <li>
                          No menu esquerdo, vá em <strong>WhatsApp &gt; API Setup</strong>.
                        </li>
                        <li>
                          Na seção <strong>Phone Number ID</strong>, copie o número exibido (apenas
                          dígitos).
                        </li>
                        <li>Cole este número no campo correspondente na tela de conexões.</li>
                      </ol>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <Input
                value={phoneId}
                onChange={(e) => {
                  setPhoneId(e.target.value)
                  setPhoneIdTouched(true)
                }}
                onBlur={() => setPhoneIdTouched(true)}
                placeholder="Ex: 1122334455"
                aria-invalid={!!phoneIdError}
                className={phoneIdError ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {phoneIdError && (
                <p className="text-xs text-red-500 animate-fade-in">{phoneIdError}</p>
              )}
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                Encontre em: Meta Developer Portal &gt; WhatsApp &gt; API Setup &gt; "Phone Number
                ID". Este ID vincula o número 4448992098050 à sua integração.
              </p>
            </div>
            <div className="space-y-2">
              <Label>ID da Conta Business</Label>
              <Input
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 9876543210"
              />
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                Encontre em: WhatsApp &gt; API Setup &gt; "WhatsApp Business Account ID".
              </p>
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

          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground mb-1">Onde encontrar o Access Token:</p>
              <p>
                No Meta Developer Portal, vá em WhatsApp &gt; API Setup &gt; "Permanent access
                token" (gere um token de sistema no Business Manager se necessário). O token começa
                com "EAA...".
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleSave} disabled={saving || testing || phoneIdInvalid}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Salvar Credenciais
            </Button>
            <Button
              onClick={handleTest}
              disabled={saving || testing || phoneIdInvalid}
              variant="outline"
            >
              {testing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MessageCircle className="mr-2 h-4 w-4" />
              )}
              Testar Conexão WhatsApp
            </Button>
          </div>

          {(saving || testing) && (
            <p className="text-xs text-muted-foreground animate-fade-in">
              {saving ? 'Salvando credenciais...' : 'Testando conexão com a Meta API...'}
            </p>
          )}
        </CardContent>
      </Card>

      <MetaSetupGuide webhookUrl={webhookUrl} verifyToken={verifyToken} />
    </div>
  )
}

export default MetaWhatsAppPanel
