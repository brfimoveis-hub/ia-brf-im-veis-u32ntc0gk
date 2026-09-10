import { useState, useEffect, useCallback } from 'react'
import {
  AdPlaybook,
  CreateAdPlaybookPayload,
  getAdPlaybooks,
  createAdPlaybook,
  updateAdPlaybook,
  deleteAdPlaybook,
  toggleAdPlaybookActive,
} from '@/services/ad_playbooks'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Target,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Building2,
  MessageSquare,
  Compass,
  Tag,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

interface PlaybookFormData {
  name: string
  keywordsString: string
  empreendimento: string
  pitch: string
  objective: string
  qualifying_questions: string
  cta_message: string
  active: boolean
}

const INITIAL_FORM: PlaybookFormData = {
  name: '',
  keywordsString: '',
  empreendimento: '',
  pitch: '',
  objective: '',
  qualifying_questions: '',
  cta_message: '',
  active: true,
}

export function AdPlaybooksManager() {
  const { toast } = useToast()
  const [playbooks, setPlaybooks] = useState<AdPlaybook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal de criação / edição
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<PlaybookFormData>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)

  // Dialog de exclusão
  const [deleteTarget, setDeleteTarget] = useState<AdPlaybook | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Carregar lista de playbooks
  const loadPlaybooks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdPlaybooks()
      setPlaybooks(data)
    } catch (err: any) {
      console.error('[AdPlaybooksManager] Erro ao carregar playbooks:', err)
      setError(err?.message || 'Falha ao buscar playbooks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPlaybooks()
  }, [loadPlaybooks])

  // Realtime updates na coleção ad_playbooks
  useRealtime('ad_playbooks', () => {
    loadPlaybooks()
  })

  // Abrir modal para novo
  const handleOpenCreate = () => {
    setEditingId(null)
    setFormData(INITIAL_FORM)
    setModalOpen(true)
  }

  // Abrir modal para edição
  const handleOpenEdit = (pbItem: AdPlaybook) => {
    setEditingId(pbItem.id)
    setFormData({
      name: pbItem.name,
      keywordsString: pbItem.match_keywords.join(', '),
      empreendimento: pbItem.empreendimento,
      pitch: pbItem.pitch,
      objective: pbItem.objective,
      qualifying_questions: pbItem.qualifying_questions,
      cta_message: pbItem.cta_message,
      active: pbItem.active,
    })
    setModalOpen(true)
  }

  // Submeter formulário
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Informe um nome identificador para o playbook.',
      })
      return
    }

    const keywords = formData.keywordsString
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0)

    if (keywords.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Palavras-chave obrigatórias',
        description:
          'Adicione pelo menos 1 palavra-chave ou nome de campanha para casar com o anúncio.',
      })
      return
    }

    setSaving(true)
    try {
      const payload: CreateAdPlaybookPayload = {
        name: formData.name.trim(),
        match_keywords: keywords,
        empreendimento: formData.empreendimento.trim(),
        pitch: formData.pitch.trim(),
        objective: formData.objective.trim(),
        qualifying_questions: formData.qualifying_questions.trim(),
        cta_message: formData.cta_message.trim(),
        active: formData.active,
      }

      if (editingId) {
        await updateAdPlaybook(editingId, payload)
        toast({
          title: 'Playbook atualizado',
          description: `O playbook "${payload.name}" foi salvo com sucesso.`,
        })
      } else {
        await createAdPlaybook(payload)
        toast({
          title: 'Playbook criado',
          description: `O playbook "${payload.name}" foi criado e já está ativo.`,
        })
      }
      setModalOpen(false)
      loadPlaybooks()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar playbook',
        description: err?.message || 'Falha na comunicação com o banco.',
      })
    } finally {
      setSaving(false)
    }
  }

  // Toggle rápido de ativo
  const handleToggleActive = async (pbItem: AdPlaybook, newActive: boolean) => {
    try {
      await toggleAdPlaybookActive(pbItem.id, newActive)
      setPlaybooks((prev) =>
        prev.map((item) => (item.id === pbItem.id ? { ...item, active: newActive } : item)),
      )
      toast({
        title: newActive ? 'Playbook ativado' : 'Playbook desativado',
        description: `O playbook "${pbItem.name}" agora está ${newActive ? 'ativo' : 'pausado'}.`,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar status',
        description: err?.message || 'Falha ao atualizar o playbook.',
      })
      loadPlaybooks()
    }
  }

  // Excluir playbook
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteAdPlaybook(deleteTarget.id)
      toast({
        title: 'Playbook removido',
        description: `O playbook "${deleteTarget.name}" foi excluído.`,
      })
      setDeleteTarget(null)
      loadPlaybooks()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: err?.message || 'Não foi possível remover o playbook.',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner Informativo */}
      <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-background shadow-xs">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-indigo-600/10 text-indigo-700 rounded-lg mt-0.5">
              <Target className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
                Playbooks de Venda Focada por Anúncio
                <Badge
                  variant="secondary"
                  className="text-xs bg-indigo-100 text-indigo-800 border-indigo-200"
                >
                  Foco & Fechamento
                </Badge>
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
                Quando a Bia recebe um lead de anúncio Meta (Click-to-WhatsApp), ela localiza o
                Playbook correspondente e conduz o atendimento de forma ultra-específica: apresenta
                as condições do empreendimento anunciado, faz perguntas de qualificação pontuais e
                foca no fechamento — sem dispersar para outros imóveis.
              </p>
            </div>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2 shrink-0 self-start md:self-auto">
            <Plus className="h-4 w-4" />
            Novo Playbook
          </Button>
        </CardContent>
      </Card>

      {/* Conteúdo Principal: Lista */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-36 w-full rounded-lg" />
          <Skeleton className="h-36 w-full rounded-lg" />
        </div>
      ) : error ? (
        <Card className="border-destructive/30">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={loadPlaybooks}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : playbooks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 flex flex-col items-center justify-center text-center space-y-3">
            <Target className="h-10 w-10 text-muted-foreground/60" />
            <h4 className="font-semibold text-foreground">Nenhum playbook cadastrado</h4>
            <p className="text-sm text-muted-foreground max-w-md">
              Crie seu primeiro playbook para que a Bia saiba exatamente como conduzir os leads
              vindos dos seus anúncios patrocinados.
            </p>
            <Button onClick={handleOpenCreate} size="sm" className="gap-2 mt-2">
              <Plus className="h-4 w-4" />
              Criar Primeiro Playbook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {playbooks.map((pbItem) => (
            <Card
              key={pbItem.id}
              className={`transition-all ${
                pbItem.active
                  ? 'border-border shadow-xs hover:border-indigo-300'
                  : 'opacity-70 bg-muted/30 border-muted'
              }`}
            >
              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0 gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base font-bold text-foreground">
                      {pbItem.name}
                    </CardTitle>
                    {pbItem.active ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-300 text-xs gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground text-xs gap-1">
                        <XCircle className="h-3 w-3" /> Pausado
                      </Badge>
                    )}
                    {pbItem.empreendimento && (
                      <Badge variant="secondary" className="text-xs gap-1 font-normal">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {pbItem.empreendimento}
                      </Badge>
                    )}
                  </div>
                  {/* Palavras-chave */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Gatilhos:
                    </span>
                    {pbItem.match_keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-2 mr-2">
                    <Label
                      htmlFor={`switch-${pbItem.id}`}
                      className="text-xs text-muted-foreground cursor-pointer"
                    >
                      {pbItem.active ? 'Ativo' : 'Inativo'}
                    </Label>
                    <Switch
                      id={`switch-${pbItem.id}`}
                      checked={pbItem.active}
                      onCheckedChange={(checked) => handleToggleActive(pbItem, checked)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => handleOpenEdit(pbItem)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(pbItem)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-3 text-sm">
                {/* Pitch */}
                {pbItem.pitch && (
                  <div className="bg-muted/40 p-3 rounded-md border text-xs sm:text-sm">
                    <span className="font-semibold text-foreground flex items-center gap-1.5 mb-1 text-xs">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                      Roteiro de Venda / Pitch Comercial:
                    </span>
                    <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                      {pbItem.pitch}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Objetivo de Fechamento */}
                  {pbItem.objective && (
                    <div className="p-2.5 rounded border bg-background/50 space-y-1">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Compass className="h-3.5 w-3.5 text-blue-600" />
                        Objetivo de Fechamento:
                      </span>
                      <p className="text-muted-foreground">{pbItem.objective}</p>
                    </div>
                  )}

                  {/* CTA de Fechamento */}
                  {pbItem.cta_message && (
                    <div className="p-2.5 rounded border bg-background/50 space-y-1">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                        Chamada para Ação (CTA):
                      </span>
                      <p className="text-muted-foreground">{pbItem.cta_message}</p>
                    </div>
                  )}
                </div>

                {/* Perguntas de Qualificação */}
                {pbItem.qualifying_questions && (
                  <div className="p-2.5 rounded border bg-background/50 space-y-1 text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
                      Perguntas de Qualificação (1 por vez):
                    </span>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {pbItem.qualifying_questions}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Criar / Editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-600" />
              {editingId ? 'Editar Playbook de Anúncio' : 'Novo Playbook de Anúncio'}
            </DialogTitle>
            <DialogDescription>
              Configure o roteiro focado e as condições comerciais para os leads que chegarem
              através dos anúncios deste empreendimento.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pb-name" className="text-xs font-semibold">
                  Nome do Playbook *
                </Label>
                <Input
                  id="pb-name"
                  placeholder="Ex: Canasvieiras — Beco dos Milionários"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pb-empreendimento" className="text-xs font-semibold">
                  Empreendimento Alvo
                </Label>
                <Input
                  id="pb-empreendimento"
                  placeholder="Ex: Studios e 1 Dorm Canasvieiras"
                  value={formData.empreendimento}
                  onChange={(e) => setFormData({ ...formData, empreendimento: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pb-keywords" className="text-xs font-semibold">
                Palavras-chave de Reconhecimento (separadas por vírgula) *
              </Label>
              <Input
                id="pb-keywords"
                placeholder="Ex: Canasvieiras, Beco dos Milionários, studios vista mar, LM 330"
                value={formData.keywordsString}
                onChange={(e) => setFormData({ ...formData, keywordsString: e.target.value })}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Se a campanha ou o anúncio Meta contiver qualquer uma dessas palavras, este playbook
                assumirá o foco total.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pb-pitch" className="text-xs font-semibold">
                Roteiro de Venda / Pitch Comercial (Texto Livre) *
              </Label>
              <Textarea
                id="pb-pitch"
                rows={5}
                placeholder="Descreva os diferenciais do imóvel, valores, condições (ex: 40x sem entrada), estrutura jurídica (SPE), prazos de obra, lazer e potencial de retorno (Airbnb)."
                value={formData.pitch}
                onChange={(e) => setFormData({ ...formData, pitch: e.target.value })}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                A Bia usará exatamente esses argumentos, diferenciais e valores durante a conversa
                com o lead.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pb-objective" className="text-xs font-semibold">
                  Objetivo Principal de Fechamento
                </Label>
                <Input
                  id="pb-objective"
                  placeholder="Ex: Agendar visita ao estande/decorado ou reunião com o Mauro"
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pb-cta" className="text-xs font-semibold">
                  Mensagem / Chamada de Fechamento (CTA)
                </Label>
                <Input
                  id="pb-cta"
                  placeholder="Ex: Posso agendar sua visita ao decorado para este sábado?"
                  value={formData.cta_message}
                  onChange={(e) => setFormData({ ...formData, cta_message: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pb-questions" className="text-xs font-semibold">
                Perguntas de Qualificação (A Bia fará uma por vez)
              </Label>
              <Textarea
                id="pb-questions"
                rows={3}
                placeholder="Ex:&#10;1. Seu foco é moradia ou investimento em aluguel de temporada?&#10;2. Você prefere parcelamento direto em 40x sem entrada ou financiamento bancário?"
                value={formData.qualifying_questions}
                onChange={(e) => setFormData({ ...formData, qualifying_questions: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2 pt-2 border-t">
              <Switch
                id="pb-active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="pb-active" className="text-xs font-medium cursor-pointer">
                Playbook ativo (a Bia aplicará este roteiro imediatamente)
              </Label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? 'Salvar Alterações' : 'Criar Playbook'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmação Excluir */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir playbook?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o playbook &quot;{deleteTarget?.name}&quot;? Os novos
              leads de anúncios correspondentes passarão a receber a qualificação padrão da Bia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Sim, excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
