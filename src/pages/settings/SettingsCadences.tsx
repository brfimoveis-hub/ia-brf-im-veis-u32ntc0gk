import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2, Plus, Edit2, Trash2 } from 'lucide-react'
import {
  getCadences,
  createCadence,
  updateCadence,
  deleteCadence,
  type Cadence,
} from '@/services/cadences'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function SettingsCadences() {
  const [cadences, setCadences] = useState<Cadence[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCadence, setEditingCadence] = useState<Partial<Cadence> | null>(null)
  const [stepsJson, setStepsJson] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadCadences()
  }, [])

  const loadCadences = async () => {
    setLoading(true)
    try {
      const data = await getCadences()
      setCadences(data)
    } catch (e) {
      toast.error('Erro ao carregar cadências')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (cadence?: Cadence) => {
    if (cadence) {
      setEditingCadence(cadence)
      setStepsJson(cadence.steps ? JSON.stringify(cadence.steps, null, 2) : '')
    } else {
      setEditingCadence({ title: '', content: '', ai_instructions: '', is_active: true, order: 0 })
      setStepsJson('')
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editingCadence?.title) {
      toast.error('O título é obrigatório')
      return
    }
    
    let parsedSteps = editingCadence.steps;
    if (stepsJson) {
      try {
        parsedSteps = JSON.parse(stepsJson);
      } catch (e) {
        toast.error('O JSON dos passos é inválido.');
        return;
      }
    }

    setIsSaving(true)
    try {
      const dataToSave = { ...editingCadence, steps: parsedSteps };
      if (editingCadence.id) {
        await updateCadence(editingCadence.id, dataToSave)
        toast.success('Cadência atualizada com sucesso')
      } else {
        await createCadence(dataToSave)
        await updateCadence(editingCadence.id, editingCadence)
        toast.success('Cadência atualizada com sucesso')
      } else {
        await createCadence(editingCadence)
        toast.success('Cadência criada com sucesso')
      }
      setIsDialogOpen(false)
      loadCadences()
    } catch (err) {
      toast.error('Erro ao salvar cadência')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta cadência?')) return
    try {
      await deleteCadence(id)
      toast.success('Cadência excluída com sucesso')
      loadCadences()
    } catch (e) {
      toast.error('Erro ao excluir cadência')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Regras de Atendimento</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie as cadências e instruções específicas para o acompanhamento dos leads.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" /> Nova Cadência
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12 border rounded-xl bg-card/50">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4">
          {cadences.map((cadence) => (
            <Card
              key={cadence.id}
              className="border-border/50 shadow-sm transition-all hover:shadow-md"
            >
              <CardContent className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1 space-y-1 w-full">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-base">{cadence.title}</h3>
                    {!cadence.is_active && (
                      <span className="text-xs font-medium px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                        Inativa
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {cadence.ai_instructions || 'Nenhuma instrução de IA definida.'}
                  </p>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleOpenDialog(cadence)}>
                    <Edit2 className="h-4 w-4 mr-2" /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(cadence.id)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {cadences.length === 0 && (
            <div className="text-center p-12 text-muted-foreground border rounded-xl bg-card/30 border-dashed">
              Nenhuma cadência configurada. Crie sua primeira cadência para iniciar.
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCadence?.id ? 'Editar Cadência' : 'Nova Cadência'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label>Título da Cadência</Label>
              <Input
                value={editingCadence?.title || ''}
                onChange={(e) => setEditingCadence((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Contato Inicial (Dia 1)"
              />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo Padrão (Opcional)</Label>
              <Textarea
                value={editingCadence?.content || ''}
                onChange={(e) =>
                  setEditingCadence((prev) => ({ ...prev, content: e.target.value }))
                }
                className="min-h-[100px] resize-y"
                placeholder="Mensagem base de saudação..."
              />
            </div>
            <div className="space-y-2">
              <Label>Instruções da IA (Prompt Exclusivo)</Label>
              <Textarea
                value={editingCadence?.ai_instructions || ''}
                onChange={(e) =>
                  setEditingCadence((prev) => ({ ...prev, ai_instructions: e.target.value }))
                }
                className="min-h-[150px] resize-y"
                placeholder="Instruções adicionais que a IA deve seguir especificamente nesta etapa..."
              />
            </div>
            <div className="space-y-2">
              <Label>Passos da Cadência (JSON)</Label>
              <Textarea
                value={stepsJson}
                onChange={(e) => setStepsJson(e.target.value)}
                className="min-h-[150px] font-mono text-sm resize-y"
                placeholder='[{"type": "delay", "hours": 24}, {"type": "message", "text": "Olá!"}]'
              />
            </div>
            <div className="flex items-center space-x-3 p-3 bg-muted/40 rounded-lg border">
              <Switch
                checked={editingCadence?.is_active ?? true}
                onCheckedChange={(checked) =>
                  setEditingCadence((prev) => ({ ...prev, is_active: checked }))
                }
              />
              <div className="space-y-0.5">
                <Label className="text-base cursor-pointer">Cadência Ativa</Label>
                <p className="text-sm text-muted-foreground">
                  Determina se esta cadência está em uso no momento.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Cadência
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
