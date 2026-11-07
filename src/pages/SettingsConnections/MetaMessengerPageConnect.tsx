import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Copy,
  Info,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { saveAndSubscribeMessengerPage } from '@/services/meta_messenger'

const TARGET_PAGE_ID = '1401557100168686'
const TARGET_PAGE_NAME = 'www.brfimoveis.com.br'
const TARGET_BUSINESS_ID = '4184972131827155'
const WEBHOOK_PUBLIC_URL =
  'https://ia-uazapi-6d79e.shrd03.internal.goskip.dev/backend/v1/meta_messenger_webhook'
const VERIFY_TOKEN = 'BRF IA CRM'

export function MetaMessengerPageConnect() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [tokenInput, setTokenInput] = useState(user?.meta_page_access_token || '')
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState<{
    page_name?: string
    page_id?: string
    subscribed?: boolean
    subscription_warning?: string | null
    connected: boolean
    error?: string
  } | null>(() => {
    if (user?.meta_page_access_token) {
      return {
        connected: true,
        page_name: TARGET_PAGE_NAME,
        page_id: TARGET_PAGE_ID,
        subscribed: true,
      }
    }
    return null
  })

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copiado para a área de transferência',
      description: label,
    })
  }

  const handleSaveAndSubscribe = async () => {
    if (!tokenInput.trim()) {
      toast({
        variant: 'destructive',
        title: 'Token obrigatório',
        description: 'Cole o Page Access Token gerado no Graph API Explorer.',
      })
      return
    }

    setLoading(true)
    try {
      // O backend aceita token de USUÁRIO (gerado com pages_show_list +
      // pages_manage_metadata) e converte sozinho para o token da Página.
      const res = await saveAndSubscribeMessengerPage(tokenInput, TARGET_PAGE_ID, TARGET_PAGE_NAME)
      setLastResult({
        connected: true,
        page_name: res.page_name || TARGET_PAGE_NAME,
        page_id: res.page_id || TARGET_PAGE_ID,
        subscribed: res.subscribed,
        subscription_warning: res.subscription_warning,
      })

      if (res.subscribed) {
        toast({
          title: 'Conexão concluída com sucesso! 🎉',
          description: res.message || 'Página conectada e subscrita ao webhook.',
        })
      } else {
        toast({
          variant: 'default',
          title: 'Página Conectada (com aviso)',
          description:
            res.subscription_warning ||
            'Página validada. A subscrição automática aguarda aprovação de permissão na Meta.',
        })
      }
    } catch (err: any) {
      const errMsg =
        err?.data?.error ||
        err?.message ||
        'Não foi possível validar o token da Página. Verifique se o token é válido.'
      setLastResult({
        connected: false,
        error: errMsg,
      })
      toast({
        variant: 'destructive',
        title: 'Erro de validação do Token',
        description: errMsg,
      })
    } finally {
      setLoading(false)
    }
  }

  const isConnected = !!lastResult?.connected

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Messenger & Instagram Direct (Página {TARGET_PAGE_NAME})
                {isConnected ? (
                  <Badge className="bg-emerald-600 text-white gap-1 text-[11px]">
                    <CheckCircle2 className="h-3 w-3" /> Conectado
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-amber-600 border-amber-500/30 text-[11px]"
                  >
                    Aguardando Token
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Integração via Página ID{' '}
                <span className="font-mono font-medium">{TARGET_PAGE_ID}</span> (Meta Business{' '}
                <span className="font-mono">{TARGET_BUSINESS_ID}</span>). A conta do Instagram
                @brf_imoveis_ já foi vinculada pela Bernadete.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Banner de status / confirmação */}
        {isConnected ? (
          <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertTitle className="text-sm font-semibold">
              Página Confirmada: {lastResult?.page_name} (ID {lastResult?.page_id})
            </AlertTitle>
            <AlertDescription className="text-xs space-y-1">
              <p>
                Status: <strong className="text-emerald-600">Conectado e Ativo</strong>.
                {lastResult?.subscribed ? (
                  ' Subscrição do webhook (messages, messaging_postbacks, messaging_referrals) confirmada.'
                ) : (
                  <span className="text-amber-700 dark:text-amber-300">
                    {' '}
                    {lastResult?.subscription_warning ||
                      'Aguardando aprovação de permissões de mensagem na Meta.'}
                  </span>
                )}
              </p>
            </AlertDescription>
          </Alert>
        ) : lastResult?.error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm">Falha ao validar Token</AlertTitle>
            <AlertDescription className="text-xs">{lastResult.error}</AlertDescription>
          </Alert>
        ) : null}

        {/* Campo de colar o Page Access Token */}
        <div className="space-y-2">
          <Label htmlFor="page_access_token_input" className="text-sm font-medium">
            Page Access Token (Página {TARGET_PAGE_ID})
          </Label>
          <div className="flex gap-2">
            <Input
              id="page_access_token_input"
              type="password"
              placeholder="Cole aqui o Page Access Token (inicia com EAA...)"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="font-mono text-xs"
            />
            <Button
              onClick={handleSaveAndSubscribe}
              disabled={loading || !tokenInput.trim()}
              className="shrink-0 gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Validando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Salvar e Subscrever</span>
                </>
              )}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Aceita <strong>token de usuário OU token de Página</strong>: se for de usuário, o CRM
            troca sozinho pelo token da Página via{' '}
            <code className="text-foreground">/me/accounts</code> e subscreve a Página
            automaticamente ao webhook (<code className="text-foreground">messages</code>,{' '}
            <code className="text-foreground">messaging_postbacks</code>,{' '}
            <code className="text-foreground">messaging_referrals</code>). O token expira em ~1h,
            mas o que fica salvo no CRM é o token da Página, que não expira com ele.
          </p>
        </div>

        {/* Dados do Webhook para configuração na Meta */}
        <div className="rounded-lg border bg-muted/40 p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Info className="h-3.5 w-3.5 text-primary" />
            <span>Configuração do Webhook da Página na Meta (developers.facebook.com):</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div className="bg-background/80 p-2 rounded border space-y-1">
              <span className="text-[11px] text-muted-foreground block">
                Callback URL (Webhook do Messenger/Direct):
              </span>
              <div className="flex items-center justify-between gap-1 font-mono text-[11px] break-all">
                <span>{WEBHOOK_PUBLIC_URL}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 shrink-0"
                  onClick={() => handleCopy(WEBHOOK_PUBLIC_URL, 'Callback URL copiada')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="bg-background/80 p-2 rounded border space-y-1">
              <span className="text-[11px] text-muted-foreground block">
                Token de Verificação (Verify Token):
              </span>
              <div className="flex items-center justify-between gap-1 font-mono text-[11px]">
                <span className="font-semibold">{VERIFY_TOKEN}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 shrink-0"
                  onClick={() => handleCopy(VERIFY_TOKEN, 'Verify Token copiado')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Instruções para a Bernadete gerar o token */}
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-200">
            <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
            <span>Passo a passo para a Bernadete gerar o Page Access Token:</span>
          </div>

          <ol className="text-xs space-y-2 text-blue-950/90 dark:text-blue-100/90 list-decimal pl-4 leading-relaxed">
            <li>
              Acesse{' '}
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                developers.facebook.com/tools/explorer <ExternalLink className="h-3 w-3 inline" />
              </a>{' '}
              com o perfil que tem acesso admin à Página 1401557100168686.
            </li>
            <li>
              No canto superior direito, selecione o Aplicativo Meta: <strong>BRF Imóveis 2</strong>
              .
            </li>
            <li>
              No seletor <strong>Token de Usuário ou Página</strong>, pode deixar como{' '}
              <strong>Usuário</strong> (padrão) ou escolher a Página{' '}
              <strong>www.brfimoveis.com.br (1401557100168686)</strong> — os dois funcionam: se for
              token de usuário, o CRM troca automaticamente pelo token da Página.
            </li>
            <li>
              Em <strong>Permissões</strong>, adicione exatamente estas 4 permissões:
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Badge variant="secondary" className="font-mono text-[10px]">
                  pages_show_list
                </Badge>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  pages_messaging
                </Badge>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  pages_manage_metadata
                </Badge>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  instagram_manage_messages
                </Badge>
              </div>
            </li>
            <li>
              Clique em <strong>Generate Access Token</strong>, confirme as permissões da Meta,
              copie o token gerado e cole no campo acima.
            </li>
          </ol>

          <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100 text-xs mt-2 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <AlertDescription className="text-[11px] leading-tight">
              <strong>Aviso sobre Aprovação da Meta:</strong> As permissões de envio/recebimento de
              mensagens (<code className="text-foreground">pages_messaging</code>,{' '}
              <code className="text-foreground">instagram_manage_messages</code>) para usuários
              externos podem exigir que o App esteja em modo &quot;Em Produção&quot; ou com
              permissões aprovadas na Meta. Para administradores e testadores do app, funciona
              imediatamente. Se a subscrição retornar código 10, a conexão ficará salva como
              &quot;pronta, aguardando liberação da Meta&quot;.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  )
}
