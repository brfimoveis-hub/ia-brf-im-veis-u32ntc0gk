import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { AlertTriangle, X, ArrowRight } from 'lucide-react'

const UNHEALTHY_STATES = ['error', 'expired']

export function ConnectionAlertBanner() {
  const { user } = useAuth()
  const [currentUser, setCurrentUser] = useState(user)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setCurrentUser(user)
    setDismissed(false)
  }, [user])

  useRealtime('users', (e) => {
    if (e.record.id === user?.id) {
      setCurrentUser(e.record)
      setDismissed(false)
    }
  })

  if (!currentUser) return null

  const whatsappUnhealthy = UNHEALTHY_STATES.includes(
    (currentUser.meta_token_status || '').toLowerCase(),
  )
  const capiUnhealthy = UNHEALTHY_STATES.includes(
    (currentUser.meta_capi_status || '').toLowerCase(),
  )

  const failing: string[] = []
  if (whatsappUnhealthy) failing.push('Meta WhatsApp API')
  if (capiUnhealthy) failing.push('Meta Conversions API (CAPI)')

  if (failing.length === 0 || dismissed) return null

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3 animate-fade-in-down">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-destructive truncate">
              Problema de Conexão: {failing.join(' • ')}
            </p>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Uma ou mais integrações estão com falha. Acesse as configurações para resolver.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            to="/settings/connections"
            className="inline-flex items-center gap-1 text-sm font-medium text-destructive hover:underline whitespace-nowrap"
          >
            Resolver <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground"
            aria-label="Fechar alerta"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
