import { useCallback, useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  KeyRound,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'

interface SystemHealthToken {
  status?: string
  page_name?: string
  page_id?: string
  code?: number
  subcode?: number
  message?: string
  raw_message?: string | null
  expires_at?: string
  days_left?: number
  checked_at?: string
}

// Tradução dos códigos conhecidos da Meta para português (11/11/26):
// 190/467 = sessão invalidada porque saíram do Facebook; 190/463 = token expirado.
export function translateMetaTokenError(code?: number | null, subcode?: number | null): string {
  if (code === 190 && subcode === 467) {
    return 'Sessão invalidada porque saíram do Facebook — gere o token novamente e NÃO saia da conta do Facebook depois de gerar o token.'
  }
  if (code === 190 && subcode === 463) {
    return 'Token expirado — renove gerando um novo token no Graph API Explorer.'
  }
  if (code === 190) {
    return 'Token expirado ou invalidado pela Meta (código 190) — gere um novo token e cole no campo abaixo.'
  }
  return ''
}

interface SystemHealthResponse {
  success?: boolean
  overall?: string
  token?: SystemHealthToken
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000

const formatExpiryDate = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Banner de validade do token Meta salvo (Página/Messenger/Instagram).
 * Consome o endpoint do vigia GET /backend/v1/system_health (sem expor tokens)
 * e o campo users.meta_token_status gravado pelo cron system_health_watch:
 *  - VERMELHO: token expirado (status 'expired' na Graph API) ou erro salvo
 *              pela extensão obrigatória de token (nunca "Conectado" com
 *              token curto — v0.0.1406)
 *  - AMARELO : faltam menos de 7 dias para expirar
 *  - VERDE   : token válido
 */
export function TokenExpiryBanner() {
  const { user } = useAuth()
  const [health, setHealth] = useState<SystemHealthToken | null>(null)
  const [loading, setLoading] = useState(false)

  // Erro gravado pela extensão obrigatória de token (save_and_subscribe):
  // meta_capi_error guarda a mensagem amigável em português; se ainda houver um
  // token salvo mas o status for de erro, o banner VERMELHO tem prioridade
  // sobre qualquer "Conectado" (nunca "Conectado" com token curto).
  const savedError = (user?.meta_capi_error || '').trim()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await pb.send<SystemHealthResponse>('/backend/v1/system_health', {
        method: 'GET',
      })
      if (res?.token) setHealth(res.token)
    } catch {
      // silencioso: o painel de saúde dedicado mostra erros de rede
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, REFRESH_INTERVAL_MS)
    return () => clearInterval(t)
  }, [load, user?.id])

  if (!health) return null

  const isExpired =
    health.status === 'expired' || (user?.meta_token_status || '').toLowerCase() === 'expired'
  const errorCode = typeof health.code === 'number' ? health.code : null
  const errorSubcode = typeof health.subcode === 'number' ? health.subcode : null
  // Motivo em português: tradução dos códigos da Meta + mensagem salva pelo hook
  const translated =
    translateMetaTokenError(errorCode, errorSubcode) ||
    (health.message || '').trim() ||
    savedError ||
    (isExpired ? 'Token de Página rejeitado pela Meta (código 190) — gere um novo token.' : '')
  const daysLeft = typeof health.days_left === 'number' ? health.days_left : null
  const expiringSoon = !isExpired && daysLeft !== null && daysLeft < 7
  const expiryFormatted = formatExpiryDate(health.expires_at)

  if (isExpired) {
    const subcodeNote =
      errorCode === 190 && errorSubcode === 467
        ? ' (código 190, subcódigo 467 — sessão invalidada por logout do Facebook)'
        : errorCode === 190 && errorSubcode === 463
          ? ' (código 190, subcódigo 463 — expiração)'
          : ''
    return (
      <Alert variant="destructive" className="border-red-500/40 bg-red-500/10">
        <ShieldAlert className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-sm font-semibold text-red-900 dark:text-red-200">
          {savedError
            ? 'FALHA NA EXTENSÃO DO TOKEN — canal NÃO conectado'
            : 'Token Meta EXPIRADO — Bia não entrega mensagens até a renovação'}
        </AlertTitle>
        <AlertDescription className="text-xs text-red-900/90 dark:text-red-100/90 space-y-1">
          <p>
            {translated}
            {subcodeNote} A Bernadete deve gerar um novo token e colar no campo abaixo (passo a
            passo em azul).
          </p>
          <div className="flex items-center gap-2 pt-1">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={load}>
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              Verificar novamente
            </Button>
          </div>
          {/* Rito do System User Token em PT (v0.0.1411): token permanente que
              não depende de sessão — resolve de vez os erros 190/467. */}
          <div className="mt-2 rounded-md border border-red-500/30 bg-background/60 p-2.5 space-y-1.5">
            <p className="text-[11px] font-semibold flex items-center gap-1 text-red-900 dark:text-red-100">
              <KeyRound className="h-3 w-3 shrink-0" />
              Solução definitiva: gerar um System User Token (permanente, NUNCA expira)
            </p>
            <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-red-900/90 dark:text-red-100/90">
              <li>
                Abra{' '}
                <a
                  href="https://business.facebook.com/latest/settings/system_users"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-medium inline-flex items-center gap-0.5"
                >
                  business.facebook.com/latest/settings/system_users
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>{' '}
                (logada como admin no Business Manager).
              </li>
              <li>
                Clique em <strong>Adicionar</strong> → função <strong>Admin</strong>.
              </li>
              <li>
                Clique em <strong>Gerar token</strong> → app{' '}
                <strong>&quot;BRF Imóveis 2&quot;</strong>.
              </li>
              <li>
                Marque validade <strong>Nunca</strong> e selecione as 9 permissões:{' '}
                <span className="font-mono">
                  pages_show_list, pages_messaging, pages_manage_metadata, instagram_basic,
                  instagram_manage_messages, ads_read, ads_management, pages_manage_posts,
                  instagram_content_publish
                </span>
                .
              </li>
              <li>
                Copie o token e cole no campo abaixo —{' '}
                <strong>não precisa sair nem entrar do Facebook</strong>, o token não depende de
                sessão.
              </li>
            </ol>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  if (expiringSoon) {
    return (
      <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          Token expira {daysLeft !== null && daysLeft >= 0 ? `em ${daysLeft} dia(s)` : 'em breve'} —
          renove para não perder leads
        </AlertTitle>
        <AlertDescription className="text-xs text-amber-900/90 dark:text-amber-100/90 space-y-1">
          <p>
            {expiryFormatted
              ? `Validade atual termina em ${expiryFormatted}.`
              : 'A validade atual está acabando.'}{' '}
            Recomendado: gerar um <strong>System User Token</strong> (permanente, NUNCA expira) —{' '}
            <a
              href="https://business.facebook.com/latest/settings/system_users"
              target="_blank"
              rel="noreferrer"
              className="underline font-medium inline-flex items-center gap-0.5"
            >
              Usuários do Sistema
              <ExternalLink className="h-2.5 w-2.5" />
            </a>{' '}
            → Adicionar (função Admin) → Gerar token → app{' '}
            <strong>&quot;BRF Imóveis 2&quot;</strong> → validade <strong>Nunca</strong> →
            permissões de mensageria + <span className="font-mono">ads_read</span> +{' '}
            <span className="font-mono">ads_management</span> → colar no campo abaixo. Não precisa
            sair do Facebook: o token não depende de sessão.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={load}>
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              Verificar novamente
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  if (health.status === 'ok') {
    // Defensivo: se o vigia marcou OK mas carrega um código de erro da Meta,
    // mostramos o aviso traduzido em vez de "válido" (nunca verde com erro).
    const okTranslated = translateMetaTokenError(health.code, health.subcode)
    if (okTranslated) {
      return (
        <Alert variant="destructive" className="border-red-500/40 bg-red-500/10">
          <ShieldAlert className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-sm font-semibold text-red-900 dark:text-red-200">
            Atenção no token da Página
          </AlertTitle>
          <AlertDescription className="text-xs text-red-900/90 dark:text-red-100/90">
            {okTranslated}
          </AlertDescription>
        </Alert>
      )
    }
    return (
      <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 py-2.5">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        <AlertDescription className="text-xs text-emerald-900/90 dark:text-emerald-100/90">
          <span className="font-semibold">Token válido.</span>
          {health.page_name ? ` Página: ${health.page_name}.` : ''}
          {expiryFormatted
            ? ` Expira em ${expiryFormatted}${daysLeft !== null ? ` (${daysLeft} dia(s))` : ''}.`
            : ''}
        </AlertDescription>
      </Alert>
    )
  }

  return null
}

export default TokenExpiryBanner
