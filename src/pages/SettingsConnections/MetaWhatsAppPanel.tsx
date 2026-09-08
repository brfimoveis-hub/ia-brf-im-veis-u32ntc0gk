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
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { registerWhatsAppNumber, getWhatsAppRegistrationDiagnostic } from '@/services/diagnostics'

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
  const phoneIdError = phoneIdInvalid ? 'O Phone Number ID deve conter apenas números.' : ''

  // Estado para registro de PIN de 6 dígitos
  const [pin, setPin] = useState('')
  const [registering, setRegistering] = useState(false)
  const [registerResult, setRegisterResult] = useState<any>(null)
  const [checkingDiag, setCheckingDiag] = useState(false)
  const [diagInfo, setDiagInfo] = useState<any>(null)

  useRealtime('users', (e) => {
    if (!user?.id || e.record.id !== user.id) return
    setTokenStatus(e.record.meta_token_status || '')
    setDisplayNumber(e.record.meta_whatsapp_status || '')
    if (e.record.meta_whatsapp_phone_number_id) {
      setPhoneId(e.record.meta_whatsapp_phone_number_id)
    }
    if (e.record.meta_whatsapp_business_id) {
      setBusinessId(e.record.meta_whatsapp_business_id)
    }
  })

  const webhookUrlWithQuery = user?.id ? `${WEBHOOK_BASE}?user_id=${user.id}` : WEBHOOK_BASE
  const webhookUrlWithPath = user?.id ? `${WEBHOOK_BASE}/${user.id}` : WEBHOOK_BASE
  const webhookUrl = webhookUrlWithQuery
  const isActive = tokenStatus === 'active' || tokenStatus === 'valid'
  const isPending = tokenStatus === 'pending' || tokenStatus === 'pending_registration'
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
      let res: any
      try {
        res = await pb.send('/backend/v1/meta_whatsapp_test', {
          method: 'POST',
          body: {
            phone_number_id: pnId,
            access_token: tok,
            business_id: businessId.trim(),
          },
        })
      } catch (err: any) {
        res = {
          success: false,
          error:
            err?.message ||
            'Falha de comunicação ao testar a conexão WhatsApp. Verifique as credenciais e tente novamente.',
          tested_at: new Date().toISOString(),
        }
      }
      const testedAt = res?.tested_at || new Date().toISOString()
      setLastTestAt(testedAt)
      if (res?.success === false) {
        const rawErr = res?.raw_error ? ` [${res.raw_error}]` : ''
        const codeInfo = res?.error_code ? ` (código ${res.error_code})` : ''
        const statusInfo = res?.status_code ? ` HTTP ${res.status_code}.` : ''
        const errMsg =
          (res?.error ||
            'Falha ao validar a conexão. Verifique o Phone Number ID e o Access Token.') +
          statusInfo +
          codeInfo +
          rawErr
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
        setDisplayNumber(res?.display_phone_number || 'connected')
        setTestError('')
        toast({ title: 'Conexão validada', description: 'Meta WhatsApp API está funcionando.' })
      }
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

  const handleCheckDiag = async () => {
    setCheckingDiag(true)
    try {
      const res = await getWhatsAppRegistrationDiagnostic()
      setDiagInfo(res)
      if (res.success) {
        toast({
          title: 'Diagnóstico concluído',
          description: `Status do número: ${res.status || 'Desconhecido'} (Verificação: ${res.code_verification_status || 'N/A'})`,
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha no diagnóstico',
          description: res.error || 'Não foi possível consultar a Meta API.',
        })
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err.message || 'Falha ao executar diagnóstico.',
      })
    } finally {
      setCheckingDiag(false)
    }
  }

  const handleRegisterPin = async () => {
    if (!pin || !/^\d{6}$/.test(pin.trim())) {
      toast({
        variant: 'destructive',
        title: 'PIN Inválido',
        description: 'Digite exatamente o PIN de 6 dígitos numéricos criado na Meta.',
      })
      return
    }

    setRegistering(true)
    setRegisterResult(null)
    try {
      const res = await registerWhatsAppNumber(pin.trim())
      setRegisterResult(res)
      if (res.success && res.registered) {
        toast({
          title: 'Registro Concluído!',
          description: 'O número agora está ativo e conectado à Cloud API.',
        })
        setTokenStatus('active')
        if (res.display_phone_number) {
          setDisplayNumber(res.display_phone_number)
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha no Registro',
          description: res.error || 'A Meta rejeitou o PIN ou a requisição de registro.',
        })
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro no Registro',
        description: err.message || 'Falha de comunicação ao tentar registrar o número.',
      })
    } finally {
      setRegistering(false)
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
            CRM. Número alvo: <strong>+55 48 9209-8050</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {(isActive || isPending || isError) && (
            <Alert
              key="whatsapp-status-alert"
              className={
                isActive
                  ? 'border-green-500/50 bg-green-500/10'
                  : isPending
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : 'border-red-500/50 bg-red-500/10'
              }
            >
              {isActive ? (
                <div key="status-active-content" className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <AlertTitle className="text-green-700 mb-0">Conectado ✅</AlertTitle>
                  </div>
                  <AlertDescription className="text-green-700">
                    {formattedNumber ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm">Número verificado conectado:</span>
                        <Badge
                          variant="secondary"
                          className="font-mono text-sm bg-green-100 text-green-900 border-green-300"
                        >
                          {formattedNumber}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="font-mono text-xs text-green-800 border-green-400"
                        >
                          STATUS: CONNECTED (LIVE)
                        </Badge>
                      </div>
                    ) : (
                      <p className="text-sm">
                        Conexão OK — WhatsApp Cloud API ativa e funcionando.
                      </p>
                    )}
                    <div className="mt-2 text-xs text-green-800 space-y-0.5 font-mono">
                      <p>
                        Phone Number ID ativo:{' '}
                        <strong>{phoneId || user?.meta_whatsapp_phone_number_id}</strong>
                      </p>
                      <p>
                        WABA ativa: <strong>{businessId || user?.meta_whatsapp_business_id}</strong>
                      </p>
                    </div>
                    {lastTestAt ? (
                      <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                        <Clock className="h-3 w-3" />
                        <span>
                          Último teste bem-sucedido: {new Date(lastTestAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    ) : null}
                  </AlertDescription>{' '}
                </div>
              ) : isPending ? (
                <div key="status-pending-content" className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <AlertTitle className="text-amber-700 mb-0">
                      Pendente de Registro na Cloud API ⚠️
                    </AlertTitle>
                  </div>
                  <AlertDescription className="text-amber-700 space-y-2">
                    <p className="text-sm">
                      <span>
                        O token de Usuário do Sistema é válido e o app está inscrito na WABA, porém
                        o número{' '}
                      </span>
                      <strong>{formattedNumber || '+55 48 9209-8050'}</strong>
                      <span> está com status </span>
                      <Badge
                        variant="outline"
                        className="font-mono text-xs text-amber-800 border-amber-400"
                      >
                        PENDING
                      </Badge>
                      <span> na Meta.</span>
                    </p>
                    <div className="text-xs text-amber-800 font-mono space-y-0.5">
                      <p>
                        Phone Number ID atual:{' '}
                        <strong>{phoneId || user?.meta_whatsapp_phone_number_id}</strong>
                      </p>
                      <p>
                        WABA atual: <strong>{businessId || user?.meta_whatsapp_business_id}</strong>
                      </p>
                    </div>
                    <p className="text-xs">
                      <span>
                        Para concluir a ativação e receber mensagens na Cloud API, informe o PIN de
                        6 dígitos abaixo e clique em{' '}
                      </span>
                      <strong>"Registrar Número na Meta"</strong>
                      <span>.</span>
                    </p>
                  </AlertDescription>
                </div>
              ) : (
                <div key="status-error-content" className="space-y-1">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <AlertTitle className="text-red-700 mb-0">Falha na Conexão WhatsApp</AlertTitle>
                  </div>
                  <AlertDescription className="text-red-600">
                    <p className="text-sm">
                      {testError ||
                        'A última tentativa de conexão falhou. Verifique as credenciais e tente novamente.'}
                    </p>
                    {lastTestAt ? (
                      <div className="flex items-center gap-1 mt-2 text-xs">
                        <Clock className="h-3 w-3" />
                        <span>Último teste: {new Date(lastTestAt).toLocaleString('pt-BR')}</span>
                      </div>
                    ) : null}
                    {testError ? (
                      <div className="mt-3 rounded-md bg-red-500/10 border border-red-500/30 p-3">
                        <p className="text-xs font-semibold text-red-700 mb-1">
                          Detalhe do erro retornado pela Meta API:
                        </p>
                        <p className="text-xs text-red-600 font-mono break-words">{testError}</p>
                        <div className="mt-2 text-xs text-red-800 font-mono space-y-0.5">
                          <p>
                            Phone Number ID utilizado:{' '}
                            <strong>{phoneId || user?.meta_whatsapp_phone_number_id}</strong>
                          </p>
                          <p>
                            WABA utilizada:{' '}
                            <strong>{businessId || user?.meta_whatsapp_business_id}</strong>
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </AlertDescription>
                </div>
              )}
            </Alert>
          )}

          {/* Seção de Registro com PIN de 6 dígitos (movida para o topo) */}
          <div
            key="pin-registration-card"
            className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">
                Ativação e Registro do Número na Cloud API (PIN de 6 dígitos)
              </h4>
            </div>
            <p className="text-xs text-muted-foreground">
              <span>Caso seu número esteja com status </span>
              <strong>PENDING</strong>
              <span>
                {' '}
                na Meta e não receba mensagens (ex: "o número não está no WhatsApp"), é necessário
                concluir a chamada de registro{' '}
              </span>
              <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">POST /register</code>
              <span>
                {' '}
                com o PIN de 6 dígitos de verificação em duas etapas cadastrado no fluxo da Meta.
              </span>
            </p>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end pt-2">
              <div className="space-y-1.5 w-full sm:w-64">
                <Label htmlFor="pin-input" className="text-xs font-medium">
                  PIN de 6 Dígitos
                </Label>
                <Input
                  id="pin-input"
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="font-mono tracking-widest text-center text-lg"
                />
              </div>
              <Button
                onClick={handleRegisterPin}
                disabled={registering || pin.length !== 6}
                className="w-full sm:w-auto"
              >
                {registering ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Registrar Número na Meta
              </Button>
            </div>

            {registerResult && (
              <div key="register-result-wrapper" className="mt-3">
                <Alert
                  className={
                    registerResult.success
                      ? 'border-green-500/50 bg-green-500/10'
                      : 'border-red-500/50 bg-red-500/10'
                  }
                >
                  {registerResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-red-600" />
                  )}
                  <AlertTitle
                    className={registerResult.success ? 'text-green-700' : 'text-red-700'}
                  >
                    {registerResult.success
                      ? 'Sucesso no Registro!'
                      : registerResult.meta_error?.error_user_title || 'Erro no Registro'}
                  </AlertTitle>
                  <AlertDescription
                    className={`text-xs ${registerResult.success ? 'text-green-700' : 'text-red-600'} space-y-2`}
                  >
                    {/* Exibe IDs utilizados na chamada para diagnóstico rápido */}
                    {(registerResult.phone_number_id || registerResult.waba_id) && (
                      <div className="rounded-md bg-muted/60 p-2 font-mono text-[11px] text-foreground space-y-0.5 border">
                        <p>
                          <strong>Phone Number ID chamado:</strong>{' '}
                          {registerResult.phone_number_id || 'N/A'}
                        </p>
                        <p>
                          <strong>WABA ID:</strong> {registerResult.waba_id || 'N/A'}
                        </p>
                      </div>
                    )}

                    {/* Exibe erro detalhado do usuário retornado pela Meta (ex.: WhatsApp já vinculado a app comum/business) */}
                    {registerResult.meta_error?.error_user_msg && (
                      <div className="rounded-md bg-red-500/15 border border-red-500/30 p-2.5 text-xs text-red-800 font-medium">
                        <p className="font-semibold text-red-900 mb-0.5">
                          {registerResult.meta_error?.error_user_title || 'Aviso da Meta:'}
                        </p>
                        <p>{registerResult.meta_error.error_user_msg}</p>
                      </div>
                    )}

                    <p className="leading-relaxed">
                      {registerResult.message || registerResult.error}
                    </p>

                    {registerResult.hint && <p className="font-semibold">{registerResult.hint}</p>}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {diagInfo && (
              <div
                key="diag-info-wrapper"
                className="mt-3 rounded-md bg-muted/60 p-3 text-xs space-y-1 border"
              >
                <p className="font-semibold text-foreground">Diagnóstico Real do Número:</p>
                <p>
                  <span>Status: </span>
                  <span className="font-mono font-bold">{diagInfo.status || 'N/A'}</span>
                </p>
                <p>
                  <span>Verificação do Código: </span>
                  <span className="font-mono">{diagInfo.code_verification_status || 'N/A'}</span>
                </p>
                <p>
                  <span>Qualidade: </span>
                  <span className="font-mono">{diagInfo.quality_rating || 'N/A'}</span>
                </p>
                <p>
                  <span>Número Exibido: </span>
                  <span className="font-mono">{diagInfo.display_phone_number || 'N/A'}</span>
                </p>
                <p>
                  <span>Phone Number ID: </span>
                  <span className="font-mono">{diagInfo.phone_number_id || 'N/A'}</span>
                </p>
                <p>
                  <span>WABA ID: </span>
                  <span className="font-mono">{diagInfo.waba_id || 'N/A'}</span>
                </p>
                {diagInfo.note && <p className="text-muted-foreground pt-1">{diagInfo.note}</p>}
              </div>
            )}
          </div>

          <Alert className="border-blue-500/50 bg-blue-500/10">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-700">URL do Webhook (Callback URL)</AlertTitle>
            <AlertDescription className="text-blue-600 space-y-3">
              <p className="text-sm">
                Copie a URL abaixo e configure-a no Meta Developer Portal (WhatsApp &gt;
                Configuration &gt; Webhook):
              </p>
              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1">
                  URL Recomendada (padrão com identificador na rota):
                </span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-white rounded text-xs text-slate-800 break-all font-mono select-all">
                    {webhookUrlWithPath}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copy(webhookUrlWithPath, 'URL do Webhook (Path)')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1">
                  URL Alternativa (com query param):
                </span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-white rounded text-xs text-slate-800 break-all font-mono select-all">
                    {webhookUrlWithQuery}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copy(webhookUrlWithQuery, 'URL do Webhook (Query)')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5">
                <Info className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-600">
                  <span className="font-semibold">Resiliência Meta:</span> Ambas as rotas aceitam
                  requisições com ou sem query params. Caso a Meta remova parâmetros da URL na
                  verificação, o sistema identifica automaticamente o usuário pelo{' '}
                  <strong>Token de Verificação ({verifyToken || 'BRF IA CRM'})</strong> cadastrado.
                </p>
              </div>
            </AlertDescription>
          </Alert>
          <Alert className="border-purple-500/50 bg-purple-500/10">
            <KeyRound className="h-4 w-4 text-purple-600" />
            <AlertTitle className="text-purple-700">Token de Verificação (Verify Token)</AlertTitle>
            <AlertDescription className="text-purple-600">
              <p className="mb-2 text-sm">
                Copie este token exato e cole no campo <strong>"Verify Token"</strong> do Meta
                Developer Portal (WhatsApp &gt; Configuration &gt; Webhook). O token deve ser
                idêntico ao cadastrado aqui — qualquer diferença causará o erro{' '}
                <em>"Não foi possível validar a URL de callback ou o token de verificação"</em>.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white rounded text-sm text-slate-800 break-all font-mono select-all">
                  {verifyToken || '(nenhum token definido — digite um abaixo e salve)'}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copy(verifyToken, 'Token de Verificação')}
                  disabled={!verifyToken}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {isError && (
                <div className="mt-3 rounded-md bg-red-500/10 border border-red-500/30 p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">
                    Dica de solução para erro de validação:
                  </p>
                  <ul className="text-xs text-red-600 space-y-1 list-disc list-inside">
                    <li>
                      Certifique-se de que o token acima é <strong>idêntico</strong> ao digitado no
                      Meta Developer Portal (sem espaços extras).
                    </li>
                    <li>
                      A Callback URL deve incluir{' '}
                      <code className="font-mono">?user_id={user?.id}</code>.
                    </li>
                    <li>
                      Após salvar o token aqui, clique novamente em "Verificar e Salvar" no Meta
                      Developer Portal.
                    </li>
                  </ul>
                </div>
              )}
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
                        <li>Acesse o Meta Developer Portal.</li>
                        <li>
                          Vá para seu aplicativo → <strong>WhatsApp → API Setup</strong>.
                        </li>
                        <li>
                          Copie o número exato listado em <strong>'Phone Number ID'</strong>.
                        </li>
                        <li>Cole o número (somente dígitos) no campo acima.</li>
                      </ol>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <Input
                value={phoneId}
                onChange={(e) => {
                  setPhoneId(e.target.value.replace(/\D/g, ''))
                  setPhoneIdTouched(true)
                }}
                onBlur={() => setPhoneIdTouched(true)}
                placeholder="Ex: 1122334455"
                inputMode="numeric"
                aria-invalid={!!phoneIdError}
                className={phoneIdError ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {phoneIdError && (
                <p key="phone-id-error" className="text-xs text-red-500">
                  {phoneIdError}
                </p>
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
            <Button
              onClick={handleCheckDiag}
              disabled={checkingDiag || saving || testing}
              variant="secondary"
            >
              {checkingDiag ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Smartphone className="mr-2 h-4 w-4" />
              )}
              Consultar Status Real na Meta
            </Button>
          </div>

          {(saving || testing || checkingDiag) && (
            <p key="saving-status" className="text-xs text-muted-foreground">
              {saving
                ? 'Salvando credenciais...'
                : testing
                  ? 'Testando conexão com a Meta API...'
                  : 'Consultando status detalhado do número na Meta Graph API...'}
            </p>
          )}
        </CardContent>
      </Card>

      <MetaSetupGuide webhookUrl={webhookUrlWithPath} verifyToken={verifyToken} />
    </div>
  )
}

export default MetaWhatsAppPanel
