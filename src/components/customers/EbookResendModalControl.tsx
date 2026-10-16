import { useState, useEffect, useCallback, useMemo } from 'react'
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
  Play,
  Square,
  AlertCircle,
  PhoneOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  getEbookResendAudit,
  dispatchEbookResendBatch,
  toggleEbookContinuousMode,
  type EbookAuditResponse,
} from '@/services/ebook_resend'

export function EbookResendModalControl() {
  const [auditData, setAuditData] = useState<EbookAuditResponse | null>(null)
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmSendOpen, setConfirmSendOpen] = useState(false)
  const [confirmContinuousOpen, setConfirmContinuousOpen] = useState(false)
  const [sendingBatch, setSendingBatch] = useState(false)
  const [togglingContinuous, setTogglingContinuous] = useState(false)
  const [forceOutsideWindow, setForceOutsideWindow] = useState(false)
  const [showInvalidList, setShowInvalidList] = useState(false)
  const [nowMs, setNowMs] = useState(Date.now())

  // Atualiza relógio local a cada 10s para contagem regressiva de minutos
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 10000)
    return () => clearInterval(t)
  }, [])

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
    // Atualiza a cada 20s
    const timer = setInterval(() => loadAudit(true), 20000)
    return () => clearInterval(timer)
  }, [loadAudit])

  const pendingCount = auditData?.summary?.eligible_pending_count ?? 0
  const invalidCount = auditData?.summary?.invalid_phones_count ?? 0
  const isCommercialWindow = auditData?.commercial_window?.isCommercialWindow ?? false
  const continuousMode = auditData?.continuous_mode
  const isContinuousActive = !!continuousMode?.is_active
  const reguaIsActive = continuousMode?.regua_is_active !== false

  // Cálculo dos minutos restantes até o próximo lote
  const minutesUntilNext = useMemo(() => {
    if (!isContinuousActive || !continuousMode?.next_batch_at) return null
    const diffMs = new Date(continuousMode.next_batch_at).getTime() - nowMs
    if (diffMs <= 0) return 0
    return Math.max(1, Math.ceil(diffMs / 60000))
  }, [isContinuousActive, continuousMode?.next_batch_at, nowMs])

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
          description: `${res.dispatched_count} clientes receberam o material oficial Vistage. ${
            res.failed_count > 0 ? `${res.failed_count} falha(s). ` : ''
          }Faltam ${res.remaining_pending} pendentes.`,
        })
        setConfirmSendOpen(false)
        await loadAudit(false)
      } else {
        throw new Error(res?.error || res?.message || 'Erro no envio do lote')
      }
    } catch (err: unknown) {
      console.error('[EbookResendModalControl] Erro ao disparar lote:', err)
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

  // Ações do Modo Contínuo
  const handleStartContinuousClick = () => {
    if (!reguaIsActive) {
      toast({
        title: 'Régua de automações pausada',
        description:
          'A régua geral está pausada manualmente em app_controls. Reative a régua para poder iniciar o Modo Contínuo.',
        variant: 'destructive',
      })
      return
    }
    setConfirmContinuousOpen(true)
  }

  const handleConfirmStartContinuous = async () => {
    setTogglingContinuous(true)
    try {
      const res = await toggleEbookContinuousMode({
        action: 'start',
        force_outside_window: forceOutsideWindow,
      })

      if (res && res.success) {
        toast({
          title: '⚡ Modo Contínuo ATIVADO!',
          description:
            res.message ||
            'Primeiro lote disparado. Os próximos serão enviados a cada 15 min na janela 8h-18h.',
        })
        setConfirmContinuousOpen(false)
        await loadAudit(false)
      } else {
        throw new Error(res?.error || res?.message || 'Falha ao ativar Modo Contínuo')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({
        title: 'Erro ao ativar Modo Contínuo',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setTogglingContinuous(false)
    }
  }

  const handleStopContinuous = async () => {
    setTogglingContinuous(true)
    try {
      const res = await toggleEbookContinuousMode({
        action: 'stop',
        reason: 'Parado pelo usuário na tela de Atendimentos',
      })

      if (res && res.success) {
        toast({
          title: '⏹️ Modo Contínuo PARADO',
          description: 'O agendamento automático foi suspenso.',
        })
        await loadAudit(false)
      } else {
        throw new Error(res?.error || 'Falha ao parar Modo Contínuo')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({
        title: 'Erro ao parar Modo Contínuo',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setTogglingContinuous(false)
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
          isContinuousActive
            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700 animate-pulse'
            : pendingCount > 0
              ? 'bg-blue-50/80 hover:bg-blue-100/80 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200 border-blue-300 dark:border-blue-800'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300',
        )}
        title="Auditoria, reenvio dirigido e Modo Contínuo do e-book oficial aos clientes abordados"
      >
        <BookOpen className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        <span className="font-semibold">Reenviar E-book</span>

        {isContinuousActive ? (
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 h-4 font-bold ml-0.5 bg-emerald-600 text-white dark:bg-emerald-500 gap-1"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
            <span>Contínuo ATIVO</span>
          </Badge>
        ) : (
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
        )}
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

          {/* Banner do MODO CONTÍNUO (ativo ou pronto) */}
          <div
            className={cn(
              'p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 transition-all',
              isContinuousActive
                ? 'bg-emerald-50/90 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800'
                : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800',
            )}
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    isContinuousActive ? 'bg-emerald-500 animate-ping' : 'bg-slate-400',
                  )}
                />
                <strong
                  className={cn(
                    'text-xs font-semibold',
                    isContinuousActive
                      ? 'text-emerald-900 dark:text-emerald-200'
                      : 'text-slate-900 dark:text-slate-100',
                  )}
                >
                  {isContinuousActive
                    ? `Contínuo ATIVO — próximo lote em ${
                        minutesUntilNext !== null ? `${minutesUntilNext} min` : 'breve'
                      } (restam ${pendingCount})`
                    : 'Modo Contínuo Disponível'}
                </strong>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {isContinuousActive
                  ? 'Disparando automaticamente 15 mensagens a cada 15 min na janela 8h-18h (seg a sáb). Para quando zerar pendentes, pausar régua ou clicar em Parar.'
                  : 'Automatiza o envio de 15 em 15 minutos sem precisar clicar manualmente a cada lote.'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isContinuousActive ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleStopContinuous}
                  disabled={togglingContinuous}
                  className="h-7 text-xs px-3 gap-1 shadow-xs"
                >
                  {togglingContinuous ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Square className="h-3 w-3 fill-current" />
                  )}
                  <span>Parar</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleStartContinuousClick}
                  disabled={
                    togglingContinuous || pendingCount === 0 || !reguaIsActive || sendingBatch
                  }
                  className="h-7 text-xs px-3 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  {togglingContinuous ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3 fill-current" />
                  )}
                  <span>Disparo Contínuo</span>
                </Button>
              )}
            </div>
          </div>

          {!reguaIsActive && (
            <div className="p-2.5 rounded border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                <strong>Atenção:</strong> A régua geral de automações está pausada manualmente via{' '}
                <code>app_controls</code>. Os disparos (manuais ou contínuos) respeitam essa trava e
                permanecem suspensos até que a régua seja retomada.
              </span>
            </div>
          )}

          {/* Cards com Métricas da Auditoria Exata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1">
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

          {/* Aviso dedicado de NÚMEROS INVÁLIDOS / CORROMPIDOS (Item 2) */}
          {invalidCount > 0 && (
            <div className="border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 rounded-lg p-2.5 text-xs text-rose-900 dark:text-rose-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PhoneOff className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>
                    <strong>Números inválidos: {invalidCount}</strong> — excluídos dos pendentes
                    para proteger a Meta API e não falhar envios.
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInvalidList(!showInvalidList)}
                  className="h-6 text-[11px] px-2 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 gap-1"
                >
                  <span>{showInvalidList ? 'Ocultar' : 'Ver motivos'}</span>
                  {showInvalidList ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              </div>

              {showInvalidList && (
                <div className="mt-2 pt-2 border-t border-rose-200 dark:border-rose-900/40 max-h-36 overflow-y-auto space-y-1 divide-y divide-rose-100 dark:divide-rose-900/30">
                  {auditData?.invalid_phones?.map((inv) => (
                    <div
                      key={inv.id}
                      className="pt-1 first:pt-0 flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <span className="font-semibold">{inv.name}</span>{' '}
                        <code className="text-[10px] bg-rose-100 dark:bg-rose-900/60 px-1 py-0.2 rounded text-rose-800 dark:text-rose-300">
                          {inv.raw_phone}
                        </code>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 border-rose-300 text-rose-700 shrink-0"
                      >
                        {inv.reason}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
                    <strong>Anti-flood:</strong> envia até 15 por ciclo, com intervalo &gt;= 15 min.
                  </li>
                  <li>
                    <strong>Validação estrita de telefone:</strong> descarta duplicações e números
                    compridos (&gt; 13 dígitos) para nunca tomar erro #131009 da Meta.
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

            <div className="border rounded-lg max-h-40 overflow-y-auto divide-y text-xs bg-white dark:bg-slate-950">
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

Como você já demonstrou interesse em oportunidades imobiliárias por aqui, tomei a liberdade de te apresentar esta novidade do Vistage Residence Barreiros - AJ Coelho em Barreiros, São José/SC (Grande Florianópolis):

📄 *Material oficial: Vistage Residence*
${auditData?.book_link || 'https://drive.google.com/file/d/1w9GadvkqN4aILCYfcg_6-tN6qFbcsCeG/view?usp=sharing'}

Faz sentido para você conhecer mais detalhes das opções de 2 ou 3 dormitórios?`}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t flex flex-col sm:flex-row sm:justify-between items-center">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-xs"
              >
                Fechar
              </Button>

              {/* Botão de Disparo Contínuo no Footer */}
              {isContinuousActive ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleStopContinuous}
                  disabled={togglingContinuous}
                  className="text-xs gap-1"
                >
                  <Square className="h-3 w-3 fill-current" />
                  <span>Parar Modo Contínuo</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStartContinuousClick}
                  disabled={togglingContinuous || pendingCount === 0 || !reguaIsActive}
                  className="text-xs gap-1 border-emerald-400 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                >
                  <Play className="h-3 w-3 fill-current text-emerald-600" />
                  <span>Iniciar Contínuo</span>
                </Button>
              )}
            </div>

            {/* Botão de Disparo Manual de 1 Lote */}
            <Button
              size="sm"
              onClick={handleTriggerSendClick}
              disabled={
                pendingCount === 0 ||
                loadingAudit ||
                sendingBatch ||
                isContinuousActive ||
                !reguaIsActive
              }
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 font-medium shadow-xs w-full sm:w-auto"
              title={
                isContinuousActive
                  ? 'Modo Contínuo está ativo (disparos ocorrem automaticamente)'
                  : undefined
              }
            >
              {sendingBatch ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>
                {sendingBatch
                  ? 'Enviando Lote...'
                  : `Disparar Reenvio Manual (${Math.min(pendingCount, 15)} clientes)`}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação do MODO CONTÍNUO */}
      <Dialog open={confirmContinuousOpen} onOpenChange={setConfirmContinuousOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Play className="h-5 w-5 text-emerald-600" />
              <span>Ativar Disparo Contínuo</span>
            </DialogTitle>
            <DialogDescription className="text-xs pt-1.5 space-y-2">
              <p>
                O Modo Contínuo irá disparar{' '}
                <strong className="text-slate-900 dark:text-slate-100">
                  1 lote de 15 clientes imediatamente
                </strong>{' '}
                e automaticamente programará os próximos lotes de 15 a cada{' '}
                <strong className="text-slate-900 dark:text-slate-100">15 minutos</strong>.
              </p>
              <div className="bg-slate-50 dark:bg-slate-900 border rounded p-2 space-y-1 text-[11px]">
                <p>
                  <strong>Regras do Modo Contínuo:</strong>
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                  <li>Envia na janela comercial das 8h às 18h horário de Brasília (seg a sáb).</li>
                  <li>
                    Fora da janela ou aos domingos, aguarda automaticamente as 8h do próximo dia
                    útil.
                  </li>
                  <li>Para automaticamente quando os pendentes chegarem a 0.</li>
                  <li>Para se a régua for pausada ou se você clicar no botão &quot;Parar&quot;.</li>
                  <li>
                    Anti-flood rigoroso mantido (máx 15 por lote com &gt;= 15 min de intervalo).
                  </li>
                </ul>
              </div>

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
                    <span>Desejo disparar o 1º lote mesmo fora do horário comercial</span>
                  </label>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmContinuousOpen(false)}
              disabled={togglingContinuous}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmStartContinuous}
              disabled={togglingContinuous || (!isCommercialWindow && !forceOutsideWindow)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-medium"
            >
              {togglingContinuous ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current mr-1" />
              )}
              <span>{togglingContinuous ? 'Ativando...' : 'Iniciar Modo Contínuo'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação Final do Disparo Manual */}
      <Dialog open={confirmSendOpen} onOpenChange={setConfirmSendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span>Confirmar Disparo Manual do Lote</span>
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

      {/* Indicador de envio fixo global enquanto lote manual está sendo processado */}
      {sendingBatch && (
        <div className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
          <div className="text-xs">
            <p className="font-semibold">Disparando lote de e-book...</p>
            <p className="text-blue-100 text-[11px]">
              Enviando mensagens via WhatsApp Cloud API...
            </p>
          </div>
        </div>
      )}
    </>
  )
}
