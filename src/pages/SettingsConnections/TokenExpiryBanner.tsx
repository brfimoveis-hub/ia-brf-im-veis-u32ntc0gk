import { useCallback, useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, ShieldAlert, ShieldCheck, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'

interface SystemHealthToken {
  status?: string
  page_name?: string
  page_id?: string
  message?: string
  expires_at?: string
  days_left?: number
  checked_at?: string
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
 *  - VERMELHO: token expirado (status 'expired' na Graph API)
 *  - AMARELO : faltam menos de 7 dias para expirar
 *  - VERDE   : token válido
 */
export function TokenExpiryBanner() {
  const { user } = useAuth()
  const [health, setHealth] = useState<SystemHealthToken | null>(null)
  const [loading, setLoading] = useState(false)

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
  const daysLeft = typeof health.days_left === 'number' ? health.days_left : null
  const expiringSoon = !isExpired && daysLeft !== null && daysLeft < 7
  const expiryFormatted = formatExpiryDate(health.expires_at)

  if (isExpired) {
    return (
      <Alert variant="destructive" className="border-red-500/40 bg-red-500/10">
        <ShieldAlert className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-sm font-semibold text-red-900 dark:text-red-200">
          Token Meta EXPIRADO — Bia não entrega mensagens até a renovação
        </AlertTitle>
        <AlertDescription className="text-xs text-red-900/90 dark:text-red-100/90 space-y-1">
          <p>
            {expiryFormatted
              ? `O token expirou (validade vencida em ${expiryFormatted}).`
              : 'O token de Página salvo foi rejeitado pela Meta (código 190).'}{' '}
            A Bernadete deve gerar um novo token e colar no campo abaixo (passo a passo em azul).
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
            Recomendado: a Bernadete gera um novo token (com as permissões de mensageria +{' '}
            <span className="font-mono">ads_read</span> +{' '}
            <span className="font-mono">ads_management</span>) e cola no campo abaixo antes do
            vencimento.
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
