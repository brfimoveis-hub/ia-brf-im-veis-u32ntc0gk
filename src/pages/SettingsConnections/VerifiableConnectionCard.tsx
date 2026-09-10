import { useState, useEffect, type ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, Clock, HelpCircle, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusTrafficLight } from './StatusTrafficLight'
import { runHealthCheck } from '@/services/connection-health'
import { testInstagramConnection } from '@/services/instagram'
import { useToast } from '@/hooks/use-toast'

interface VerifiableConnectionCardProps {
  icon: ReactNode
  title: string
  status: string
  error?: string
  connectionKey: string
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

  const handleVerify = async () => {
    setChecking(true)
    setLocalError('')
    setShowMetaHelp(false)
    try {
      if (connectionKey === 'instagram') {
        // Para Instagram, executa fluxo dedicado com auto-descoberta server-side
        const igRes = await testInstagramConnection()
        const tsNow = new Date().toISOString()
        setLastCheck(tsNow)

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
          if (igRes?.missing_perms && igRes.missing_perms.length > 0) {
            setShowMetaHelp(true)
          }
          toast({
            variant: 'destructive',
            title: 'Verificação Instagram',
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
