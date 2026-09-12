import { useState, useEffect, type ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  RefreshCw,
  Clock,
  HelpCircle,
  ExternalLink,
  Layers,
  User,
  Link2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { StatusTrafficLight } from './StatusTrafficLight'
import { runHealthCheck } from '@/services/connection-health'
import {
  testInstagramConnection,
  type InstagramTokenIdentity,
  type InstagramAccessiblePage,
} from '@/services/instagram'
import { useToast } from '@/hooks/use-toast'

interface VerifiableConnectionCardProps {
  icon: ReactNode
  title: string
  status: string
  error?: string
  connectionKey: string
  tokenIdentity?: InstagramTokenIdentity | null
  accessiblePages?: InstagramAccessiblePage[]
  onStatusChange?: (status: string, error: string) => void
}

export function VerifiableConnectionCard({
  icon,
  title,
  status,
  error,
  connectionKey,
  onStatusChange,
}: VerifiableConnectionCardProps) {
  const { toast } = useToast()
  const [checking, setChecking] = useState(false)
  const [lastCheck, setLastCheck] = useState('')
  const [localError, setLocalError] = useState(error || '')

  useEffect(() => {
    setLocalError(error || '')
  }, [error])

  const [showMetaHelp, setShowMetaHelp] = useState(false)
  const [localTokenIdentity, setLocalTokenIdentity] = useState<InstagramTokenIdentity | null>(null)
  const [localAccessiblePages, setLocalAccessiblePages] = useState<InstagramAccessiblePage[]>([])

  const handleVerify = async () => {
    setChecking(true)
    setLocalError('')
    setShowMetaHelp(false)
    setLocalTokenIdentity(null)
    setLocalAccessiblePages([])
    try {
      if (connectionKey === 'instagram') {
        // Para Instagram, executa fluxo dedicado com auto-descoberta server-side
        const igRes = await testInstagramConnection()
        const tsNow = new Date().toISOString()
        setLastCheck(tsNow)

        if (igRes?.token_identity) {
          setLocalTokenIdentity(igRes.token_identity)
        }
        if (Array.isArray(igRes?.accessible_pages)) {
          setLocalAccessiblePages(igRes.accessible_pages)
        }

        if (igRes?.status === 'connected') {
          setLocalError('')
          onStatusChange?.('connected', igRes.message || '')
          toast({
            title: 'Instagram Conectado!',
            description: igRes.message || 'Conexão validada com sucesso.',
          })
        } else {
          const detailMsg = igRes?.message || 'Aguardando Page Token para ativar a conexão.'
          setLocalError(detailMsg)
          onStatusChange?.(igRes?.status || 'configured_waiting_token', detailMsg)
          if (igRes?.missing_perms && igRes.missing_perms.length > 0 && !igRes?.graph_error) {
            setShowMetaHelp(true)
          }
          toast({
            variant: 'destructive',
            title: igRes?.graph_error ? 'Erro de Token Instagram' : 'Verificação Instagram',
            description: detailMsg,
          })
        }
      } else {
        const res = await runHealthCheck(connectionKey)
        if (res?.success && Array.isArray(res.results)) {
          const result = res.results.find((r) => r.key === connectionKey)
          if (result) {
            setLastCheck(result.timestamp)
            if (result.status === 'error' || result.status === 'not_configured') {
              setLocalError(result.message)
            } else {
              setLocalError('')
            }
            onStatusChange?.(result.status, result.message)
            toast({
              title:
                result.status === 'connected'
                  ? 'Conectado'
                  : result.status === 'error'
                    ? 'Erro'
                    : result.status === 'not_configured'
                      ? 'Não Configurado'
                      : 'Verificado',
              description: result.message,
              variant: result.status === 'error' ? 'destructive' : 'default',
            })
          }
        } else {
          toast({
            variant: 'destructive',
            title: 'Erro na verificação',
            description: res.error || 'Falha ao verificar conexão.',
          })
        }
      }
    } catch (err: any) {
      setLocalError(err.message)
      toast({
        variant: 'destructive',
        title: 'Erro na verificação',
        description: err.message,
      })
    } finally {
      setChecking(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-medium">{title}</span>
          </div>
          <StatusTrafficLight status={status} error={localError || error} />
        </div>
        {localError && (
          <p
            className={cn(
              'text-xs break-words leading-relaxed',
              status === 'not_configured'
                ? 'text-yellow-600'
                : status === 'configured_waiting_token'
                  ? 'text-blue-600'
                  : 'text-destructive',
            )}
          >
            {localError}
          </p>
        )}

        {/* RESUMO DO DIAGNÓSTICO DO TOKEN (QUEM O TOKEN É E PÁGINAS ACESSÍVEIS) */}
        {connectionKey === 'instagram' &&
          (localTokenIdentity || localAccessiblePages.length > 0) && (
            <div className="rounded border border-blue-500/30 bg-blue-500/5 p-2.5 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Layers className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>Diagnóstico do Token Conectado:</span>
              </div>

              {localTokenIdentity && !localTokenIdentity.error && (
                <div className="flex items-center gap-1.5 flex-wrap text-muted-foreground bg-background/70 px-2 py-1 rounded border">
                  <User className="h-3 w-3 text-primary shrink-0" />
                  <span className="text-foreground font-medium">
                    Identidade: {localTokenIdentity.name || localTokenIdentity.id}
                  </span>
                  <span className="text-[10px]">({localTokenIdentity.type || 'token'})</span>
                </div>
              )}

              <div className="space-y-1">
                <span className="font-medium text-foreground flex items-center gap-1">
                  <Link2 className="h-3 w-3 text-blue-600" />
                  Páginas acessíveis: {localAccessiblePages.length}
                </span>
                {localAccessiblePages.length > 0 ? (
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {localAccessiblePages.map((pg) => (
                      <div
                        key={pg.page_id}
                        className="bg-background px-2 py-1 rounded border text-[11px] flex items-center justify-between gap-1 flex-wrap"
                      >
                        <span className="font-medium text-foreground">{pg.page_name}</span>
                        <span className="text-muted-foreground">
                          {pg.has_instagram && pg.ig_account_id ? (
                            <span className="text-purple-700 font-semibold">
                              IG: @{pg.ig_username || pg.ig_account_id}
                            </span>
                          ) : (
                            <span className="text-amber-600">IG: NENHUMA</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-700 font-medium">
                    O token NÃO enxerga nenhuma Página do Facebook — provável causa do erro 100/33.
                  </p>
                )}
              </div>
            </div>
          )}

        {showMetaHelp && connectionKey === 'instagram' && (
          <div className="text-xs bg-amber-500/10 border border-amber-500/30 rounded p-2 text-amber-800 space-y-1">
            <p className="font-semibold flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              Como resolver na Meta:
            </p>
            <p>
              Abra o Meta Business Suite &gt; Usuários do Sistema &gt; BIA CRM &gt; Atribuir Ativos
              &gt; Páginas &gt; selecione sua Página e dê Controle Total. Ou conecte diretamente via
              OAuth na aba Meta API abaixo.
            </p>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          {lastCheck ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(lastCheck).toLocaleString('pt-BR')}
            </span>
          ) : (
            <span />
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-xs ml-auto"
            onClick={handleVerify}
            disabled={checking}
          >
            {checking ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Verificar Agora
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
