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
  User,
  Layers,
  Link2,
} from 'lucide-react'
import { MaskedInput } from './MaskedInput'
import {
  testInstagramConnection,
  getInstagramRedirectUri,
  getInstagramOAuthUrl,
  INSTAGRAM_OAUTH_SCOPES_LIST,
  PROD_REDIRECT_URI,
  PREVIEW_REDIRECT_URI,
  type InstagramGraphError,
  type InstagramTestedToken,
  type InstagramTokenIdentity,
  type InstagramAccessiblePage,
  type InstagramPageLinkedAccount,
  type InstagramPortfolioPage,
} from '@/services/instagram'
import { InstagramPortfolioScan } from './InstagramPortfolioScan'

export function InstagramConnect() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [form, setForm] = useState({
    meta_instagram_business_id: user?.meta_instagram_business_id || '',
    meta_instagram_page_token: user?.meta_instagram_page_token || '',
    meta_page_access_token: user?.meta_page_access_token || '',
    meta_instagram_app_id: user?.meta_instagram_app_id || '',
    meta_instagram_app_secret: user?.meta_instagram_app_secret || '',
  })
  const [saving, setSaving] = useState(false)
  const [savingAppConfig, setSavingAppConfig] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [appFieldErrors, setAppFieldErrors] = useState<FieldErrors>({})
  const [inlineError, setInlineError] = useState('')
  const [diagnosticResult, setDiagnosticResult] = useState<{
    message: string
    missing_perms: string[]
    instructions?: string
    auto_corrected?: boolean
    old_instagram_business_id?: string
    instagram_business_id?: string
    graph_error?: InstagramGraphError
    token_identity?: InstagramTokenIdentity | null
    page_linked_instagram?: InstagramPageLinkedAccount | null
    accessible_pages?: InstagramAccessiblePage[]
    portfolio_scan?: InstagramPortfolioPage[]
    portfolio_scan_error?: string | null
    tested_tokens?: InstagramTestedToken[]
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
      meta_instagram_app_id: e.record.meta_instagram_app_id || '',
      meta_instagram_app_secret: e.record.meta_instagram_app_secret || '',
    })
  })

  // App ID e Secret prioritários para Instagram
  const dedicatedAppId = (form.meta_instagram_app_id || user?.meta_instagram_app_id || '').trim()
  const dedicatedAppSecret = (
    form.meta_instagram_app_secret ||
    user?.meta_instagram_app_secret ||
    ''
  ).trim()
  const fallbackAppId = (user?.meta_app_id || '').trim()
  const fallbackAppSecret = (user?.meta_app_secret || '').trim()

  const activeAppId = dedicatedAppId || fallbackAppId
  const activeAppSecret = dedicatedAppSecret || fallbackAppSecret
  const isDedicatedInUse = !!dedicatedAppId
  const hasAppConfig = !!activeAppId && !!activeAppSecret

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
    setAppFieldErrors((prev) => ({ ...prev, [key]: '' }))
    setInlineError('')
  }

  const handleSaveAppConfig = async () => {
    if (!user) return
    const errors: FieldErrors = {}
    const igAppId = form.meta_instagram_app_id.trim()
    const igAppSecret = form.meta_instagram_app_secret.trim()

    if (igAppId && !/^\d+$/.test(igAppId)) {
      errors.meta_instagram_app_id = 'O App ID deve conter apenas números.'
    }

    if (Object.keys(errors).length > 0) {
      setAppFieldErrors(errors)
      toast({
        variant: 'destructive',
        title: 'App ID inválido',
        description: errors.meta_instagram_app_id,
      })
      return
    }

    setSavingAppConfig(true)
    setAppFieldErrors({})
    try {
      const updated = await pb.collection('users').update(user.id, {
        meta_instagram_app_id: igAppId,
        meta_instagram_app_secret: igAppSecret,
      })
      try {
        pb.authStore.save(pb.authStore.token || '', updated)
      } catch {
        // realtime will sync
      }
      toast({
        title: 'App Meta do Instagram salvo',
        description: igAppId
          ? `App Meta dedicado (${igAppId}) configurado com sucesso para o Instagram.`
          : 'Configuração atualizada com sucesso.',
      })
    } catch (err: any) {
      const extracted = extractFieldErrors(err)
      setAppFieldErrors(extracted)
      const msg =
        err?.message ||
        Object.values(extracted).find(Boolean) ||
        'Erro ao salvar configuração do App Meta do Instagram.'
      toast({ variant: 'destructive', title: 'Erro ao salvar App Meta', description: msg })
    } finally {
      setSavingAppConfig(false)
    }
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
      setDiagnosticResult({
        message: res?.message || '',
        missing_perms: res?.missing_perms || [],
        instructions: res?.instructions || '',
        auto_corrected: res?.auto_corrected,
        old_instagram_business_id: res?.old_instagram_business_id,
        instagram_business_id: res?.instagram_business_id,
        graph_error: res?.graph_error,
        token_identity: res?.token_identity,
        page_linked_instagram: res?.page_linked_instagram,
        accessible_pages: res?.accessible_pages,
        portfolio_scan: res?.portfolio_scan,
        portfolio_scan_error: res?.portfolio_scan_error,
        tested_tokens: res?.tested_tokens,
      })

      if (res?.auto_corrected && res?.instagram_business_id) {
        setForm((prev) => ({
          ...prev,
          meta_instagram_business_id: res.instagram_business_id || prev.meta_instagram_business_id,
        }))
      }

      if (res?.status === 'connected') {
        setIgConnected(true)
        setMsgConnected(true)
        toast({
          title: res?.auto_corrected
            ? 'Instagram Atualizado e Conectado! 🎉'
            : 'Instagram Conectado!',
          description: res.message || 'Conexão validada com sucesso.',
        })
      } else if (res?.status === 'page_has_no_instagram') {
        const msg = res?.message || 'A Página não possui conta do Instagram vinculada.'
        setInlineError(msg)
        toast({
          variant: 'destructive',
          title: 'Vínculo do Instagram Necessário',
          description:
            'A Página do Facebook está ativa, mas nenhuma conta do Instagram está vinculada a ela.',
        })
      } else {
        const msg = res?.message || 'Aguardando Page Token para ativar a conexão.'
        setInlineError(msg)
        toast({
          variant: 'destructive',
          title: res?.graph_error ? 'Erro de Token Instagram' : 'Atenção na Conexão do Instagram',
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
          'Preencha o App ID e Segredo do App Meta dedicado ao Instagram abaixo (ou na aba CAPI).',
      })
      return
    }

    const oauthUrl = getInstagramOAuthUrl(activeAppId, redirectUri)

    window.open(oauthUrl, '_blank')
    toast({
      title: 'Abrindo login do Facebook',
      description: `Iniciando autorização via App Meta ${activeAppId} (${isDedicatedInUse ? 'Dedicado' : 'Principal'}).`,
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
          CRM. Você pode usar o OAuth com App Meta dedicado ou preencher manualmente os campos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        {/* Indicador do App Meta em uso pelo Instagram */}
        <div className="rounded-lg border bg-muted/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              App Meta ativo para o Instagram:
            </span>
            <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
              {activeAppId ? (
                <>
                  <code className="font-mono font-semibold text-foreground bg-background px-1.5 py-0.5 rounded border">
                    {activeAppId}
                  </code>
                  <Badge
                    variant={isDedicatedInUse ? 'default' : 'secondary'}
                    className={
                      isDedicatedInUse
                        ? 'bg-purple-500/15 text-purple-700 border-purple-500/30 font-medium'
                        : 'bg-blue-500/15 text-blue-700 border-blue-500/30 font-medium'
                    }
                  >
                    {isDedicatedInUse ? 'App Dedicado ao Instagram' : 'App Principal (Fallback)'}
                  </Badge>
                </>
              ) : (
                <span className="text-amber-600 font-medium">
                  Nenhum App Meta configurado ainda
                </span>
              )}
            </div>
          </div>
          {activeAppId && (
            <a
              href={`https://developers.facebook.com/apps/${encodeURIComponent(activeAppId)}/dashboard/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium shrink-0"
            >
              Abrir App na Meta ({activeAppId})
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {!hasAppConfig && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-700">Configuração necessária (OAuth)</AlertTitle>
            <AlertDescription className="text-yellow-600">
              Para usar o fluxo OAuth, configure o <strong>App Meta dedicado ao Instagram</strong>{' '}
              no bloco abaixo. A Meta não permite mensagens do Instagram em apps do tipo
              Marketing/Anúncios.
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

        {/* Bloco: App Meta dedicado ao Instagram (Recomendado pela Meta) */}
        <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 sm:p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <KeyRound className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
                  App Meta dedicado ao Instagram (recomendado)
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-purple-500/10 text-purple-700 border-purple-500/30 font-normal"
                  >
                    Isolação total de Anúncios / CAPI
                  </Badge>
                </h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  A Meta não permite casos de uso de mensagens do Instagram em apps de Anúncios.
                  Crie um app novo em{' '}
                  <strong>
                    developers.facebook.com → Criar app → caso de uso &apos;Gerenciar mensagens e
                    conteúdo no Instagram&apos;
                  </strong>
                  , copie o App ID e o Segredo aqui.
                </p>
              </div>
            </div>
            <a
              href="https://developers.facebook.com/apps/create/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-purple-700 hover:underline font-medium shrink-0"
            >
              Criar App Novo
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="meta_instagram_app_id" className="text-xs font-semibold">
                App ID do Instagram
              </Label>
              <Input
                id="meta_instagram_app_id"
                value={form.meta_instagram_app_id}
                onChange={(e) => set('meta_instagram_app_id', e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 987654321098765"
                inputMode="numeric"
                className={`font-mono text-xs ${
                  appFieldErrors.meta_instagram_app_id ? 'border-red-500' : ''
                }`}
              />
              {appFieldErrors.meta_instagram_app_id ? (
                <p className="text-[11px] text-red-500">{appFieldErrors.meta_instagram_app_id}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  ID do app Meta dedicado ao Instagram.
                </p>
              )}
            </div>

            <MaskedInput
              id="meta_instagram_app_secret"
              label="Segredo do App do Instagram"
              value={form.meta_instagram_app_secret}
              onChange={(v) => set('meta_instagram_app_secret', v)}
              placeholder="Ex: a1b2c3d4..."
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
            <Button
              type="button"
              onClick={handleSaveAppConfig}
              disabled={savingAppConfig}
              size="sm"
              className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {savingAppConfig ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Salvar App Meta do Instagram
            </Button>
            <span className="text-[11px] text-muted-foreground">
              Se deixado em branco, o CRM usará automaticamente o App ID principal (
              {fallbackAppId || 'não configurado'}).
            </span>
          </div>
        </div>

        {/* Card de Ajuda: Configuração de Domínios e Redirect URI no App Meta */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
              <h4 className="text-sm font-semibold text-foreground">
                Configuração no Meta Developers (
                {activeAppId ? `App ${activeAppId}` : 'App do Instagram'})
              </h4>
            </div>
            {activeAppId && (
              <a
                href={`https://developers.facebook.com/apps/${encodeURIComponent(activeAppId)}/settings/basic/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium shrink-0"
              >
                Abrir Configurações do App
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            No aplicativo Meta que você usar para o Instagram (seja o novo dedicado ou o existente),
            certifique-se de registrar a URL de redirecionamento do CRM para evitar o erro{' '}
            <em>&quot;O domínio dessa URL não está incluído nos domínios do app&quot;</em>:
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
                Acesse o app no{' '}
                <a
                  href={
                    activeAppId
                      ? `https://developers.facebook.com/apps/${encodeURIComponent(activeAppId)}/settings/basic/`
                      : 'https://developers.facebook.com/apps/'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline font-medium"
                >
                  developers.facebook.com {activeAppId ? `(App ${activeAppId})` : ''}
                </a>{' '}
                → em <strong>Configurações Básicas</strong> → no campo{' '}
                <strong>&quot;Domínios do app&quot;</strong>, adicione{' '}
                <code className="px-1 py-0.5 rounded bg-muted text-foreground font-mono font-semibold">
                  brfiacrminteligente.goskip.app
                </code>{' '}
                (e se usar o ambiente de testes/preview, adicione também{' '}
                <code className="px-1 py-0.5 rounded bg-muted text-foreground font-mono font-semibold">
                  ia-uazapi-6d79e--preview.goskip.app
                </code>
                ) → clique em <strong>Salvar alterações</strong> no rodapé.
              </li>
              <li>
                No menu lateral esquerdo, vá em <strong>Casos de uso</strong> (ou{' '}
                <strong>Produtos</strong> → <strong>Logins do Facebook</strong>) →{' '}
                <strong>Configurações</strong> → localize o campo{' '}
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
                Em seguida clique em <strong>Salvar alterações</strong>.
              </li>
              <li>
                Volte a esta página do CRM e clique em{' '}
                <strong>&quot;Conectar Instagram (OAuth)&quot;</strong> para concluir a autorização.
              </li>
            </ol>

            <div className="pt-2 border-t mt-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="font-medium text-foreground">
                  Escopos solicitados no OAuth (App Meta Dedicado - Bloco de Mensagens):
                </p>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-green-500/10 text-green-700 border-green-500/30"
                >
                  Compatível com Meta Developers 2025/2026
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {INSTAGRAM_OAUTH_SCOPES_LIST.map((sc) => (
                  <code
                    key={sc}
                    className="px-2 py-0.5 rounded bg-muted text-[11px] font-mono text-primary font-semibold border"
                  >
                    {sc}
                  </code>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Configurado exatamente para o caso de uso{' '}
                <em>&quot;Gerenciar mensagens e conteúdo no Instagram&quot;</em> do seu App Meta
                dedicado (sem requisições excedentes para evitar erro de <em>Invalid Scopes</em>).
              </p>
            </div>
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

          {/* RESUMO ESTRUTURADO DO DIAGNÓSTICO DO TOKEN (QUEM O TOKEN É E QUAIS PÁGINAS ALCANÇA) */}
          {diagnosticResult &&
            (diagnosticResult.token_identity ||
              diagnosticResult.accessible_pages !== undefined) && (
              <div className="rounded-md border border-blue-500/40 bg-blue-500/5 p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-2 border-b border-blue-500/20 pb-2">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <Layers className="h-4 w-4 text-blue-600" />
                    <span>Análise de Conexão do Token Salvo (Diagnóstico Profundo)</span>
                  </div>
                  {diagnosticResult.tested_tokens && diagnosticResult.tested_tokens.length > 0 && (
                    <Badge variant="outline" className="font-mono text-[11px]">
                      Token {diagnosticResult.tested_tokens[0].token_suffix || '***'}
                    </Badge>
                  )}
                </div>

                {/* Identidade do token */}
                {diagnosticResult.token_identity ? (
                  <div className="flex items-start gap-2 bg-background/80 p-2.5 rounded border">
                    <User className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-foreground font-medium">
                        O token conectado identifica-se como:
                      </p>
                      {diagnosticResult.token_identity.error ? (
                        <p className="text-destructive font-mono text-[11px]">
                          Não foi possível inspecionar /me (
                          {diagnosticResult.token_identity.error.message})
                        </p>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {diagnosticResult.token_identity.name || 'Sem nome'}
                          </span>
                          <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">
                            ID: {diagnosticResult.token_identity.id}
                          </code>
                          <Badge variant="secondary" className="text-[10px]">
                            Tipo: {diagnosticResult.token_identity.type || 'page'}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-blue-500/10 text-blue-700 border-blue-500/30"
                          >
                            Page Token Confirmado
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Passo 0.5: Instagram vinculado diretamente à Página */}
                {diagnosticResult.page_linked_instagram !== undefined &&
                  diagnosticResult.page_linked_instagram !== null && (
                    <div
                      className={`p-3 rounded border text-xs space-y-1.5 ${
                        diagnosticResult.page_linked_instagram.linked
                          ? 'bg-purple-500/10 border-purple-500/30 text-purple-900'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Instagram className="h-4 w-4 text-purple-600 shrink-0" />
                          <span>
                            Passo 0.5 — Instagram vinculado à Página &quot;
                            {diagnosticResult.page_linked_instagram.page_name || 'BRF Imóveis'}
                            &quot;:
                          </span>
                        </div>
                        {diagnosticResult.page_linked_instagram.linked ? (
                          <Badge className="bg-purple-600 text-white font-medium text-[11px]">
                            @{diagnosticResult.page_linked_instagram.username || 'vinculado'}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="font-medium text-[11px]">
                            Nenhum Instagram Vinculado
                          </Badge>
                        )}
                      </div>

                      {diagnosticResult.page_linked_instagram.linked ? (
                        <div className="space-y-1 text-muted-foreground">
                          <p className="text-foreground">
                            Instagram Business Account:{' '}
                            <strong>
                              @{diagnosticResult.page_linked_instagram.username || 'desconhecido'}
                            </strong>{' '}
                            <code className="font-mono text-[11px] bg-background px-1 py-0.5 rounded border text-foreground">
                              ID: {diagnosticResult.page_linked_instagram.id}
                            </code>
                          </p>
                          {diagnosticResult.auto_corrected && (
                            <div className="p-2 rounded bg-green-500/15 border border-green-500/30 text-green-800 text-[11px] flex items-center gap-1.5 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-700 shrink-0" />
                              <span>
                                ID de Instagram corrigido automaticamente no CRM:{' '}
                                {diagnosticResult.old_instagram_business_id} →{' '}
                                {diagnosticResult.instagram_business_id}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1 text-amber-800 text-[11px] leading-relaxed">
                          <p className="font-semibold text-amber-900 flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-700 shrink-0" />A Página
                            &quot;
                            {diagnosticResult.page_linked_instagram.page_name || 'BRF Imóveis'}
                            &quot; NÃO tem nenhuma conta do Instagram vinculada na Meta.
                          </p>
                          <p>
                            <strong>Como vincular no seu celular:</strong> No aplicativo do
                            Instagram (logado na conta <strong>@mauro.brfimoveis</strong>) → Acesse
                            o Perfil → Configurações e privacidade →{' '}
                            <strong>Empresa / Ferramentas profissionais</strong> →{' '}
                            <strong>Conectar uma Página do Facebook</strong> → Selecione a Página{' '}
                            <strong>
                              {diagnosticResult.page_linked_instagram.page_name || 'BRF Imóveis'}
                            </strong>
                            .
                          </p>
                          <p className="text-muted-foreground italic">
                            Após confirmar o vínculo no Instagram, aguarde ~5 minutos para
                            propagação na Graph API da Meta e clique no botão{' '}
                            <strong>Verificar Agora</strong>.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                {/* Páginas do Facebook acessíveis */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5 text-blue-600" />
                      Páginas do Facebook acessíveis:{' '}
                      {diagnosticResult.accessible_pages?.length ?? 0}
                    </span>
                  </div>

                  {diagnosticResult.accessible_pages &&
                  diagnosticResult.accessible_pages.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {diagnosticResult.accessible_pages.map((pg) => (
                        <div
                          key={pg.page_id}
                          className={`p-2 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 ${
                            pg.matches_target_id
                              ? 'bg-green-500/10 border-green-500/30'
                              : 'bg-background'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground">
                              Página &quot;{pg.page_name}&quot;
                            </span>
                            <code className="font-mono text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">
                              ID: {pg.page_id}
                            </code>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap text-[11px]">
                            {pg.has_instagram && pg.ig_account_id ? (
                              <Badge
                                variant={pg.matches_target_id ? 'default' : 'secondary'}
                                className={
                                  pg.matches_target_id
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-purple-500/15 text-purple-700 border-purple-500/30'
                                }
                              >
                                IG vinculada: @{pg.ig_username || 'desconhecido'} (ID:{' '}
                                {pg.ig_account_id})
                              </Badge>
                            ) : (
                              <span className="text-amber-600 font-medium">
                                IG vinculada: NENHUMA
                              </span>
                            )}
                            {pg.matches_target_id && (
                              <Badge
                                variant="outline"
                                className="text-green-700 border-green-600/30 text-[10px]"
                              >
                                Conta do CRM
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-800 space-y-1">
                      <p className="font-semibold flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />O token NÃO
                        enxerga nenhuma Página do Facebook — provável causa do erro 100/33.
                      </p>
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        Para que a API da Meta permita ler a conta do Instagram Business, o usuário
                        que autorizou o token precisa ser Administrador ou Editor da Página do
                        Facebook no Meta Business Suite, ou a Página precisa ter sido selecionada
                        durante o fluxo OAuth.
                      </p>
                    </div>
                  )}
                </div>

                {/* Seção da Varredura do Portfólio dentro do Diagnóstico Profundo */}
                {(diagnosticResult.portfolio_scan !== undefined ||
                  diagnosticResult.portfolio_scan_error !== undefined) && (
                  <InstagramPortfolioScan
                    scan={diagnosticResult.portfolio_scan || []}
                    error={diagnosticResult.portfolio_scan_error}
                    targetUsername={user?.instagram_username || 'mauro.brfimoveis'}
                  />
                )}
              </div>
            )}

          {diagnosticResult?.graph_error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-destructive">Diagnóstico Meta Graph API:</p>
                  <p className="text-foreground">{diagnosticResult.graph_error.message}</p>
                  <div className="flex items-center gap-2 flex-wrap font-mono text-[11px] text-muted-foreground pt-1">
                    {diagnosticResult.graph_error.http_status && (
                      <span className="bg-background px-1.5 py-0.5 rounded border">
                        HTTP {diagnosticResult.graph_error.http_status}
                      </span>
                    )}
                    {diagnosticResult.graph_error.code !== null &&
                      diagnosticResult.graph_error.code !== undefined && (
                        <span className="bg-background px-1.5 py-0.5 rounded border">
                          Code {diagnosticResult.graph_error.code}
                        </span>
                      )}
                    {diagnosticResult.graph_error.subcode !== null &&
                      diagnosticResult.graph_error.subcode !== undefined && (
                        <span className="bg-background px-1.5 py-0.5 rounded border">
                          Subcode {diagnosticResult.graph_error.subcode}
                        </span>
                      )}
                    {diagnosticResult.graph_error.type && (
                      <span className="bg-background px-1.5 py-0.5 rounded border">
                        Type: {diagnosticResult.graph_error.type}
                      </span>
                    )}
                  </div>
                  {diagnosticResult.graph_error.user_msg && (
                    <p className="text-muted-foreground italic pt-1">
                      Mensagem da Meta: {diagnosticResult.graph_error.user_msg}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {diagnosticResult?.missing_perms &&
            diagnosticResult.missing_perms.length > 0 &&
            !diagnosticResult?.graph_error && (
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
                        <strong>Adicionar Ativos</strong> &gt; <strong>Páginas</strong> &gt;
                        selecione sua Página do Facebook conectada ao Instagram e marque{' '}
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
