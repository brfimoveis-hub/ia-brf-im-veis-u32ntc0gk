import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getLocalWhatsAppTemplates, WhatsAppTemplate } from '@/services/whatsapp_templates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  MessageSquare,
  Sparkles,
  Info,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Send,
  HelpCircle,
  Layers,
  Clock,
  Play,
  Pause,
  StopCircle,
} from 'lucide-react'
import {
  sendWhatsAppCampaign,
  SendWhatsAppCampaignResponse,
  executeNextBatch,
  updateCampaignStatus,
} from '@/services/whatsapp_campaigns'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'

interface WhatsAppCampaignComposerProps {
  selectedCount: number
  selectedCustomerIds: string[]
  hasWhatsAppCredentials: boolean
  hasCapiCredentials: boolean
  initialTemplateName?: string
  onSuccess?: (result: SendWhatsAppCampaignResponse) => void
}

const VARIABLE_TAGS = [
  { label: '{{nome}}', desc: 'Nome completo do contato' },
  { label: '{{primeiro_nome}}', desc: 'Primeiro nome' },
  { label: '{{imovel_interesse}}', desc: 'Imóvel / bairro de interesse' },
  { label: '{{corretor}}', desc: 'Nome da imobiliária / corretor' },
]

export function WhatsAppCampaignComposer({
  selectedCount,
  selectedCustomerIds,
  hasWhatsAppCredentials,
  hasCapiCredentials,
  initialTemplateName = '',
  onSuccess,
}: WhatsAppCampaignComposerProps) {
  const { toast } = useToast()

  const [campaignName, setCampaignName] = useState('')
  const [segmentName, setSegmentName] = useState('')
  const [message, setMessage] = useState(
    'Olá {{primeiro_nome}}! Aqui é a Bia, da BRF Imóveis. Ainda temos excelentes unidades de 2 dormitórios com suíte no Villa dos Açores, que você mostrou interesse. Podemos conversar rapidinho?',
  )
  const [templateName, setTemplateName] = useState(initialTemplateName)
  const [templateLang, setTemplateLang] = useState('pt_BR')
  const [allTemplates, setAllTemplates] = useState<WhatsAppTemplate[]>([])
  const [selectedTemplateOption, setSelectedTemplateOption] = useState<string>('none')
  const [syncWithCapi, setSyncWithCapi] = useState(true)

  // Configurações de lote e cadência
  const [batchSize, setBatchSize] = useState<number>(50)
  const [batchIntervalMinutes, setBatchIntervalMinutes] = useState<number>(5)

  // Estado de execução da campanha ativa
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null)
  const [activeCampaignStatus, setActiveCampaignStatus] = useState<
    'draft' | 'sending' | 'paused' | 'completed' | 'failed' | 'stopped' | null
  >(null)
  const [campaignProgress, setCampaignProgress] = useState<{
    totalRecipients: number
    sentCount: number
    requiresTemplateCount: number
    failedCount: number
    currentBatch: number
    totalBatches: number
    nextBatchAt?: string
    isFinished: boolean
  } | null>(null)
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (initialTemplateName) {
      setTemplateName(initialTemplateName)
      setSelectedTemplateOption(initialTemplateName)
    }
  }, [initialTemplateName])

  useEffect(() => {
    getLocalWhatsAppTemplates()
      .then((tpls) => {
        setAllTemplates(tpls)
        if (initialTemplateName) {
          const found = tpls.find((t) => t.name === initialTemplateName)
          if (found) {
            setSelectedTemplateOption(found.name)
            if (found.language) setTemplateLang(found.language)
            if (found.body_text) setMessage(found.body_text)
          } else {
            setSelectedTemplateOption(initialTemplateName)
          }
        }
      })
      .catch(() => {})
  }, [initialTemplateName])

  const handleTemplateSelectChange = (val: string) => {
    setSelectedTemplateOption(val)
    if (val === 'none') {
      setTemplateName('')
    } else if (val === 'custom') {
      // Manual
    } else {
      setTemplateName(val)
      const found = allTemplates.find((t) => t.name === val)
      if (found) {
        if (found.language) setTemplateLang(found.language)
        if (found.body_text) {
          setMessage(found.body_text)
        }
      }
    }
  }

  const insertVariable = (tag: string) => {
    setMessage((prev) => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + tag + ' ')
  }

  const handleStartCampaign = async () => {
    setConfirmOpen(false)
    if (selectedCustomerIds.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhum contato selecionado',
        description: 'Selecione pelo menos um contato na tabela para disparar a campanha.',
      })
      return
    }

    if (!message.trim() && !templateName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Mensagem obrigatória',
        description: 'Digite o texto da mensagem ou informe o nome do modelo aprovado.',
      })
      return
    }

    setIsSending(true)
    setLastErrorMessage(null)

    const sanitizedBatchSize = Math.max(1, Math.min(200, Number(batchSize) || 50))
    const sanitizedInterval = Math.max(0, Math.min(120, Number(batchIntervalMinutes) || 5))

    try {
      const res = await sendWhatsAppCampaign({
        name:
          campaignName.trim() || `Campanha WhatsApp - ${new Date().toLocaleDateString('pt-BR')}`,
        segment: segmentName.trim() || 'Remarketing Geral',
        message: message.trim(),
        template_name: templateName.trim() || undefined,
        template_language: templateLang.trim() || 'pt_BR',
        customer_ids: selectedCustomerIds,
        sync_meta_capi: syncWithCapi && hasCapiCredentials,
        batch_size: sanitizedBatchSize,
        batch_interval_minutes: sanitizedInterval,
      })

      setActiveCampaignId(res.campaign_id)
      const camp = res.campaign
      const batch = res.batch

      const total = camp?.total_recipients ?? selectedCustomerIds.length
      const sent = camp?.sent_count ?? batch?.sent ?? res.sent ?? 0
      const reqTpl =
        camp?.requires_template_count ?? batch?.requires_template ?? res.requires_template ?? 0
      const failed = camp?.failed_count ?? batch?.failed ?? res.failed ?? 0
      const currBatch = camp?.current_batch ?? batch?.batch_number ?? 1
      const totalB =
        camp?.total_batches ?? batch?.total_batches ?? Math.ceil(total / sanitizedBatchSize)
      const nextBatch = camp?.next_batch_at ?? batch?.next_batch_at
      const finished =
        (batch?.is_finished ?? sent + reqTpl + failed >= total) || camp?.status === 'completed'

      setActiveCampaignStatus(finished ? 'completed' : 'sending')
      setCampaignProgress({
        totalRecipients: total,
        sentCount: sent,
        requiresTemplateCount: reqTpl,
        failedCount: failed,
        currentBatch: currBatch,
        totalBatches: totalB,
        nextBatchAt: nextBatch,
        isFinished: finished,
      })

      if (finished) {
        toast({
          title: 'Campanha concluída!',
          description: `${sent} enviadas com sucesso, ${reqTpl} fora da janela de 24h, ${failed} falhas.`,
        })
      } else {
        toast({
          title: `Lote 1 de ${totalB} enviado com sucesso!`,
          description: `${sent} enviadas agora. O próximo lote de ${sanitizedBatchSize} será disparado automaticamente em ${sanitizedInterval} min ou você pode clicar em "Enviar Próximo Lote Agora".`,
        })
      }

      if (onSuccess) onSuccess(res)
    } catch (err: unknown) {
      const readableError = getErrorMessage(err)
      setLastErrorMessage(readableError)
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar campanha',
        description: readableError || 'Falha na comunicação com o servidor.',
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleTriggerNextBatchManually = async () => {
    if (!activeCampaignId) return
    setIsSending(true)
    setLastErrorMessage(null)
    try {
      const res = await executeNextBatch(activeCampaignId)
      const b = res.batch_result
      if (b) {
        const isFin = b.is_finished || b.remaining === 0
        setActiveCampaignStatus(isFin ? 'completed' : 'sending')
        setCampaignProgress((prev) => {
          if (!prev) return null
          return {
            ...prev,
            sentCount: b.total_sent ?? prev.sentCount + b.sent,
            failedCount: b.total_failed ?? prev.failedCount + b.failed,
            requiresTemplateCount:
              b.total_requires_template ?? prev.requiresTemplateCount + b.requires_template,
            currentBatch: b.current_batch ?? b.batch_number ?? prev.currentBatch,
            nextBatchAt: b.next_batch_at,
            isFinished: isFin,
          }
        })
        toast({
          title: isFin ? 'Campanha finalizada!' : `Lote ${b.current_batch} processado!`,
          description: `${b.sent} enviadas neste lote. ${b.remaining} contatos restantes.`,
        })
      }
    } catch (err: unknown) {
      const readableError = getErrorMessage(err)
      setLastErrorMessage(readableError)
      toast({
        variant: 'destructive',
        title: 'Erro ao processar lote',
        description: readableError || 'Não foi possível avançar para o próximo lote.',
      })
    } finally {
      setIsSending(false)
    }
  }

  const handlePauseResumeCampaign = async (newStatus: 'paused' | 'sending') => {
    if (!activeCampaignId) return
    setIsSending(true)
    try {
      await updateCampaignStatus(activeCampaignId, newStatus)
      setActiveCampaignStatus(newStatus)
      toast({
        title: newStatus === 'paused' ? 'Campanha pausada' : 'Campanha retomada',
        description:
          newStatus === 'paused'
            ? 'Os envios automáticos foram pausados. Você pode retomar quando desejar.'
            : 'Envios retomados. O próximo lote será agendado em instantes.',
      })
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar status',
        description: getErrorMessage(err),
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleStopCampaign = async () => {
    if (!activeCampaignId) return
    setIsSending(true)
    try {
      await updateCampaignStatus(activeCampaignId, 'stopped')
      setActiveCampaignStatus('stopped')
      setCampaignProgress((prev) => (prev ? { ...prev, isFinished: true } : null))
      toast({
        title: 'Campanha interrompida',
        description: 'Os contatos pendentes foram cancelados.',
      })
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Erro ao parar campanha',
        description: getErrorMessage(err),
      })
    } finally {
      setIsSending(false)
    }
  }

  const totalCalculatedBatches = Math.max(
    1,
    Math.ceil(selectedCount / Math.max(1, Number(batchSize) || 50)),
  )

  const progressPercent = campaignProgress
    ? Math.min(
        100,
        Math.round(
          ((campaignProgress.sentCount +
            campaignProgress.failedCount +
            campaignProgress.requiresTemplateCount) /
            Math.max(1, campaignProgress.totalRecipients)) *
            100,
        ),
      )
    : 0

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              Disparar Campanha de Remarketing WhatsApp
            </CardTitle>
            <CardDescription>
              Envio sequenciado em lotes controlados com proteção anti-bloqueio Meta e feedback em
              tempo real.
            </CardDescription>
          </div>
          <Badge
            variant={selectedCount > 0 ? 'default' : 'secondary'}
            className="self-start sm:self-auto text-sm px-3 py-1"
          >
            {selectedCount} contato(s) selecionado(s)
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="camp-name">Nome da Campanha</Label>
            <Input
              id="camp-name"
              placeholder="Ex: Villa dos Açores - Oferta Especial"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              disabled={isSending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="camp-seg">Segmento / Filtro</Label>
            <Input
              id="camp-seg"
              placeholder="Ex: Interessados Villa dos Açores / Investidores"
              value={segmentName}
              onChange={(e) => setSegmentName(e.target.value)}
              disabled={isSending}
            />
          </div>
        </div>

        {/* CONTROLE DE LOTE E RITMO */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-semibold text-sm flex items-center gap-2 text-foreground">
              <Layers className="h-4 w-4 text-primary" />
              <span>Controle de Ritmo e Tamanho de Lote</span>
              <Badge variant="outline" className="text-[11px] font-normal">
                Sequenciado em lotes
              </Badge>
            </Label>
            <span className="text-xs text-muted-foreground">
              Prevenção de sobrecarga na Cloud API
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="batch-size" className="text-xs font-medium">
                  Tamanho do Lote (por disparo)
                </Label>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Padrão: 50 contatos
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="batch-size"
                  type="number"
                  min={1}
                  max={200}
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  disabled={isSending}
                  className="h-9 font-medium"
                />
                <span className="text-xs text-muted-foreground shrink-0">contatos</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Total estimado: <strong>{totalCalculatedBatches} lote(s)</strong> para os{' '}
                {selectedCount} contatos.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="batch-interval" className="text-xs font-medium">
                  Intervalo entre Lotes (minutos)
                </Label>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Recomendado: 5 a 10 min
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="batch-interval"
                  type="number"
                  min={0}
                  max={120}
                  value={batchIntervalMinutes}
                  onChange={(e) => setBatchIntervalMinutes(Number(e.target.value))}
                  disabled={isSending}
                  className="h-9 font-medium"
                />
                <span className="text-xs text-muted-foreground shrink-0">minutos</span>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Disparo suave que evita restrições de rajada na Meta.
              </p>
            </div>
          </div>
        </div>

        {/* Editor de mensagem */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="msg-body" className="font-semibold flex items-center gap-1.5">
              <span>Texto da Mensagem (WhatsApp)</span>
              <span className="text-xs font-normal text-muted-foreground">
                ({message.length} caracteres)
              </span>
            </Label>
            <span className="text-xs text-muted-foreground">Variáveis disponíveis:</span>
          </div>

          {/* Variáveis dinâmicas */}
          <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 p-2 rounded-md border text-xs">
            <span className="text-muted-foreground flex items-center gap-1 mr-1">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Clique para inserir:
            </span>
            {VARIABLE_TAGS.map((tag) => (
              <Button
                key={tag.label}
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs font-mono bg-background hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={() => insertVariable(tag.label)}
                title={tag.desc}
                disabled={isSending}
              >
                {tag.label}
              </Button>
            ))}
          </div>

          <Textarea
            id="msg-body"
            rows={4}
            placeholder="Digite a mensagem que a Bia enviará para os contatos..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isSending}
            className="font-sans leading-relaxed"
          />
        </div>

        {/* Regra de Janela de 24h & Template */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50 p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs sm:text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-200">
                Regra da Janela de 24h da Meta (WhatsApp Business)
              </p>
              <p className="text-amber-800 dark:text-amber-300/90 text-xs">
                Contatos fora da janela de 24h recebem com o modelo pré-aprovado pela Meta (exemplo:{' '}
                <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded font-mono text-[11px]">
                  villa_dos_acores
                </code>
                ). Falhas por contato não travam os demais clientes do lote.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-foreground font-medium flex items-center gap-1.5">
                  <span>Selecionar Modelo da Meta</span>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className="text-[10px] text-green-700 bg-green-50 border-green-200"
                    >
                      {
                        allTemplates.filter((t) => (t.status || '').toUpperCase() === 'APPROVED')
                          .length
                      }{' '}
                      aprovado(s)
                    </Badge>
                    {allTemplates.some((t) => (t.status || '').toUpperCase() === 'PENDING') && (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-amber-700 bg-amber-50 border-amber-200"
                      >
                        {
                          allTemplates.filter((t) => (t.status || '').toUpperCase() === 'PENDING')
                            .length
                        }{' '}
                        em análise
                      </Badge>
                    )}
                  </div>
                </Label>
                <span className="text-[11px] text-muted-foreground">Aba "Modelos"</span>
              </div>

              <Select
                value={selectedTemplateOption}
                onValueChange={handleTemplateSelectChange}
                disabled={isSending}
              >
                <SelectTrigger className="text-xs h-9 bg-background">
                  <SelectValue placeholder="Selecione um modelo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    Nenhum modelo (Apenas contatos dentro de 24h)
                  </SelectItem>
                  {allTemplates.map((t) => {
                    const statusUpper = (t.status || '').toUpperCase()
                    const icon =
                      statusUpper === 'APPROVED' ? '✅' : statusUpper === 'PENDING' ? '⏳' : '⚠️'
                    const labelStatus =
                      statusUpper === 'APPROVED'
                        ? 'Aprovado'
                        : statusUpper === 'PENDING'
                          ? 'Em análise'
                          : t.status
                    return (
                      <SelectItem key={t.id} value={t.name}>
                        {icon} {t.name} ({labelStatus} — {t.language})
                      </SelectItem>
                    )
                  })}
                  <SelectItem value="custom">Outro modelo (digitar manualmente)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="tpl-name" className="text-xs text-foreground font-medium">
                  Identificador do Modelo (Slug Meta)
                </Label>
                <Input
                  id="tpl-name"
                  placeholder="Ex: villa_dos_acores"
                  value={templateName}
                  onChange={(e) => {
                    setTemplateName(e.target.value)
                    if (
                      selectedTemplateOption !== 'custom' &&
                      selectedTemplateOption !== e.target.value
                    ) {
                      setSelectedTemplateOption('custom')
                    }
                  }}
                  disabled={isSending}
                  className="text-xs h-8 bg-background font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-lang" className="text-xs text-foreground font-medium">
                  Idioma do Modelo
                </Label>
                <Input
                  id="tpl-lang"
                  placeholder="pt_BR"
                  value={templateLang}
                  onChange={(e) => setTemplateLang(e.target.value)}
                  disabled={isSending}
                  className="text-xs h-8 bg-background"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Integração com Meta CAPI conjugada */}
        <div className="flex items-start space-x-3 rounded-lg border p-3.5 bg-muted/20">
          <Checkbox
            id="sync-capi"
            checked={syncWithCapi}
            onCheckedChange={(checked) => setSyncWithCapi(Boolean(checked))}
            disabled={isSending || !hasCapiCredentials}
            className="mt-0.5"
          />
          <div className="space-y-1 leading-none">
            <label
              htmlFor="sync-capi"
              className="text-sm font-medium cursor-pointer flex items-center gap-1.5 text-foreground"
            >
              <span>Sincronizar audiência com a Meta via CAPI em conjunto</span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200"
              >
                Remarketing Conjugado
              </Badge>
            </label>
            <p className="text-xs text-muted-foreground">
              Envia hash SHA-256 de telefone/email para a Conversions API (evento Lead) a cada lote
              processado com sucesso.
            </p>
          </div>
        </div>

        {/* Alerta de erro legível se houver */}
        {lastErrorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-900 text-xs sm:text-sm space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <span>Falha no envio da campanha</span>
            </div>
            <p className="text-red-800 text-xs pl-5 leading-relaxed">{lastErrorMessage}</p>
          </div>
        )}

        {/* Alerta de credenciais se faltar */}
        {!hasWhatsAppCredentials && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
            <span>
              WhatsApp Cloud API não está configurada no seu usuário. Acesse Conexões para vincular
              seu Phone Number ID e Access Token.
            </span>
          </div>
        )}

        {/* PAINEL DE CONTROLE DE CAMPANHA ATIVA / ACOMPANHAMENTO DE PROGRESSO */}
        {campaignProgress && (
          <div className="p-4 bg-muted/40 border rounded-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Progresso da Campanha Sequenciada
                  <Badge
                    variant={
                      activeCampaignStatus === 'completed'
                        ? 'default'
                        : activeCampaignStatus === 'paused'
                          ? 'secondary'
                          : activeCampaignStatus === 'stopped'
                            ? 'destructive'
                            : 'outline'
                    }
                    className="text-[11px]"
                  >
                    {activeCampaignStatus === 'completed'
                      ? 'Concluída'
                      : activeCampaignStatus === 'paused'
                        ? 'Pausada'
                        : activeCampaignStatus === 'stopped'
                          ? 'Interrompida'
                          : 'Em Andamento'}
                  </Badge>
                </h4>
                <p className="text-xs text-muted-foreground">
                  Lote {campaignProgress.currentBatch} de {campaignProgress.totalBatches} • Enviados{' '}
                  {campaignProgress.sentCount} de {campaignProgress.totalRecipients} contatos (
                  {progressPercent}%)
                </p>
              </div>

              {/* Botões de Ação para Pausar / Retomar / Parar / Avançar */}
              <div className="flex flex-wrap items-center gap-2">
                {activeCampaignStatus === 'sending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1 border-amber-300 hover:bg-amber-50"
                    onClick={() => handlePauseResumeCampaign('paused')}
                    disabled={isSending}
                  >
                    <Pause className="h-3.5 w-3.5 text-amber-600" /> Pausar
                  </Button>
                )}

                {activeCampaignStatus === 'paused' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1 border-green-300 hover:bg-green-50"
                    onClick={() => handlePauseResumeCampaign('sending')}
                    disabled={isSending}
                  >
                    <Play className="h-3.5 w-3.5 text-green-600" /> Retomar
                  </Button>
                )}

                {!campaignProgress.isFinished && activeCampaignStatus !== 'stopped' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      onClick={handleTriggerNextBatchManually}
                      disabled={isSending}
                    >
                      {isSending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5 text-primary" />
                      )}
                      Enviar Próximo Lote Agora
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={handleStopCampaign}
                      disabled={isSending}
                    >
                      <StopCircle className="h-3.5 w-3.5" /> Parar
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progresso geral de entrega</span>
                <span>{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2.5" />
            </div>

            {/* Cartões de Contadores */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-900/40">
                <div className="text-xl font-bold text-green-700 dark:text-green-400">
                  {campaignProgress.sentCount}
                </div>
                <div className="text-green-600 dark:text-green-300 text-[11px] font-medium">
                  Enviados com Sucesso
                </div>
              </div>

              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-900/40">
                <div className="text-xl font-bold text-amber-700 dark:text-amber-400">
                  {campaignProgress.requiresTemplateCount}
                </div>
                <div className="text-amber-600 dark:text-amber-300 text-[11px] font-medium">
                  Requerem Template (24h)
                </div>
              </div>

              <div className="p-2.5 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-900/40">
                <div className="text-xl font-bold text-red-700 dark:text-red-400">
                  {campaignProgress.failedCount}
                </div>
                <div className="text-red-600 dark:text-red-300 text-[11px] font-medium">
                  Falhas no Envio
                </div>
              </div>

              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-900/40">
                <div className="text-xl font-bold text-blue-700 dark:text-blue-400">
                  {Math.max(
                    0,
                    campaignProgress.totalRecipients -
                      campaignProgress.sentCount -
                      campaignProgress.failedCount -
                      campaignProgress.requiresTemplateCount,
                  )}
                </div>
                <div className="text-blue-600 dark:text-blue-300 text-[11px] font-medium">
                  Aguardando Próximo Lote
                </div>
              </div>
            </div>

            {campaignProgress.nextBatchAt && !campaignProgress.isFinished && (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>
                  Próximo lote programado para:{' '}
                  <strong>
                    {new Date(campaignProgress.nextBatchAt).toLocaleTimeString('pt-BR')}
                  </strong>{' '}
                  (automático via agendador ou clique para disparar agora)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Botão de Disparo Inicial */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>
              Disparo sequenciado em lotes de {batchSize} a cada {batchIntervalMinutes} min com
              pausa/retomada.
            </span>
          </div>

          <Button
            size="lg"
            className="w-full sm:w-auto gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm font-semibold"
            disabled={
              selectedCount === 0 ||
              isSending ||
              !hasWhatsAppCredentials ||
              (!message.trim() && !templateName.trim())
            }
            onClick={() => setConfirmOpen(true)}
          >
            {isSending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processando Lote...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Iniciar Campanha ({selectedCount} contatos em {totalCalculatedBatches} lote
                {totalCalculatedBatches > 1 ? 's' : ''})
              </>
            )}
          </Button>
        </div>
      </CardContent>

      {/* Confirmação de envio */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Envio da Campanha de Remarketing</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-2">
              <p>
                Você está prestes a iniciar o envio para <strong>{selectedCount} contato(s)</strong>{' '}
                através do WhatsApp da Bia (+55 48 9209-8050).
              </p>
              <p className="text-xs bg-muted p-2 rounded">
                ⚙️ O envio será realizado em <strong>{totalCalculatedBatches} lote(s)</strong> de
                até <strong>{batchSize} contatos</strong> com intervalo de{' '}
                <strong>{batchIntervalMinutes} minutos</strong> entre eles para proteção da sua
                linha e da conta na Meta.
              </p>
              {syncWithCapi && hasCapiCredentials && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  ✓ Os dados também serão sincronizados via Meta CAPI (evento Lead) para alimentar
                  as audiências de remarketing simultaneamente.
                </p>
              )}
              {!templateName && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Contatos fora da janela de 24h serão identificados e marcados com segurança
                  como "requer template", sem gerar cobrança indevida ou bloqueio da conta Meta.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleStartCampaign}
            >
              Confirmar e Iniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
