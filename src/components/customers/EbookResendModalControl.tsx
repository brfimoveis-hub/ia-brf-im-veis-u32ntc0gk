import { useState, useEffect, useCallback } from 'react'
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
import {
  BookOpen,
  RefreshCw,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Users,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  getEbookResendAudit,
  dispatchEbookResendBatch,
  type EbookAuditResponse,
} from '@/services/ebook_resend'

export function EbookResendModalControl() {
  const [auditData, setAuditData] = useState<EbookAuditResponse | null>(null)
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmSendOpen, setConfirmSendOpen] = useState(false)
  const [sendingBatch, setSendingBatch] = useState(false)
  const [forceOutsideWindow, setForceOutsideWindow] = useState(false)

  const loadAudit = useCallback(async (quiet = false) => {
    if (!quiet) setLoadingAudit(true)
    try {
      const res = await getEbookResendAudit()
      if (res && res.success) {
        setAuditData(res)
      }
    } catch (err: unknown) {
      console.warn('[EbookResendModalControl] Erro ao carregar auditoria:', err)
    } finally {
      if (!quiet) setLoadingAudit(false)
    }
  }, [])

  useEffect(() => {
    loadAudit(true)
    // Atualiza a cada 30s
    const timer = setInterval(() => loadAudit(true), 30000)
    return () => clearInterval(timer)
  }, [loadAudit])

  const pendingCount = auditData?.summary?.eligible_pending_count ?? 0
  const isCommercialWindow = auditData?.commercial_window?.isCommercialWindow ?? false

  const handleOpenModal = () => {
    setModalOpen(true)
    loadAudit(false)
  }

  const handleTriggerSendClick = () => {
    setConfirmSendOpen(true)
  }

  const handleConfirmDispatch = async () => {
    setSendingBatch(true)
    try {
      const res = await dispatchEbookResendBatch({
        batch_size: 15,
        force_outside_window: forceOutsideWindow,
      })

      if (res && res.success) {
        toast({
          title: '🚀 Lote de E-book Despachado!',
          description: `${res.dispatched_count} clientes receberam o material oficial Vistage com o link no corpo. Faltam ${res.remaining_pending}.`,
        })
        setConfirmSendOpen(false)
        await loadAudit(false)
      } else {
        throw new Error(res?.error || 'Erro no envio do lote')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({
        title: 'Falha no disparo do lote',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSendingBatch(false)
    }
  }

  return (
    <>
      {/* Botão de Disparo / Indicador no Cabeçalho */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenModal}
        className={cn(
          'h-8 text-xs px-2.5 gap-1.5 border shadow-xs transition-colors',
          pendingCount > 0
            ? 'bg-blue-50/80 hover:bg-blue-100/80 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200 border-blue-300 dark:border-blue-800'
            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300',
        )}
        title="Auditoria e reenvio dirigido do e-book oficial aos clientes abordados"
      >
        <BookOpen className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        <span className="font-semibold">Reenviar E-book</span>
        <Badge
          variant="secondary"
          className={cn(
            'text-[10px] px-1.5 py-0 h-4 font-bold ml-0.5',
            pendingCount > 0
              ? 'bg-blue-600 text-white dark:bg-blue-500'
              : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
          )}
        >
          {loadingAudit && !auditData ? '...' : `${pendingCount} pendentes`}
        </Badge>
      </Button>

      {/* Modal Principal de Auditoria e Reenvio Dirigido */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <span>Reenvio Dirigido de E-book (Vistage Residence)</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Entrega automática e dirigida do material oficial com link público no corpo da
              mensagem aos clientes já abordados pela Bia que ainda não receberam o material.
            </DialogDescription>
          </DialogHeader>

          {/* Cards com Métricas da Auditoria Exata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2">
            <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-2.5 text-center">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                Total Abordados
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {auditData?.summary?.total_approached ?? '—'}
              </span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                Régua / Remarketing
              </span>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-2.5 text-center">
              <span className="text-[10px] uppercase font-semibold text-emerald-700 dark:text-emerald-300 block">
                Já Com E-book
              </span>
              <span className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                {auditData?.summary?.already_delivered ?? '—'}
              </span>
              <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400 block mt-0.5">
                Link verificado
              </span>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-lg p-2.5 text-center">
              <span className="text-[10px] uppercase font-semibold text-amber-700 dark:text-amber-300 block">
                Filtrados
              </span>
              <span className="text-lg font-bold text-amber-800 dark:text-amber-200">
                {auditData?.summary?.excluded_count ?? '—'}
              </span>
              <span className="text-[10px] text-amber-700/80 dark:text-amber-400 block mt-0.5">
                Bloq/24h/Pausados
              </span>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded-lg p-2.5 text-center">
              <span className="text-[10px] uppercase font-semibold text-blue-700 dark:text-blue-300 block">
                Pendentes Faltando
              </span>
              <span className="text-lg font-bold text-blue-800 dark:text-blue-200">
                {auditData?.summary?.eligible_pending_count ?? '—'}
              </span>
              <span className="text-[10px] text-blue-700/80 dark:text-blue-400 block mt-0.5">
                Aptos para reenvio
              </span>
            </div>
          </div>

          {/* Avisos de Segurança e Regras Aplicadas */}
          <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg p-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 dark:text-slate-100">
                  Proteções de Custo Meta e Qualidade Ativas:
                </strong>
                <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-0.5">
                  <li>
                    <strong>Dedup estrito:</strong> cada cliente só recebe o material uma única vez.
                  </li>
                  <li>
                    <strong>Guarda 24h:</strong> clientes com conversa recente viva nas últimas 24h
                    não são atropelados.
                  </li>
                  <li>
                    <strong>Anti-flood:</strong> envia até 15 por ciclo, respeitando limites da Meta
                    Graph API.
                  </li>
                  <li>
                    <strong>Formato consertado:</strong> link público legítimo do Google Drive no
                    CORPO da mensagem com legenda <em>Material oficial: Vistage Residence</em>, sem
                    preço cheio e sem tabelas.
                  </li>
                </ul>
              </div>
            </div>

            {/* Status da Janela de Horário */}
            <div className="flex items-center justify-between pt-2 border-t text-[11px]">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  Horário de Brasília:{' '}
                  <strong>
                    {auditData?.commercial_window?.hour ?? '--'}h
                    {String(auditData?.commercial_window?.minute ?? 0).padStart(2, '0')}m
                  </strong>
                </span>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] px-2 py-0',
                  isCommercialWindow
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300',
                )}
              >
                {isCommercialWindow
                  ? 'Janela Comercial Ativa (8h-18h)'
                  : 'Fora do Horário (Pausado)'}
              </Badge>
            </div>
          </div>

          {/* Lista Prévia dos Clientes Pendentes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Lista de Clientes Pendentes ({auditData?.eligible_pending?.length || 0}):
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadAudit(false)}
                disabled={loadingAudit}
                className="h-6 text-[11px] gap-1 px-1.5"
              >
                <RefreshCw className={cn('h-3 w-3', loadingAudit && 'animate-spin')} />
                Atualizar auditoria
              </Button>
            </div>

            <div className="border rounded-lg max-h-44 overflow-y-auto divide-y text-xs bg-white dark:bg-slate-950">
              {auditData?.eligible_pending?.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-600 mb-1" />
                  <span>Todos os clientes abordados elegíveis já receberam o e-book!</span>
                </div>
              ) : (
                auditData?.eligible_pending?.map((c, idx) => (
                  <div
                    key={c.id}
                    className="p-2 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate flex items-center gap-1.5">
                        <span className="text-muted-foreground text-[10px]">#{idx + 1}</span>
                        <span>{c.name || 'Sem nome'}</span>
                        {c.greeting_name && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                            Bia: {c.greeting_name}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">{c.phone}</div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {c.follow_up_step || 'remarketing'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Exemplo do Texto da Mensagem */}
          <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-2.5 text-xs">
            <span className="font-semibold text-muted-foreground text-[11px] block mb-1">
              Exemplo da mensagem que o cliente receberá:
            </span>
            <div className="p-2 bg-white dark:bg-slate-950 border rounded text-[11px] leading-relaxed whitespace-pre-wrap font-sans">
              {`Bia da BRF Imóveis — bom dia, [Nome], tudo bem?

Lembrei de você e separei o material oficial do Vistage Residence em Barreiros, São José/SC:

📄 *Material oficial: Vistage Residence*
${auditData?.book_link || 'https://drive.google.com/file/d/1w9GadvkqN4aILCYfcg_6-tN6qFbcsCeG/view?usp=sharing'}

Faz sentido para você conhecer mais detalhes das opções de 2 ou 3 dormitórios?`}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              className="text-xs"
            >
              Fechar
            </Button>

            <Button
              size="sm"
              onClick={handleTriggerSendClick}
              disabled={pendingCount === 0 || loadingAudit}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 font-medium shadow-xs"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Disparar Reenvio ({Math.min(pendingCount, 15)} clientes no lote de agora)</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação Final do Disparo */}
      <Dialog open={confirmSendOpen} onOpenChange={setConfirmSendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span>Confirmar Disparo de Reenvio de E-book</span>
            </DialogTitle>
            <DialogDescription className="text-xs pt-1.5 space-y-2">
              <p>
                Você está prestes a disparar o e-book oficial do Vistage para{' '}
                <strong className="text-slate-900 dark:text-slate-100">
                  {Math.min(pendingCount, 15)} clientes
                </strong>{' '}
                desta rodada (lote seguro anti-flood).
              </p>
              <p className="text-muted-foreground">
                Cada envio consome créditos da Meta WhatsApp Cloud API. Todos os envios serão
                gravados na conversa e no registro de auditoria (system_logs).
              </p>

              {!isCommercialWindow && (
                <div className="p-2.5 rounded border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs mt-2">
                  <span className="font-semibold block mb-1">
                    ⚠️ Atenção: Fora da Janela Comercial (8h-18h Brasília)
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={forceOutsideWindow}
                      onChange={(e) => setForceOutsideWindow(e.target.checked)}
                      className="rounded border-amber-400"
                    />
                    <span>Confirmo e desejo enviar mesmo fora do horário comercial</span>
                  </label>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmSendOpen(false)}
              disabled={sendingBatch}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDispatch}
              disabled={sendingBatch || (!isCommercialWindow && !forceOutsideWindow)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 font-medium"
            >
              {sendingBatch ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Send className="h-3.5 w-3.5 mr-1" />
              )}
              <span>{sendingBatch ? 'Enviando Lote...' : 'Sim, Enviar Agora'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
