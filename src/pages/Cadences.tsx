import { useState, useEffect } from 'react'
import {
  getCadences,
  createCadence,
  updateCadence,
  deleteCadence,
  type Cadence,
} from '@/services/cadences'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Trash2, Edit } from 'lucide-react'

export default function Cadences() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [cadences, setCadences] = useState<Cadence[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState<Partial<Cadence>>({
    title: '',
    description: '',
    content: '',
    ai_instructions: '',
    order: 1,
    is_active: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const data = await getCadences()
      setCadences(data)
    } catch (error) {
      toast({ title: 'Erro ao carregar cadências', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenNew = () => {
    setEditingId(null)
    setFormData({
      title: '',
      description: '',
      content: '',
      ai_instructions: '',
      order: cadences.length + 1,
      is_active: true,
    })
    setOpen(true)
  }

  const handleOpenEdit = (cadence: Cadence) => {
    setEditingId(cadence.id)
    setFormData(cadence)
    setOpen(true)
  }

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' })
      return
    }

    try {
      if (editingId) {
        await updateCadence(editingId, formData)
        toast({ title: 'Cadência atualizada com sucesso' })
      } else {
        await createCadence({ ...formData, user_id: user.id } as Partial<Cadence>)
        toast({ title: 'Cadência criada com sucesso' })
      }
      setOpen(false)
      loadData()
    } catch (error) {
      toast({ title: 'Erro ao salvar cadência', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta cadência?')) return
    try {
      await deleteCadence(id)
      toast({ title: 'Cadência excluída com sucesso' })
      loadData()
    } catch (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await updateCadence(id, { is_active: active })
      loadData()
    } catch (error) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' })
    }
  }

  if (loading)
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        Carregando...
      </div>
    )

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cadências de Evolução</h1>
          <p className="text-muted-foreground">
            Configure os até 10 passos do funil automatizado da IA.
          </p>
        </div>
        <Button onClick={handleOpenNew} disabled={cadences.length >= 10}>
          <Plus className="h-4 w-4 mr-2" /> Novo Passo ({cadences.length}/10)
        </Button>
      </div>

      <div className="grid gap-4">
        {cadences.map((cadence, index) => (
          <Card key={cadence.id} className="relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-primary/20"></div>
            <CardHeader className="pl-6 pb-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Passo {cadence.order || index + 1}</Badge>
                    <CardTitle className="text-lg">{cadence.title}</CardTitle>
                    {!cadence.is_active && <Badge variant="secondary">Inativo</Badge>}
                  </div>
                  <CardDescription>{cadence.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={cadence.is_active}
                    onCheckedChange={(c) => handleToggleActive(cadence.id, c)}
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(cadence)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDelete(cadence.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pl-6">
              <div className="grid md:grid-cols-2 gap-4 text-sm mt-2">
                <div className="bg-muted/30 p-3 rounded-md">
                  <span className="font-semibold text-xs uppercase text-muted-foreground mb-1 block">
                    Conteúdo (Mensagem Base)
                  </span>
                  <p className="line-clamp-3">{cadence.content}</p>
                </div>
                <div className="bg-primary/5 p-3 rounded-md border border-primary/10">
                  <span className="font-semibold text-xs uppercase text-primary mb-1 block">
                    Instruções para IA
                  </span>
                  <p className="line-clamp-3 italic">
                    {cadence.ai_instructions || 'Nenhuma instrução específica.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {cadences.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            Nenhuma cadência configurada. Crie o primeiro passo do seu funil.
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Passo' : 'Novo Passo de Cadência'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4 p-1">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3 space-y-2">
                  <Label>Título (Nome da Fase/Status)</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Contato 1, Qualificação..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição Interna</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Primeira tentativa de contato após cadastro"
                />
              </div>

              <div className="space-y-2">
                <Label>Conteúdo Base (O que a IA deve falar/vender)</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Escreva o script principal desta fase..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Diretrizes Específicas para IA (Como a IA deve se comportar nesta fase)
                </Label>
                <Textarea
                  value={formData.ai_instructions}
                  onChange={(e) => setFormData({ ...formData, ai_instructions: e.target.value })}
                  placeholder="Ex: Seja mais insistente, ofereça um agendamento. Se o cliente disser X, avance para [STATUS: Qualificação]."
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                <div>
                  <Label className="font-semibold text-base">Passo Ativo</Label>
                  <p className="text-xs text-muted-foreground">
                    A IA utilizará esta fase no fluxo automático.
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
