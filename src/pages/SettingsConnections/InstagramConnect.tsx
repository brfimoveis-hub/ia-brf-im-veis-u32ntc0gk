import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Instagram,
  CheckCircle2,
  AlertCircle,
  Info,
  Loader2,
  Save,
  KeyRound,
  RefreshCw,
  HelpCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react'
import { MaskedInput } from './MaskedInput'
import {
  testInstagramConnection,
  getInstagramRedirectUri,
  getInstagramOAuthUrl,
  PROD_REDIRECT_URI,
  PREVIEW_REDIRECT_URI,
} from '@/services/instagram'

export function InstagramConnect() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [form, setForm] = useState({
    meta_instagram_business_id: user?.meta_instagram_business_id || '',
    meta_instagram_page_token: user?.meta_instagram_page_token || '',
    meta_page_access_token: user?.meta_page_access_token || '',
  })
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [inlineError, setInlineError] = useState('')
  const [diagnosticResult, setDiagnosticResult] = useState<{
    message?: string
    missing_perms?: string[]
    instructions?: string
  } | null>(null)

  const hasIgId = !!(form.meta_instagram_business_id || user?.meta_instagram_business_id)
  const hasPageToken = !!(
    form.meta_page_access_token ||
    form.meta_instagram_page_token ||
    user?.meta_page_access_token ||
    user?.meta_instagram_page_token
  )
  const [igConnected, setIgConnected] = useState(hasIgId && hasPageToken)
  const [msgConnected, setMsgConnected] = useState(hasPageToken)

  useRealtime('users', (e) => {
    if (!user?.id || e.record.id !== user.id) return
    const recordIgId = !!e.record.meta_instagram_business_id
    const recordPageToken = !!(
      e.record.meta_page_access_token || e.record.meta_instagram_page_token
    )
    setIgConnected(recordIgId && recordPageToken)
    setMsgConnected(recordPageToken)
    setForm({
      meta_instagram_business_id: e.record.meta_instagram_business_id || '',
      meta_instagram_page_token: e.record.meta_instagram_page_token || '',
      meta_page_access_token: e.record.meta_page_access_token || '',
    })
  })

  const hasAppConfig = !!user?.meta_app_id && !!user?.meta_app_secret
  const [copiedRedirect, setCopiedRedirect] = useState(false)
  const redirectUri = getInstagramRedirectUri()

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedRedirect(true)
      toast({
        title: 'Copiado para a área de transferência',
        description: text,
      })
      setTimeout(() => setCopiedRedirect(false), 2500)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro ao copiar',
        description: 'Selecione e copie o texto manualmente.',
      })
    }
  }

  const set = (key: string, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }))
    setFieldErrors((prev) => ({ ...prev, [key]: '' }))
    setInlineError('')
  }

  const validate = (): { valid: boolean; errors: FieldErrors } => {
    const errors: FieldErrors = {}
    const bizId = form.meta_instagram_business_id.trim()
    const pageToken = form.meta_page_access_token.trim()

    if (!bizId) {
      errors.meta_instagram_business_id = 'Instagram Business ID é obrigatório.'
    } else if (!/^\d+$/.test(bizId)) {
      errors.meta_instagram_business_id =
        'Instagram Business ID deve conter apenas números (ex: 17841400000000000).'
    }

    if (!pageToken) {
      errors.meta_page_access_token = 'Instagram Page Access Token é obrigatório.'
    } else if (pageToken.length < 10) {
      errors.meta_page_access_token = 'Token de acesso parece curto demais. Verifique o valor.'
    }

    return { valid: Object.keys(errors).length === 0, errors }
  }

  const handleSave = async () => {
    if (!user) return
    const { valid, errors } = validate()
    if (!valid) {
      setFieldErrors(errors)
      const firstErr = Object.values(errors).find(Boolean) || 'Corrija os campos destacados.'
      setInlineError(firstErr)
      toast({
        variant: 'destructive',
        title: 'Campos inválidos',
        description: firstErr,
      })
      return
    }

    setSaving(true)
    setInlineError('')
    setFieldErrors({})
    try {
      const updated = await pb.collection('users').update(user.id, {
        meta_instagram_business_id: form.meta_instagram_business_id.trim(),
        meta_instagram_page_token: form.meta_instagram_page_token.trim(),
        meta_page_access_token: form.meta_page_access_token.trim(),
      })
      try {
        pb.authStore.save(pb.authStore.token || '', updated)
      } catch {
        // realtime will sync
      }
      toast({
        title: 'Credenciais Instagram salvas',
        description: 'Os valores foram persistidos no seu perfil.',
      })
    } catch (err: any) {
      const errors = extractFieldErrors(err)
      setFieldErrors(errors)
      const msg =
        err?.message ||
        Object.values(errors).find(Boolean) ||
        'Erro ao salvar credenciais Instagram.'
      setInlineError(msg)
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: msg })
    } finally {
      setSaving(false)
    }
  }

  const handleVerifyNow = async () => {
    setVerifying(true)
    setInlineError('')
    setDiagnosticResult(null)
    try {
      const res = await testInstagramConnection()
      if (res?.status === 'connected') {
        setIgConnected(true)
        setMsgConnected(true)
        toast({
          title: 'Instagram Conectado!',
          description: res.message || 'Conexão validada com sucesso.',
        })
      } else {
        const msg = res?.message || 'Aguardando Page Token para ativar a conexão.'
        setInlineError(msg)
        setDiagnosticResult({
          message: msg,
          missing_perms: res?.missing_perms || [],
          instructions: res?.instructions || '',
        })
        toast({
          variant: 'destructive',
          title: 'Atenção na Conexão do Instagram',
          description: msg,
        })
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Falha ao verificar conexão com o Instagram.'
      setInlineError(errMsg)
      toast({
        variant: 'destructive',
        title: 'Erro na verificação',
        description: errMsg,
      })
    } finally {
      setVerifying(false)
    }
  }

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

    const oauthUrl = getInstagramOAuthUrl(user!.meta_app_id, redirectUri)

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
          CRM. Você pode usar o OAuth (botão abaixo) ou preencher manualmente os campos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        {!hasAppConfig && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-700">Configuração necessária (OAuth)</AlertTitle>
            <AlertDescription className="text-yellow-600">
              Para usar o fluxo OAuth, preencha o <strong>Meta App ID</strong> e{' '}
              <strong>App Secret</strong> na aba &quot;Meta API Configuration&quot; acima. Caso
              contrário, preencha manualmente os campos abaixo.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          <Button onClick={handleConnect} className="gap-2" variant="default">
            <Instagram className="h-4 w-4" />
            Conectar Instagram (OAuth)
          </Button>

          <Button
            onClick={handleVerifyNow}
            disabled={verifying}
            className="gap-2"
            variant="outline"
          >
            {verifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Verificar Agora
          </Button>

          <div className="flex items-center gap-3 flex-wrap">
            <Badge
              className={
                igConnected
                  ? 'bg-green-500/10 text-green-600 border-green-500/20'
                  : hasIgId
                    ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                    : ''
              }
              variant={igConnected || hasIgId ? 'default' : 'secondary'}
            >
              {igConnected ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Instagram Conectado
                </>
              ) : hasIgId ? (
                <>
                  <Info className="h-3 w-3 mr-1" /> ID Configurado (Aguardando Page Token)
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

        {/* Card de Ajuda: Configuração de Domínios e Redirect URI no App Meta */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
              <h4 className="text-sm font-semibold text-foreground">
                Configuração obrigatória no Meta Developers (OAuth Instagram)
              </h4>
            </div>
            <a
              href="https://developers.facebook.com/apps/2442476629610638/settings/basic/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium shrink-0"
            >
              Abrir App Meta
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Se ao clicar em &quot;Conectar Instagram (OAuth)&quot; você receber a mensagem de que{' '}
            <em>&quot;O domínio dessa URL não está incluído nos domínios do app&quot;</em>, siga
            este passo a passo rápido no portal de desenvolvedores da Meta:
          </p>

          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-semibold text-foreground">
              URI de Redirecionamento OAuth do seu CRM:
            </Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={redirectUri}
                className="font-mono text-xs bg-background select-all"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => copyToClipboard(redirectUri)}
              >
                {copiedRedirect ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </Button>
            </div>
            {redirectUri !== PROD_REDIRECT_URI && (
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span>URI de produção alternativa:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(PROD_REDIRECT_URI)}
                  className="font-mono text-primary hover:underline inline-flex items-center gap-1"
                >
                  {PROD_REDIRECT_URI}
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          <div className="rounded-md bg-background/80 border p-3 space-y-2 text-xs">
            <p className="font-medium text-foreground">Passo a passo no Meta Developers:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground leading-relaxed">
              <li>
                Acesse as{' '}
                <a
                  href="https://developers.facebook.com/apps/2442476629610638/settings/basic/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline font-medium"
                >
                  Configurações Básicas do App 2442476629610638 (BRF Imóveis 2)
                </a>{' '}
                → no campo <strong>&quot;Domínios do app&quot;</strong>, adicione{' '}
                <code className="px-1 py-0.5 rounded bg-muted text-foreground font-mono font-semibold">
                  brfiacrminteligente.goskip.app
                </code>{' '}
                (e caso use o ambiente preview, adicione também{' '}
                <code className="px-1 py-0.5 rounded bg-muted text-foreground font-mono font-semibold">
                  ia-uazapi-6d79e--preview.goskip.app
                </code>
                ) → clique em <strong>Salvar alterações</strong> no rodapé.
              </li>
              <li>
                No menu lateral esquerdo, vá em <strong>Produtos</strong> →{' '}
                <strong>Logins do Facebook</strong> (ou <strong>Facebook Login</strong>) →{' '}
                <strong>Configurações</strong> (ou <strong>Settings</strong>) → localize o campo{' '}
                <strong>&quot;URIs de redirecionamento OAuth válidos&quot;</strong> (Valid OAuth
                Redirect URIs). Cole a URI exata acima:
                <div className="mt-1 flex items-center gap-2">
                  <code className="px-2 py-1 rounded bg-muted text-foreground font-mono text-xs select-all">
                    {redirectUri}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => copyToClipboard(redirectUri)}
                  >
                    <Copy className="h-3 w-3 mr-1" /> Copiar
                  </Button>
                </div>
                {redirectUri !== PROD_REDIRECT_URI && (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Dica: adicione também a URI de produção (<code>{PROD_REDIRECT_URI}</code>) para
                    ambos os ambientes funcionarem.
                  </div>
                )}
                Em seguida clique em <strong>Salvar alterações</strong>.
              </li>
              <li>
                Volte a esta página do CRM e clique novamente em{' '}
                <strong>&quot;Conectar Instagram (OAuth)&quot;</strong> para concluir a autorização.
              </li>
            </ol>
          </div>
        </div>

        <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-4 space-y-4">
          <div className="flex items-start gap-2">
            <KeyRound className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Configuração Manual de Credenciais
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Preencha os campos abaixo e clique em &quot;Salvar Credenciais&quot;. Os valores são
                persistidos no seu perfil e o status acima será atualizado automaticamente. Esta
                opção não afeta nenhuma outra integração (WhatsApp, CAPI, Pixel, Messenger).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ig_business_id">
                Instagram Business ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ig_business_id"
                value={form.meta_instagram_business_id}
                onChange={(e) =>
                  set('meta_instagram_business_id', e.target.value.replace(/\D/g, ''))
                }
                placeholder="17841400000000000"
                inputMode="numeric"
                aria-invalid={!!fieldErrors.meta_instagram_business_id}
                className={
                  fieldErrors.meta_instagram_business_id
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : ''
                }
              />
              {fieldErrors.meta_instagram_business_id ? (
                <p className="text-xs text-red-500">{fieldErrors.meta_instagram_business_id}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Encontrado no Meta Business Suite &gt; Instagram &gt; Configurações &gt; ID da
                  conta.
                </p>
              )}
            </div>

            <MaskedInput
              id="ig_page_access_token"
              label="Instagram Page Access Token"
              value={form.meta_page_access_token}
              onChange={(v) => set('meta_page_access_token', v)}
              placeholder="EAAG..."
              required
            />

            <MaskedInput
              id="ig_page_token"
              label="Instagram Page Token"
              value={form.meta_instagram_page_token}
              onChange={(v) => set('meta_instagram_page_token', v)}
              placeholder="EAAG... (opcional)"
            />
          </div>

          {Object.values(fieldErrors).some(Boolean) && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/50 bg-red-500/10 p-3">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div className="text-sm text-red-600 space-y-1">
                {Object.entries(fieldErrors).map(
                  ([field, msg]) =>
                    msg && (
                      <p key={field}>
                        <span className="font-medium">{field}:</span> {msg}
                      </p>
                    ),
                )}
              </div>
            </div>
          )}

          {diagnosticResult?.missing_perms && diagnosticResult.missing_perms.length > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <HelpCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Permissões ausentes na Meta: {diagnosticResult.missing_perms.join(', ')}
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Como resolver no Meta Business Suite:
                  </p>
                  <ol className="text-xs text-amber-700 list-decimal list-inside space-y-1 mt-1">
                    <li>
                      Acesse o <strong>Meta Business Suite</strong> &gt;{' '}
                      <strong>Configurações do negócio</strong>.
                    </li>
                    <li>
                      Vá em <strong>Usuários do Sistema</strong> &gt; selecione o usuário{' '}
                      <strong>BIA CRM</strong>.
                    </li>
                    <li>
                      Em <strong>Ativos atribuídos</strong>, clique em{' '}
                      <strong>Adicionar Ativos</strong> &gt; <strong>Páginas</strong> &gt; selecione
                      sua Página do Facebook conectada ao Instagram e marque{' '}
                      <strong>Controle Total / Gerenciamento</strong>.
                    </li>
                    <li>
                      Clique no botão <strong>Conectar Instagram (OAuth)</strong> acima para
                      autorizar com 1 clique.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {inlineError &&
            !Object.values(fieldErrors).some(Boolean) &&
            !diagnosticResult?.missing_perms?.length && (
              <div className="flex items-start gap-2 rounded-md border border-red-500/50 bg-red-500/10 p-3">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600">{inlineError}</p>
              </div>
            )}

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Credenciais
            </Button>
            <span className="text-xs text-muted-foreground">
              Valores inválidos não limpam credenciais já salvas.
            </span>
          </div>
        </div>

        <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground mb-1">Como funciona:</p>
            <p>
              O botão &quot;Conectar Instagram (OAuth)&quot; abre o login do Facebook em uma nova
              aba. Após autorizar, o Instagram Business ID e os tokens serão configurados
              automaticamente, sobrescrevendo quaisquer valores manuais. Alternativamente, preencha
              os campos manuais acima. O status dos cards é atualizado em tempo real e o fluxo de
              verificação de saúde (&quot;Verificar Todas&quot;) reconhece os valores informados.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default InstagramConnect
