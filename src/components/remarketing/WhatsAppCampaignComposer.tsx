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
} from 'lucide-react'
import { sendWhatsAppCampaign, SendWhatsAppCampaignResponse } from '@/services/whatsapp_campaigns'
import { useToast } from '@/hooks/use-toast'

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
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [lastResult, setLastResult] = useState<SendWhatsAppCampaignResponse | null>(null)

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
      // Deixa o usuário digitar manualmente no campo abaixo
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
    setLastResult(null)

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
      })

      setLastResult(res)
      toast({
        title: 'Campanha processada!',
        description: `${res.sent} mensagens enviadas, ${res.requires_template} contatos fora da janela (requerem template), ${res.failed} falhas.`,
      })
      if (onSuccess) onSuccess(res)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar campanha',
        description: err.message || 'Falha na comunicação com o servidor.',
      })
    } finally {
      setIsSending(false)
    }
  }

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
              Escreva a mensagem personalizada com variáveis para enviar aos números selecionados
              via Bia (WhatsApp Cloud API da BRF Imóveis).
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
                Mensagens de texto livre só são entregues pela Meta para contatos que interagiram
                nas últimas 24h. Para contatos fora da janela, a Meta exige o uso de um{' '}
                <strong>modelo pré-aprovado (template)</strong>. Se você não informar um template
                abaixo, contatos fora da janela serão marcados com segurança como{' '}
                <em>"requer template"</em> sem interromper os demais envios do lote.
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
                <span className="text-[11px] text-muted-foreground">Gerencie na aba "Modelos"</span>
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
                  <SelectItem value="custom">Outro modelo (digitar nome manualmente)</SelectItem>
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
              Envia hash SHA-256 de telefone/email para a Conversions API (evento Lead), garantindo
              que a Meta entenda que você está fazendo remarketing para clientes capturados
              anteriormente.
            </p>
          </div>
        </div>

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

        {/* Barra de progresso se enviando */}
        {isSending && (
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg border animate-pulse">
            <div className="flex justify-between text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Processando disparos via WhatsApp Cloud API e CAPI...
              </span>
              <span>Em andamento</span>
            </div>
            <Progress value={65} className="h-2" />
          </div>
        )}

        {/* Resumo do último resultado */}
        {lastResult && (
          <div className="p-4 bg-background border rounded-lg space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Resultado da Campanha
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 bg-green-50 rounded border border-green-200">
                <div className="text-lg font-bold text-green-700">{lastResult.sent}</div>
                <div className="text-green-600 font-medium">Enviados</div>
              </div>
              <div className="p-2 bg-amber-50 rounded border border-amber-200">
                <div className="text-lg font-bold text-amber-700">
                  {lastResult.requires_template}
                </div>
                <div className="text-amber-600 font-medium">Requer Template</div>
              </div>
              <div className="p-2 bg-red-50 rounded border border-red-200">
                <div className="text-lg font-bold text-red-700">{lastResult.failed}</div>
                <div className="text-red-600 font-medium">Falhas</div>
              </div>
              <div className="p-2 bg-blue-50 rounded border border-blue-200">
                <div className="text-lg font-bold text-blue-700">{lastResult.capi_synced}</div>
                <div className="text-blue-600 font-medium">Sinc. Meta CAPI</div>
              </div>
            </div>
          </div>
        )}

        {/* Botão de Disparo */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Processamento com intervalo anti-rate limit e logs individuais</span>
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
                Disparando Campanha...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Enviar Campanha WhatsApp ({selectedCount})
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
                Você está prestes a enviar mensagens para{' '}
                <strong>{selectedCount} contato(s)</strong> através do WhatsApp da Bia (+55 48
                9209-8050).
              </p>
              {syncWithCapi && hasCapiCredentials && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  ✓ Os dados também serão sincronizados via Meta CAPI (evento Lead) para alimentar
                  as audiências de remarketing da Meta simultaneamente.
                </p>
              )}
              {!templateName && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Contatos fora da janela de 24h serão identificados e marcados como "requer
                  template", sem gerar cobrança indevida ou bloqueio da conta Meta.
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
              Confirmar e Disparar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
