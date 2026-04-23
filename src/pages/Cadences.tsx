import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Edit2, Trash2, ListOrdered, PlayCircle, Loader2 } from 'lucide-react'
import {
  getCadences,
  createCadence,
  updateCadence,
  deleteCadence,
  type Cadence,
} from '@/services/cadences'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { cn } from '@/lib/utils'

export default function Cadences() {
  const { rouletteEnabled } = useOutletContext<{ rouletteEnabled: boolean }>()
  const { toast } = useToast()
  const [cadences, setCadences] = useState<Cadence[]>([])
  const [loading, setLoading] = useState(true)
  const [internalIndex, setInternalIndex] = useState(0)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<Cadence>>({})

  const activeCadences = cadences.filter((c) => c.is_active).sort((a, b) => a.order - b.order)

  const loadData = async () => {
    try {
      const data = await getCadences()
      setCadences(data)
    } catch (error) {
      toast({
        title: 'Erro ao carregar cadências',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('cadences', () => {
    loadData()
  })

  useEffect(() => {
    if (!rouletteEnabled || activeCadences.length === 0) return

    const handleRoulette = (e: CustomEvent) => {
      if (internalIndex < activeCadences.length - 1) {
        e.preventDefault()
        setInternalIndex((prev) => prev + 1)
      } else {
        setInternalIndex(0)
      }
    }

    window.addEventListener('roulette-next', handleRoulette as EventListener)
    return () => window.removeEventListener('roulette-next', handleRoulette as EventListener)
  }, [rouletteEnabled, internalIndex, activeCadences.length])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.content) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' })
      return
    }

    setIsSaving(true)
    try {
      if (formData.id) {
        await updateCadence(formData.id, formData)
        toast({ title: 'Cadência atualizada com sucesso!' })
      } else {
        await createCadence(formData)
        toast({ title: 'Cadência criada com sucesso!' })
      }
      setIsModalOpen(false)
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta cadência?')) return
    try {
      await deleteCadence(id)
      toast({ title: 'Cadência excluída com sucesso!' })
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  const handleToggleActive = async (cadence: Cadence, checked: boolean) => {
    try {
      await updateCadence(cadence.id, { is_active: checked })
      toast({ title: checked ? 'Cadência ativada' : 'Cadência desativada' })
    } catch (error) {
      toast({
        title: 'Erro ao atualizar status',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  const openEditModal = (cadence?: Cadence) => {
    if (cadence) {
      setFormData(cadence)
    } else {
      setFormData({
        title: '',
        content: '',
        order: cadences.length > 0 ? Math.max(...cadences.map((c) => c.order)) + 1 : 1,
        is_active: true,
      })
    }
    setIsModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (rouletteEnabled && activeCadences.length > 0) {
    const current = activeCadences[internalIndex]
    return (
      <div className="flex flex-1 items-center justify-center p-4 sm:p-8 h-full animate-fade-in">
        <Card className="w-full max-w-4xl border-primary/20 shadow-lg bg-card/50 backdrop-blur">
          <CardHeader className="text-center space-y-4 pb-8 pt-10">
            <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center shadow-inner">
              <PlayCircle className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-3xl sm:text-5xl font-bold tracking-tight text-primary">
              {current?.title}
            </CardTitle>
            <p className="text-muted-foreground font-semibold uppercase tracking-widest text-sm sm:text-base">
              Passo {current?.order} da Cadência • {internalIndex + 1} de {activeCadences.length}
            </p>
          </CardHeader>
          <CardContent className="pb-10">
            <div className="bg-background rounded-2xl p-8 sm:p-12 border shadow-sm text-lg sm:text-2xl leading-relaxed text-secondary text-center max-w-3xl mx-auto whitespace-pre-wrap">
              {current?.content}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-secondary">
            Cadências de Mensagens
          </h1>
          <p className="text-muted-foreground">
            Gerencie as sequências automáticas para a roleta e disparos.
          </p>
        </div>
        <Button onClick={() => openEditModal()} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Nova Cadência
        </Button>
      </div>

      {cadences.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <ListOrdered className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-secondary mb-2">Nenhuma cadência encontrada</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Crie sua primeira cadência de mensagens para incluí-la no ciclo de visualização e
              automação.
            </p>
            <Button onClick={() => openEditModal()}>Criar Cadência</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cadences.map((cadence) => (
            <Card
              key={cadence.id}
              className={cn(
                'transition-all duration-200 flex flex-col',
                cadence.is_active
                  ? 'border-primary/30 shadow-md hover:border-primary/50'
                  : 'opacity-60 bg-muted/30',
              )}
            >
              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1.5 pr-4">
                  <CardTitle className="text-lg font-semibold leading-tight">
                    {cadence.title}
                  </CardTitle>
                  <div className="flex items-center text-xs font-medium text-muted-foreground bg-secondary/10 w-fit px-2 py-0.5 rounded-md">
                    <ListOrdered className="w-3 h-3 mr-1.5" />
                    Passo {cadence.order}
                  </div>
                </div>
                <Switch
                  checked={cadence.is_active}
                  onCheckedChange={(checked) => handleToggleActive(cadence, checked)}
                  className="shrink-0"
                />
              </CardHeader>
              <CardContent className="pb-4 flex-1">
                <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                  {cadence.content}
                </p>
              </CardContent>
              <CardFooter className="pt-0 flex justify-end gap-2 border-t mt-auto pt-4 pb-4">
                <Button variant="ghost" size="sm" onClick={() => openEditModal(cadence)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(cadence.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{formData.id ? 'Editar Cadência' : 'Nova Cadência'}</DialogTitle>
              <DialogDescription>
                Defina o título, a ordem e o conteúdo da mensagem desta etapa.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3 space-y-2">
                  <Label htmlFor="title">Título da Etapa</Label>
                  <Input
                    id="title"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Primeiro Contato"
                    required
                  />
                </div>
                <div className="col-span-1 space-y-2">
                  <Label htmlFor="order">Ordem</Label>
                  <Input
                    id="order"
                    type="number"
                    min="1"
                    value={formData.order || 1}
                    onChange={(e) =>
                      setFormData({ ...formData, order: parseInt(e.target.value) || 1 })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo da Mensagem</Label>
                <Textarea
                  id="content"
                  value={formData.content || ''}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Escreva a mensagem que será enviada nesta etapa..."
                  className="min-h-[150px] resize-y"
                  required
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active ?? true}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Ativar esta etapa na roleta e nos disparos
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Cadência
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
