import { useState, useEffect, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Play, Pause, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export interface ReguaControlState {
  is_active: boolean
  status: 'ativa' | 'pausada'
  paused_at?: string
  paused_by?: string
  resumed_at?: string
  resumed_by?: string
  description?: string
  record_id?: string
}

export function ReguaPauseControl() {
  const [controlState, setControlState] = useState<ReguaControlState | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<'pause' | 'resume' | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      // 1. Tentar direto via collection do PocketBase
      const rec = await pb
        .collection('app_controls')
        .getFirstListItem('key = "regua_automations_active"')
        .catch(() => null)

      if (rec) {
        setControlState({
          is_active: !!rec.is_active,
          status: rec.is_active ? 'ativa' : 'pausada',
          paused_at: rec.paused_at,
          paused_by: rec.paused_by,
          resumed_at: rec.resumed_at,
          resumed_by: rec.resumed_by,
          description: rec.description,
          record_id: rec.id,
        })
        return
      }

      // 2. Fallback via endpoint customizado /backend/v1/regua/status
      const res = await pb.send('/backend/v1/regua/status', { method: 'GET' })
      if (res && res.success) {
        setControlState({
          is_active: !!res.is_active,
          status: res.status,
          paused_at: res.paused_at,
          paused_by: res.paused_by,
          resumed_at: res.resumed_at,
          resumed_by: res.resumed_by,
          description: res.description,
          record_id: res.record_id,
        })
      }
    } catch (err) {
      console.warn('[ReguaPauseControl] Erro ao carregar status da régua:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    // Atualiza periodicamente (60s) apenas se a aba estiver visível
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      fetchStatus()
    }, 60000)
    return () => clearInterval(timer)
  }, [fetchStatus])

  const handleToggleClick = (target: 'pause' | 'resume') => {
    setPendingAction(target)
    setConfirmDialogOpen(true)
  }

  const handleConfirmToggle = async () => {
    if (!pendingAction) return
    setActionInProgress(true)
    const action = pendingAction
    setConfirmDialogOpen(false)

    try {
      const currentUser = pb.authStore.record?.name || pb.authStore.record?.email || 'Mauro'
      const res = await pb.send('/backend/v1/regua/toggle', {
        method: 'POST',
        body: {
          action: action,
          operator: currentUser,
        },
      })

      if (res && res.success) {
        setControlState((prev) => ({
          ...(prev || { is_active: false, status: 'pausada' }),
          is_active: !!res.is_active,
          status: res.status,
          paused_by: action === 'pause' ? currentUser : prev?.paused_by,
          paused_at: action === 'pause' ? new Date().toISOString() : prev?.paused_at,
          resumed_by: action === 'resume' ? currentUser : prev?.resumed_by,
          resumed_at: action === 'resume' ? new Date().toISOString() : prev?.resumed_at,
        }))

        toast({
          title:
            action === 'pause' ? '⏸️ Régua Pausada na Hora!' : '▶️ Régua Retomada com Sucesso!',
          description: res.message,
          variant: action === 'pause' ? 'destructive' : 'default',
        })
      } else {
        throw new Error(res?.error || 'Falha ao alterar estado da régua')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({
        title: 'Erro ao alterar estado da régua',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setActionInProgress(false)
      setPendingAction(null)
      fetchStatus()
    }
  }

  const isPaused = controlState ? !controlState.is_active : true

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs shadow-xs transition-colors',
          isPaused
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200',
        )}
      >
        <div className="flex items-center gap-1.5">
          {isPaused ? (
            <span
              className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse"
              title="Régua pausada: nenhum envio automático sai"
            />
          ) : (
            <span
              className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"
              title="Régua ativa: disparos programados em andamento"
            />
          )}

          <div className="flex flex-col text-left">
            <span className="font-semibold flex items-center gap-1">
              Régua Automática:
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] px-1.5 py-0 uppercase font-bold tracking-wider',
                  isPaused
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
                )}
              >
                {loading ? 'Checando...' : isPaused ? 'Pausada' : 'Ativa'}
              </Badge>
            </span>

            {isPaused ? (
              <span className="text-[10px] text-amber-700 dark:text-amber-300/80 leading-none mt-0.5">
                Envios travados (fila preservada)
              </span>
            ) : (
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300/80 leading-none mt-0.5">
                Disparos em janela comercial
              </span>
            )}
          </div>
        </div>

        {/* Botão de Ação Direta */}
        {isPaused ? (
          <Button
            size="sm"
            onClick={() => handleToggleClick('resume')}
            disabled={loading || actionInProgress}
            className="h-7 text-xs px-2.5 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
            title="Retomar envios da régua comercial e remarketing"
          >
            {actionInProgress ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            <span>Retomar Régua</span>
          </Button>
        ) : (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleToggleClick('pause')}
            disabled={loading || actionInProgress}
            className="h-7 text-xs px-2.5 gap-1.5 font-medium shadow-xs"
            title="Pausar envios imediatamente (freia disparos em andamento)"
          >
            {actionInProgress ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Pause className="h-3.5 w-3.5 fill-current" />
            )}
            <span>Parar Envio Agora</span>
          </Button>
        )}
      </div>

      {/* Modal de Confirmação para evitar clique acidental */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingAction === 'pause' ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span>Pausar Régua e Automações de Envio?</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <span>Retomar Régua de Automações?</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm pt-2">
              {pendingAction === 'pause' ? (
                <span>
                  Todos os envios automáticos (régua de persistência D+1/D+3/D+7/D+14/mensal,
                  campanhas de remarketing e ações de e-book) serão <strong>parados na hora</strong>
                  . A fila agendada continuará intacta para sair quando você retomar.
                </span>
              ) : (
                <span>
                  A régua comercial será <strong>reativada</strong>. Os envios agendados voltarão a
                  processar normalmente dentro da janela de horário comercial (8h às 18h)
                  respeitando o limite seguro anti-flood.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={actionInProgress}
            >
              Cancelar
            </Button>
            <Button
              variant={pendingAction === 'pause' ? 'destructive' : 'default'}
              size="sm"
              onClick={handleConfirmToggle}
              disabled={actionInProgress}
              className={
                pendingAction === 'resume' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
              }
            >
              {actionInProgress ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
              ) : pendingAction === 'pause' ? (
                <Pause className="h-4 w-4 mr-1.5 fill-current" />
              ) : (
                <Play className="h-4 w-4 mr-1.5 fill-current" />
              )}
              {pendingAction === 'pause' ? 'Sim, Pausar Agora' : 'Sim, Retomar Envios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
