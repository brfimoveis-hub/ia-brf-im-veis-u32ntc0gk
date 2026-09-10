import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Send,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Info,
  Sparkles,
  FileCheck2,
  Mail,
  Copy,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import {
  WhatsAppTemplate,
  submitTemplateToMeta,
  syncTemplatesWithMeta,
  deleteWhatsAppTemplate,
  getLocalWhatsAppTemplates,
} from '@/services/whatsapp_templates'

interface WhatsAppTemplatesManagerProps {
  hasWhatsAppCredentials?: boolean
  onTemplateSelectedForCampaign?: (templateName: string) => void
}

export function WhatsAppTemplatesManager({
  hasWhatsAppCredentials = true,
  onTemplateSelectedForCampaign,
}: WhatsAppTemplatesManagerProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  // Lista de templates
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Formulário de novo template — pré-preenchido com o pedido exato do Mauro (Villa dos Açores)
  const [name, setName] = useState('villa_dos_acores')
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('MARKETING')
  const [language, setLanguage] = useState('pt_BR')
  const [bodyText, setBodyText] = useState(
    'Olá {{1}}! Aqui é a Bia, da BRF Imóveis. Ainda temos excelentes unidades de 2 dormitórios com suíte no Villa dos Açores, que você mostrou interesse. Podemos conversar rapidinho?',
  )
  const [sampleValue1, setSampleValue1] = useState('Mauro')
  const [quickReplyText, setQuickReplyText] = useState('')

  // Diálogo para exclusão
  const [deleteTarget, setDeleteTarget] = useState<WhatsAppTemplate | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Carregar templates do banco local
  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getLocalWhatsAppTemplates(user?.id)
      setTemplates(data)
    } catch (err: any) {
      console.error('Erro ao carregar templates locais:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // Sincronizar com a Meta
  const handleSync = async (silent = false) => {
    try {
      setIsSyncing(true)
      const res = await syncTemplatesWithMeta()
      if (res.templates) {
        setTemplates(res.templates)
      }
      if (!silent) {
        toast({
          title: 'Templates sincronizados com a Meta',
          description: `${res.templates?.length || 0} modelos verificados ao vivo na Meta Cloud API.`,
        })
      }
    } catch (err: any) {
      if (!silent) {
        toast({
          variant: 'destructive',
          title: 'Erro ao sincronizar com a Meta',
          description: err.message || 'Falha ao consultar a Graph API.',
        })
      }
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    loadTemplates().then(() => {
      // Sincroniza em segundo plano no carregamento da tela se houver credenciais
      if (hasWhatsAppCredentials) {
        handleSync(true)
      }
    })
  }, [loadTemplates, hasWhatsAppCredentials])

  // Sanitiza slug do nome (apenas a-z, 0-9 e sublinhados)
  const handleNameChange = (val: string) => {
    const slug = val
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
    setName(slug)
  }

  // Inserir variável {{1}}
  const insertVariable = (varNum: string) => {
    const varTag = `{{${varNum}}}`
    setBodyText(
      (prev) => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + varTag + ' ',
    )
  }

  // Preencher modelo sugerido
  const loadExampleVilla = () => {
    setName('villa_dos_acores')
    setCategory('MARKETING')
    setLanguage('pt_BR')
    setBodyText(
      'Olá {{1}}! Aqui é a Bia, da BRF Imóveis. Ainda temos excelentes unidades de 2 dormitórios com suíte no Villa dos Açores, que você mostrou interesse. Podemos conversar rapidinho?',
    )
    setSampleValue1('Mauro')
    setQuickReplyText('Quero saber mais')
  }

  // Enviar para aprovação na Meta
  const handleSubmitToMeta = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanName = name.trim().replace(/^_+|_+$/g, '')
    if (!cleanName) {
      toast({
        variant: 'destructive',
        title: 'Nome do modelo obrigatório',
        description: 'Defina um identificador único com letras minúsculas e sublinhados.',
      })
      return
    }

    if (!bodyText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Mensagem obrigatória',
        description: 'Digite o corpo do texto do modelo.',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const buttons = quickReplyText.trim() ? [{ text: quickReplyText.trim().slice(0, 25) }] : []
      const exampleValues = [sampleValue1.trim() || 'Mauro']

      const res = await submitTemplateToMeta({
        name: cleanName,
        category,
        language,
        body_text: bodyText.trim(),
        buttons,
        example_values: exampleValues,
      })

      toast({
        title: res.status === 'APPROVED' ? 'Modelo aprovado na Meta!' : 'Enviado para análise!',
        description: res.message,
      })

      // Recarrega e sincroniza a lista
      await handleSync(true)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na aprovação da Meta',
        description: err.message || 'Falha ao submeter template para a WhatsApp Cloud API.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Deletar template
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteWhatsAppTemplate(deleteTarget.id, deleteTarget.name)
      toast({
        title: 'Modelo removido',
        description: `O modelo "${deleteTarget.name}" foi excluído com sucesso.`,
      })
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir modelo',
        description: err.message || 'Falha ao remover o template.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const renderStatusBadge = (status: string, reason?: string) => {
    const s = (status || '').toUpperCase()
    if (s === 'APPROVED') {
      return (
        <Badge className="bg-green-600 hover:bg-green-700 text-white gap-1 flex items-center">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Aprovado na Meta
        </Badge>
      )
    }
    if (s === 'REJECTED') {
      return (
        <div className="flex flex-col items-start gap-1">
          <Badge variant="destructive" className="gap-1 flex items-center">
            <XCircle className="h-3.5 w-3.5" />
            Reprovado pela Meta
          </Badge>
          {reason && (
            <span className="text-[11px] text-red-600 dark:text-red-400 max-w-xs">{reason}</span>
          )}
        </div>
      )
    }
    if (s === 'PENDING') {
      return (
        <Badge variant="secondary" className="gap-1 flex items-center bg-amber-100 text-amber-800">
          <Clock className="h-3.5 w-3.5 animate-pulse" />
          Em análise pela Meta
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-xs">
        {status || 'Desconhecido'}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Bloco explicativo obrigatório pela regra de negócio */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/50">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs sm:text-sm">
            <p className="font-semibold text-blue-950 dark:text-blue-200">
              Modelos de Mensagem (Templates Oficiais da Meta)
            </p>
            <p className="text-blue-900/90 dark:text-blue-300">
              Modelos são <strong>obrigatórios para contatos fora da janela de 24h</strong>. Após
              enviar para aprovação, a Meta responde em segundos a até 24h (a notificação também é
              enviada por e-mail para <strong>brfimoveis@gmail.com</strong>). Modelos aprovados
              ficam disponíveis imediatamente no seletor da aba <em>Campanhas WhatsApp</em>.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulário de Criação / Submissão */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-primary/20 shadow-sm">
            <form onSubmit={handleSubmitToMeta}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileCheck2 className="h-5 w-5 text-green-600" />
                    Novo Modelo de WhatsApp
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={loadExampleVilla}
                    className="text-xs text-primary hover:text-primary/80 gap-1 h-7 px-2"
                    title="Preencher com o modelo do Villa dos Açores"
                  >
                    <Sparkles className="h-3 w-3" /> Exemplo Villa
                  </Button>
                </div>
                <CardDescription>
                  Submeta o texto para análise da Meta. Use variáveis numeradas {'{{1}}'}, {'{{2}}'}
                  .
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Nome do modelo (slug) */}
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-form-name" className="text-xs font-semibold">
                    Nome do Modelo (Slug Meta)
                  </Label>
                  <Input
                    id="tpl-form-name"
                    placeholder="ex: villa_dos_acores"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    disabled={isSubmitting}
                    className="font-mono text-xs"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Apenas letras minúsculas sem acento, números e sublinhados (_).
                  </p>
                </div>

                {/* Categoria e Idioma */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Categoria</Label>
                    <Select
                      value={category}
                      onValueChange={(val: any) => setCategory(val)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MARKETING">MARKETING (Ofertas/Vendas)</SelectItem>
                        <SelectItem value="UTILITY">UTILITY (Atualizações/Avisos)</SelectItem>
                        <SelectItem value="AUTHENTICATION">AUTHENTICATION (Códigos)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="tpl-form-lang" className="text-xs font-semibold">
                      Idioma
                    </Label>
                    <Input
                      id="tpl-form-lang"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      disabled={isSubmitting}
                      className="text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Corpo da mensagem com variáveis */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tpl-form-body" className="text-xs font-semibold">
                      Corpo da Mensagem
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      {bodyText.length} caracteres
                    </span>
                  </div>

                  {/* Botões para inserir variáveis numeradas */}
                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-muted/40 rounded-md border text-xs">
                    <span className="text-muted-foreground flex items-center gap-1 text-[11px] mr-1">
                      <Plus className="h-3 w-3 text-primary" /> Inserir variável:
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable('1')}
                      className="h-6 px-2 text-xs font-mono bg-background hover:bg-primary/10"
                      title="Variável 1 (ex: Primeiro nome do contato)"
                      disabled={isSubmitting}
                    >
                      {`{{1}}`} (Nome)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable('2')}
                      className="h-6 px-2 text-xs font-mono bg-background hover:bg-primary/10"
                      title="Variável 2 (ex: Bairro ou Empreendimento)"
                      disabled={isSubmitting}
                    >
                      {`{{2}}`} (Empreendimento)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable('3')}
                      className="h-6 px-2 text-xs font-mono bg-background hover:bg-primary/10"
                      title="Variável 3 (ex: Nome do corretor)"
                      disabled={isSubmitting}
                    >
                      {`{{3}}`} (Corretor)
                    </Button>
                  </div>

                  <Textarea
                    id="tpl-form-body"
                    rows={5}
                    placeholder="Olá {{1}}! Aqui é a Bia da BRF Imóveis..."
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    disabled={isSubmitting}
                    className="text-xs leading-relaxed"
                    required
                  />
                </div>

                {/* Exemplo de preenchimento da variável {{1}} (exigido pela Meta) */}
                {bodyText.includes('{{1}}') && (
                  <div className="space-y-1.5 p-2.5 bg-muted/30 rounded border text-xs">
                    <Label
                      htmlFor="sample-val-1"
                      className="text-[11px] font-medium text-foreground"
                    >
                      Exemplo para variável {`{{1}}`} (Exigido pela Meta na análise):
                    </Label>
                    <Input
                      id="sample-val-1"
                      placeholder="Ex: Mauro"
                      value={sampleValue1}
                      onChange={(e) => setSampleValue1(e.target.value)}
                      disabled={isSubmitting}
                      className="text-xs h-7"
                    />
                  </div>
                )}

                {/* Botão de Resposta Rápida Opcional */}
                <div className="space-y-1.5">
                  <Label htmlFor="quick-reply" className="text-xs font-semibold">
                    Botão de Resposta Rápida (Opcional)
                  </Label>
                  <Input
                    id="quick-reply"
                    placeholder="Ex: Quero saber mais"
                    maxLength={25}
                    value={quickReplyText}
                    onChange={(e) => setQuickReplyText(e.target.value)}
                    disabled={isSubmitting}
                    className="text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Cria um botão com clique único no WhatsApp do cliente (máx 25 caracteres).
                  </p>
                </div>
              </CardContent>

              <CardFooter className="pt-2 border-t flex flex-col gap-2">
                <Button
                  type="submit"
                  className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white font-medium"
                  disabled={isSubmitting || !hasWhatsAppCredentials}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Submetendo para a Meta...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Enviar para aprovação na Meta
                    </>
                  )}
                </Button>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground justify-center">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span>Notificação do parecer da Meta via e-mail e nesta tela</span>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Lista de Modelos com Status ao Vivo */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Modelos Cadastrados & Status ao Vivo</CardTitle>
                <CardDescription>
                  Status sincronizado diretamente com a WhatsApp Cloud API da Meta.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSync(false)}
                disabled={isSyncing}
                className="gap-1.5 text-xs h-8"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                Atualizar Status
              </Button>
            </CardHeader>

            <CardContent className="space-y-3">
              {loading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Carregando modelos...
                </div>
              ) : templates.length === 0 ? (
                <div className="py-12 text-center border border-dashed rounded-lg p-6">
                  <FileCheck2 className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <h4 className="font-medium text-sm text-foreground">Nenhum modelo cadastrado</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                    Submeta seu primeiro modelo pelo formulário ao lado para disparar mensagens fora
                    da janela de 24h.
                  </p>
                  <Button size="sm" variant="outline" onClick={loadExampleVilla}>
                    <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" /> Carregar modelo do Villa
                    dos Açores
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="p-3.5 rounded-lg border bg-card hover:bg-muted/20 transition-colors space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-sm text-foreground">
                            {tpl.name}
                          </span>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {tpl.category}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {tpl.language}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {renderStatusBadge(tpl.status, tpl.rejection_reason)}
                        </div>
                      </div>

                      {/* Texto do modelo */}
                      <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded border leading-relaxed font-sans">
                        {tpl.body_text}
                      </p>

                      {/* Botões anexados se existirem */}
                      {tpl.buttons && tpl.buttons.length > 0 && (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="font-medium">Botão:</span>
                          {tpl.buttons.map((b, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="bg-background text-[10px]"
                            >
                              {b.text}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Rodapé do item */}
                      <div className="flex items-center justify-between pt-1 border-t text-[11px] text-muted-foreground">
                        <span>
                          {tpl.meta_template_id ? `ID Meta: ${tpl.meta_template_id}` : 'Local'}
                        </span>

                        <div className="flex items-center gap-2">
                          {tpl.status === 'APPROVED' && onTemplateSelectedForCampaign && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onTemplateSelectedForCampaign(tpl.name)}
                              className="h-6 px-2 text-xs text-green-700 hover:text-green-800 hover:bg-green-50"
                            >
                              <Copy className="h-3 w-3 mr-1" /> Usar na Campanha
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(tpl)}
                            className="h-6 px-2 text-xs text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Diálogo de confirmação de exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Modelo de WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a remover o modelo <strong>{deleteTarget?.name}</strong>. Ele será
              deletado da Meta Cloud API e do banco do CRM.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
