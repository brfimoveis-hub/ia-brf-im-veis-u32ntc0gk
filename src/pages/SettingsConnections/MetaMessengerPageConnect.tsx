import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { KeyRound, CheckCircle2, XCircle, Loader2, Send } from 'lucide-react'
import { TokenExpiryBanner, translateMetaTokenError } from './TokenExpiryBanner'
import pb from '@/lib/pocketbase/client'

// Permissões mínimas do System User Token (v0.0.1411) — as mesmas validadas
// pelo hook meta_messenger_save_and_subscribe via debug_token.
const SYSTEM_USER_PERMISSIONS = [
  'pages_show_list',
  'pages_messaging',
  'pages_manage_metadata',
  'instagram_basic',
  'instagram_manage_messages',
  'ads_read',
  'ads_management',
  'pages_manage_posts',
  'instagram_content_publish',
]

const SYSTEM_USER_GUIDE_URL = 'https://business.facebook.com/latest/settings/system_users'

export function MetaMessengerPageConnect() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [pageName, setPageName] = useState<string>('')
  const [pageId, setPageId] = useState<string>('')
  const [igAccount, setIgAccount] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tokenInput, setTokenInput] = useState('')

  useEffect(() => {
    async function load() {
      if (!user) return
      setLoading(true)
      try {
        const savedPageId = (user.meta_messenger_page_id || '').trim()
        const savedPageName = (user.meta_messenger_page_name || '').trim()
        setPageName(savedPageName)
        setPageId(savedPageId)
        setIgAccount((user.instagram_username || '').trim())
      } catch {
        // silencioso
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  // Salva e subscreve via hook server-side (valida token na Meta, deriva Page
  // Token, subscreve a Página ao webhook e grava status/system_logs).
  const handleSaveAndSubscribe = async () => {
    const token = tokenInput.trim()
    if (!token) {
      toast({
        variant: 'destructive',
        title: 'Token obrigatório',
        description: 'Cole o token antes de salvar.',
      })
      return
    }
    setSaving(true)
    try {
      const res = await pb.send<{
        success?: boolean
        page_name?: string
        page_id?: string
        error?: string
      }>('/backend/v1/meta_messenger_save_and_subscribe', {
        method: 'POST',
        body: JSON.stringify({ token }),
        headers: { 'Content-Type': 'application/json' },
      })
      if (res?.success) {
        toast({
          title: 'Conectado!',
          description:
            'Página ' +
            (res.page_name || 'salva') +
            ' conectada e subscrita ao webhook. Token permanente aceito.',
        })
        setTokenInput('')
        setPageName(res.page_name || '')
        setPageId(res.page_id || '')
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha ao validar token',
          description: res?.error || 'A Meta rejeitou o token. Veja o passo a passo abaixo.',
        })
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha ao validar token',
        description: err?.message || 'Erro de rede ao chamar o backend.',
      })
    } finally {
      setSaving(false)
    }
  }

  const translated = translateMetaTokenError(user?.meta_token_code, user?.meta_token_subcode)

  if (loading) return <Skeleton className="h-40 w-full rounded-lg" />

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Send className="h-4 w-4" />
          Messenger — Página do Facebook
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <TokenExpiryBanner />

        {pageName ? (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>
              Página conectada: <strong>{pageName}</strong>
              {pageId ? ` (ID ${pageId})` : ''}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <XCircle className="h-4 w-4 text-muted-foreground" />
            <span>Nenhuma Página conectada ainda.</span>
          </div>
        )}
        {igAccount && (
          <p className="text-xs text-muted-foreground">Instagram vinculado: @{igAccount}</p>
        )}

        {translated && <p className="text-xs text-destructive">{translated}</p>}

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="messenger-token-input">
            Token de acesso (System User Token recomendado — nunca expira)
          </label>
          <textarea
            id="messenger-token-input"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Cole aqui o token..."
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button onClick={handleSaveAndSubscribe} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4 mr-2" />
            )}
            {saving ? 'Validando na Meta...' : 'Salvar e Assinar'}
          </Button>
        </div>

        {/* RITO DO SYSTEM USER EM PORTUGUÊS (v0.0.1411) — passo a passo para a
            Bernadete gerar o token permanente que não depende de sessão. */}
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-blue-600 shrink-0" />
            <h4 className="font-semibold text-blue-900 dark:text-blue-200">
              Como gerar o System User Token (permanente, NUNCA expira)
            </h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Recomendado para a Bernadete: este token não depende de sessão de login —{' '}
            <strong>não precisa sair nem entrar do Facebook</strong>, e não morre com o erro 190/467
            (&quot;saiu do Facebook&quot;). Requer acesso de administrador ao Business Manager da
            imobiliária.
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-foreground/90">
            <li>
              Acesse{' '}
              <a
                href={SYSTEM_USER_GUIDE_URL}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 dark:text-blue-400 underline font-medium"
              >
                business.facebook.com/latest/settings/system_users
              </a>{' '}
              (logada como admin no Business Manager).
            </li>
            <li>
              Clique em <strong>Adicionar</strong> para criar um Usuário do Sistema, com a função{' '}
              <strong>Admin</strong>.
            </li>
            <li>
              Com o usuário criado, clique em <strong>Gerar token</strong> e selecione o app{' '}
              <strong>&quot;BRF Imóveis 2&quot;</strong>.
            </li>
            <li>
              Marque <strong>token que nunca expira</strong> (validade &quot;Nunca&quot;) e
              selecione TODAS estas permissões:
              <div className="flex flex-wrap gap-1.5 pt-1.5 pl-1">
                {SYSTEM_USER_PERMISSIONS.map((p) => (
                  <span
                    key={p}
                    className={cn(
                      'inline-flex items-center rounded border border-blue-500/40 bg-blue-500/10',
                      'px-1.5 py-0.5 font-mono text-[10px] text-blue-800 dark:text-blue-300',
                    )}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </li>
            <li>Copie o token gerado (só é exibido uma vez) e cole no campo acima.</li>
            <li>
              Clique em <strong>Salvar e Assinar</strong> — o CRM valida na Meta, deriva o token de
              Página e subscreve a Página ao webhook automaticamente.
            </li>
          </ol>
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            Importante: o System User Token não depende de sessão — não há risco de invalidá-lo ao
            sair do Facebook. Se a Meta pedir atribuição de ativos, conceda ao usuário do sistema o
            acesso à Página BRF Imóveis (Controle total).
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default MetaMessengerPageConnect
