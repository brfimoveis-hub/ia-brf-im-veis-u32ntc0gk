import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  getInstagramRedirectUri,
  getInstagramOAuthUrl,
  validateAndConsumeInstagramOAuthState,
  exchangeInstagramCode,
  PROD_REDIRECT_URI,
} from '@/services/instagram'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Instagram,
  Copy,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface MetaOAuthErrorDetails {
  kind:
    | 'no_query'
    | 'user_denied'
    | 'redirect_mismatch'
    | 'dev_mode_role'
    | 'invalid_state'
    | 'exchange_failed'
    | 'generic'
  title: string
  friendlyDescription: string
  rawError?: string
  rawReason?: string
  rawDescription?: string
  rawCode?: string
  errorUri?: string
  actionHint?: string
  showRedirectCopy?: boolean
  showMetaDeveloperLink?: boolean
  showRetryOAuth?: boolean
}

export default function InstagramCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorDetails, setErrorDetails] = useState<MetaOAuthErrorDetails | null>(null)
  const [copiedRedirect, setCopiedRedirect] = useState(false)

  const currentRedirectUri = useMemo(() => getInstagramRedirectUri(), [])
  const hasAppConfig = Boolean(user?.meta_app_id)

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

  const handleRetryOAuth = () => {
    if (!user?.meta_app_id) {
      navigate('/settings/connections')
      return
    }
    const newOAuthUrl = getInstagramOAuthUrl(user.meta_app_id, currentRedirectUri)
    window.location.href = newOAuthUrl
  }

  useEffect(() => {
    // 1. Extração de todos os parâmetros possíveis retornados pela Meta ou rota
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorReason = searchParams.get('error_reason')
    const errorDescription = searchParams.get('error_description')
    const errorCode = searchParams.get('error_code')
    const errorUri = searchParams.get('error_uri')

    // Caso a página tenha sido aberta sem nenhuma query string
    const hasAnyParam = Array.from(searchParams.keys()).length > 0
    if (!hasAnyParam) {
      setStatus('error')
      setErrorDetails({
        kind: 'no_query',
        title: 'Callback acessado diretamente',
        friendlyDescription:
          'Esta página é o ponto de retorno da autenticação do Instagram e foi aberta sem parâmetros de autorização. Para conectar sua conta, inicie o processo pelas Configurações do CRM.',
        actionHint:
          'Acesse as Configurações de Conexões e clique no botão "Conectar Instagram (OAuth)".',
        showRetryOAuth: hasAppConfig,
      })
      return
    }

    // 2. Tratamento de Erro explicitamente devolvido pela Meta
    if (error || errorReason || errorDescription) {
      setStatus('error')
      const lowerErr = (error || '').toLowerCase()
      const lowerReason = (errorReason || '').toLowerCase()
      const lowerDesc = (errorDescription || '').toLowerCase()

      // Caso A: Usuário cancelou ou negou autorização
      if (
        lowerErr === 'access_denied' ||
        lowerReason === 'user_denied' ||
        lowerDesc.includes('denied') ||
        lowerDesc.includes('cancel')
      ) {
        setErrorDetails({
          kind: 'user_denied',
          title: 'Autorização cancelada',
          friendlyDescription:
            'Você ou o Facebook cancelou a solicitação de autorização. Para utilizar o Instagram Business no CRM, é necessário conceder as permissões solicitadas.',
          actionHint:
            'Clique no botão abaixo para tentar novamente e, na janela do Facebook, clique em "Continuar como..." e depois em "Permitir" em todas as etapas.',
          rawError: error || undefined,
          rawReason: errorReason || undefined,
          rawDescription: errorDescription || undefined,
          rawCode: errorCode || undefined,
          errorUri: errorUri || undefined,
          showRetryOAuth: hasAppConfig,
        })
        return
      }

      // Caso B: Redirect URI mismatch
      if (
        lowerErr.includes('redirect_uri') ||
        lowerReason.includes('redirect_uri') ||
        lowerDesc.includes('redirect_uri') ||
        lowerDesc.includes('redirect uri') ||
        lowerDesc.includes('url não está incluído') ||
        lowerDesc.includes('domínio dessa url')
      ) {
        setErrorDetails({
          kind: 'redirect_mismatch',
          title: 'URI de redirecionamento não registrada na Meta',
          friendlyDescription:
            'A URL de retorno usada pelo CRM não está registrada na lista de URIs de Redirecionamento OAuth Válidos nas configurações do seu aplicativo do Facebook Developers.',
          actionHint:
            'Copie a URI exata abaixo e adicione em: developers.facebook.com > Seu App (2442476629610638) > Produtos > Logins do Facebook > Configurações > "URIs de redirecionamento OAuth válidos".',
          rawError: error || undefined,
          rawReason: errorReason || undefined,
          rawDescription: errorDescription || undefined,
          rawCode: errorCode || undefined,
          errorUri: errorUri || undefined,
          showRedirectCopy: true,
          showMetaDeveloperLink: true,
          showRetryOAuth: hasAppConfig,
        })
        return
      }

      // Caso C: App em modo desenvolvimento / usuário sem permissão no app
      if (
        lowerDesc.includes('development mode') ||
        lowerDesc.includes('modo de desenvolvimento') ||
        lowerDesc.includes('developer') ||
        lowerDesc.includes('tester') ||
        lowerDesc.includes('função') ||
        lowerDesc.includes('role') ||
        lowerDesc.includes('not public') ||
        lowerDesc.includes('não está publicado')
      ) {
        setErrorDetails({
          kind: 'dev_mode_role',
          title: 'App Meta em Modo Desenvolvimento',
          friendlyDescription:
            'O aplicativo da Meta está em modo de desenvolvimento (não publicado) e a conta que tentou autorizar precisa estar registrada com uma função dentro do App.',
          actionHint:
            'Acesse developers.facebook.com > App 2442476629610638 > Funções do app (App Roles) > Adicione o e-mail brfimoveis@gmail.com como Administrador ou Testador e aceite o convite no Facebook.',
          rawError: error || undefined,
          rawReason: errorReason || undefined,
          rawDescription: errorDescription || undefined,
          rawCode: errorCode || undefined,
          errorUri: errorUri || undefined,
          showMetaDeveloperLink: true,
          showRetryOAuth: hasAppConfig,
        })
        return
      }

      // Caso genérico de erro da Meta
      setErrorDetails({
        kind: 'generic',
        title: 'A Meta recusou a autorização',
        friendlyDescription:
          errorDescription ||
          errorReason ||
          error ||
          'O Facebook retornou um erro ao processar sua solicitação.',
        actionHint:
          'Verifique as permissões do aplicativo no painel de desenvolvedores ou tente novamente.',
        rawError: error || undefined,
        rawReason: errorReason || undefined,
        rawDescription: errorDescription || undefined,
        rawCode: errorCode || undefined,
        errorUri: errorUri || undefined,
        showMetaDeveloperLink: true,
        showRetryOAuth: hasAppConfig,
      })
      return
    }

    // 3. Validação do state CSRF
    const stateValidation = validateAndConsumeInstagramOAuthState(state)
    // Se recebemos um state e ele não bate com o gravado (e não é o legado 'instagram_oauth')
    if (state && !stateValidation.valid) {
      setStatus('error')
      setErrorDetails({
        kind: 'invalid_state',
        title: 'Parâmetro de segurança (state) inválido ou expirado',
        friendlyDescription:
          'A sessão de autorização expirou ou foi aberta em outro navegador/dispositivo. Isso acontece quando a página fica aberta por muito tempo ou quando o navegador limpa o armazenamento temporário.',
        actionHint: 'Clique no botão abaixo para gerar uma nova solicitação de autorização segura.',
        rawError: 'invalid_state',
        rawReason: `Recebido: ${state || 'nenhum'} | Esperado: ${stateValidation.expected || 'nenhum'}`,
        showRetryOAuth: hasAppConfig,
      })
      return
    }

    // 4. Sem código de autorização
    if (!code) {
      setStatus('error')
      setErrorDetails({
        kind: 'generic',
        title: 'Código de autorização não encontrado',
        friendlyDescription:
          'O Facebook concluiu o redirecionamento mas não forneceu o código necessário para concluir a conexão.',
        actionHint:
          'Se o app estiver em modo de desenvolvimento, certifique-se de que a conta brfimoveis@gmail.com está como Administradora/Testadora no developers.facebook.com e tente conectar novamente.',
        showMetaDeveloperLink: true,
        showRedirectCopy: true,
        showRetryOAuth: hasAppConfig,
      })
      return
    }

    // 5. Sucesso inicial: Código presente, prosseguir com a troca por token no backend
    setStatus('loading')
    exchangeInstagramCode(code, currentRedirectUri)
      .then((res) => {
        if (res && res.success) {
          setStatus('success')
        } else {
          setStatus('error')
          setErrorDetails({
            kind: 'exchange_failed',
            title: 'Falha ao trocar código por token de acesso',
            friendlyDescription:
              'O código foi recebido com sucesso da Meta, mas o servidor não conseguiu trocá-lo pelo token permanente.',
            actionHint:
              'Verifique se o Meta App Secret cadastrado nas configurações está correto ou se a página do Facebook possui uma conta do Instagram conectada.',
            showMetaDeveloperLink: true,
            showRetryOAuth: hasAppConfig,
          })
        }
      })
      .catch((err: any) => {
        setStatus('error')
        const message =
          err?.response?.message ||
          err?.message ||
          'Erro inesperado ao processar autorização com a Meta.'

        const isDevRole =
          message.toLowerCase().includes('development') ||
          message.toLowerCase().includes('permiss') ||
          message.toLowerCase().includes('nenhuma pagina')

        setErrorDetails({
          kind: isDevRole ? 'dev_mode_role' : 'exchange_failed',
          title: isDevRole
            ? 'Página do Facebook ou permissão não encontrada'
            : 'Erro na troca de credenciais',
          friendlyDescription: message,
          actionHint:
            'Certifique-se de que sua conta brfimoveis@gmail.com tem acesso à Página do Facebook que está vinculada à conta do Instagram Business.',
          rawDescription: message,
          showMetaDeveloperLink: true,
          showRetryOAuth: hasAppConfig,
        })
      })
  }, [searchParams, currentRedirectUri, hasAppConfig, user?.meta_app_id])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-muted/20">
      <Card className="max-w-xl w-full shadow-lg border">
        <CardHeader className="text-center pb-4 border-b">
          <div className="flex justify-center mb-2">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <Instagram className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-xl">Instagram Business OAuth</CardTitle>
          <CardDescription>
            Conexão automática entre o CRM Bia e o Instagram Business / Messenger
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pt-6">
          {/* ESTADO 1: CARREGANDO */}
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-base font-medium text-foreground">
                Processando autorização com a Meta...
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Validando permissões, obtendo tokens de página e vinculando a conta do Instagram
                Business ao seu perfil.
              </p>
            </div>
          )}

          {/* ESTADO 2: SUCESSO */}
          {status === 'success' && (
            <div className="space-y-4 text-center py-4">
              <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-green-700">
                  Instagram Business Conectado com Sucesso!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Seus tokens de acesso e o ID da conta do Instagram foram configurados e
                  armazenados com segurança no seu CRM.
                </p>
              </div>

              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-xs text-green-800 text-left space-y-1">
                <p className="font-semibold">O que você pode fazer agora:</p>
                <ul className="list-disc list-inside space-y-0.5 text-green-700">
                  <li>Receber e responder DMs do Instagram direto pelo CRM</li>
                  <li>Sincronizar conversas do Messenger com a assistente Bia</li>
                  <li>Acompanhar métricas de engajamento em tempo real</li>
                </ul>
              </div>

              <Button
                onClick={() => navigate('/settings/connections')}
                className="w-full gap-2"
                size="lg"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para Configurações de Conexões
              </Button>
            </div>
          )}

          {/* ESTADO 3: ERRO DETALHADO E AMIGÁVEL */}
          {status === 'error' && errorDetails && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b">
                <div className="p-2 rounded-full bg-red-500/10 text-red-600 shrink-0">
                  <XCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-red-700">{errorDetails.title}</h3>
                  <p className="text-xs text-muted-foreground">Código de resposta da Meta OAuth</p>
                </div>
              </div>

              {/* Explicação amigável em português */}
              <Alert className="border-red-500/30 bg-red-500/5">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <AlertTitle className="text-sm font-semibold text-red-800">
                  O que aconteceu?
                </AlertTitle>
                <AlertDescription className="text-xs text-red-700 mt-1 leading-relaxed">
                  {errorDetails.friendlyDescription}
                </AlertDescription>
              </Alert>

              {/* Guia de Ação */}
              {errorDetails.actionHint && (
                <div className="rounded-lg border bg-background p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <UserCheck className="h-4 w-4 text-primary" />
                    <span>Como resolver este problema:</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {errorDetails.actionHint}
                  </p>
                </div>
              )}

              {/* Bloco explicativo específico para App em Modo Desenvolvimento */}
              {(errorDetails.kind === 'dev_mode_role' ||
                errorDetails.kind === 'generic' ||
                errorDetails.showMetaDeveloperLink) && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                      <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>Verificação no Meta Developers (App 2442476629610638)</span>
                    </div>
                    <a
                      href="https://developers.facebook.com/apps/2442476629610638/roles/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium shrink-0"
                    >
                      Abrir Funções do App
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-amber-700 leading-relaxed">
                    Se o seu app ainda não foi colocado em modo{' '}
                    <strong>&quot;Ao vivo&quot; (Publicado)</strong>, apenas contas cadastradas como{' '}
                    <strong>Administrador</strong> ou <strong>Testador</strong> conseguem autorizar
                    o OAuth. Certifique-se de que o e-mail{' '}
                    <strong className="font-mono text-foreground">brfimoveis@gmail.com</strong> está
                    adicionado em <strong>Funções do aplicativo</strong>.
                  </p>
                </div>
              )}

              {/* Bloco de cópia da Redirect URI para o caso redirect_mismatch */}
              {errorDetails.showRedirectCopy && (
                <div className="rounded-lg border bg-muted/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      URI de Redirecionamento OAuth Exata:
                    </label>
                    <a
                      href="https://developers.facebook.com/apps/2442476629610638/fb-login/settings/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                    >
                      Configurações do Login Facebook
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={currentRedirectUri}
                      className="flex-1 font-mono text-xs p-2 rounded border bg-background select-all"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="gap-1.5 shrink-0"
                      onClick={() => copyToClipboard(currentRedirectUri)}
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
                  {currentRedirectUri !== PROD_REDIRECT_URI && (
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <span>URI de produção complementar:</span>
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
              )}

              {/* Dados técnicos brutos recebidos da Meta (para diagnóstico) */}
              {(errorDetails.rawError ||
                errorDetails.rawReason ||
                errorDetails.rawDescription ||
                errorDetails.rawCode) && (
                <details className="rounded border bg-muted/20 p-2.5 text-xs">
                  <summary className="cursor-pointer font-mono font-medium text-muted-foreground hover:text-foreground">
                    Detalhes técnicos da Meta (clique para expandir)
                  </summary>
                  <div className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground bg-background p-2 rounded border break-all">
                    {errorDetails.rawError && (
                      <p>
                        <span className="font-semibold text-foreground">error:</span>{' '}
                        {errorDetails.rawError}
                      </p>
                    )}
                    {errorDetails.rawReason && (
                      <p>
                        <span className="font-semibold text-foreground">error_reason:</span>{' '}
                        {errorDetails.rawReason}
                      </p>
                    )}
                    {errorDetails.rawDescription && (
                      <p>
                        <span className="font-semibold text-foreground">error_description:</span>{' '}
                        {errorDetails.rawDescription}
                      </p>
                    )}
                    {errorDetails.rawCode && (
                      <p>
                        <span className="font-semibold text-foreground">error_code:</span>{' '}
                        {errorDetails.rawCode}
                      </p>
                    )}
                    {errorDetails.errorUri && (
                      <p>
                        <span className="font-semibold text-foreground">error_uri:</span>{' '}
                        <a
                          href={errorDetails.errorUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          {errorDetails.errorUri}
                        </a>
                      </p>
                    )}
                  </div>
                </details>
              )}

              {/* Ações do Usuário */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {errorDetails.showRetryOAuth && (
                  <Button onClick={handleRetryOAuth} className="gap-2 flex-1" variant="default">
                    <RefreshCw className="h-4 w-4" />
                    Tentar Conectar Novamente
                  </Button>
                )}
                <Button
                  onClick={() => navigate('/settings/connections')}
                  variant={errorDetails.showRetryOAuth ? 'outline' : 'default'}
                  className="gap-2 flex-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para Configurações
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
