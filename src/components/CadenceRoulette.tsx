import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { getActiveCadences, updateCadence, type Cadence } from '@/services/cadences'
import {
  Edit2,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RefreshCw,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function CadenceRoulette() {
  const [cadences, setCadences] = useState<Cadence[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', content: '' })
  const { toast } = useToast()

  const loadCadences = async () => {
    try {
      const data = await getActiveCadences()
      setCadences(data)
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao carregar cadências.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCadences()
  }, [])

  useEffect(() => {
    if (cadences.length <= 1 || isPaused || isEditing) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % cadences.length)
    }, 10000) // Rotate every 10 seconds
    return () => clearInterval(timer)
  }, [cadences.length, isPaused, isEditing])

  const current = cadences[currentIndex]

  const handleEdit = () => {
    setEditForm({ title: current.title, content: current.content })
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!current) return
    if (!editForm.title.trim() || !editForm.content.trim()) {
      toast({
        title: 'Aviso',
        description: 'Título e conteúdo são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const updated = await updateCadence(current.id, editForm)
      setCadences((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      setIsEditing(false)
      toast({ title: 'Sucesso', description: 'Cadência atualizada com sucesso.' })
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao atualizar cadência.', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const next = () => setCurrentIndex((p) => (p + 1) % cadences.length)
  const prev = () => setCurrentIndex((p) => (p - 1 + cadences.length) % cadences.length)

  if (isLoading) {
    return (
      <Card className="h-[300px] flex flex-col items-center justify-center text-muted-foreground border-dashed">
        <RefreshCw className="h-8 w-8 animate-spin mb-4 text-primary/50" />
        <p>Carregando Roleta Inteligente...</p>
      </Card>
    )
  }

  if (cadences.length === 0) {
    return (
      <Card className="h-[300px] flex flex-col items-center justify-center text-muted-foreground border-dashed">
        <Layers className="h-8 w-8 mb-4 text-primary/50" />
        <p>Nenhuma cadência ativa encontrada para a roleta.</p>
      </Card>
    )
  }

  return (
    <Card className="shadow-subtle border-primary/10 bg-gradient-to-br from-background to-primary/5 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-muted">
        {!isPaused && !isEditing && cadences.length > 1 && (
          <div
            key={currentIndex}
            className="h-full bg-primary animate-[progress_10s_linear]"
            style={{ width: '100%', animationFillMode: 'forwards' }}
          />
        )}
      </div>

      <CardHeader className="flex flex-row items-start sm:items-center justify-between pb-2 gap-4">
        <div>
          <CardTitle className="text-secondary flex items-center gap-2 text-xl">
            Roleta Inteligente
            <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium border border-primary/20">
              {currentIndex + 1} / {cadences.length}
            </span>
          </CardTitle>
          <CardDescription>
            Visualizando e otimizando seus fluxos ativos em tempo real
          </CardDescription>
        </div>

        <div className="flex items-center gap-1 bg-background/50 backdrop-blur-sm rounded-md p-1 border shadow-sm">
          <Button
            variant={isPaused ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsPaused(!isPaused)}
            disabled={isEditing || cadences.length <= 1}
            title={isPaused ? 'Retomar Rotação' : 'Pausar Rotação'}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={prev}
            disabled={isEditing || cadences.length <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={next}
            disabled={isEditing || cadences.length <= 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isEditing ? (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <Input
              value={editForm.title}
              onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Título da Cadência"
              className="font-medium text-secondary bg-background/80"
              disabled={isSaving}
            />
            <Textarea
              className="min-h-[140px] resize-none bg-background/80"
              value={editForm.content}
              onChange={(e) => setEditForm((p) => ({ ...p, content: e.target.value }))}
              placeholder="Conteúdo da mensagem..."
              disabled={isSaving}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={handleCancel} disabled={isSaving}>
                <X className="w-4 h-4 mr-2" /> Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </div>
        ) : (
          <div className="group relative animate-in fade-in duration-300">
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <Button variant="secondary" size="sm" onClick={handleEdit} className="shadow-sm">
                <Edit2 className="w-3.5 h-3.5 mr-2" /> Editar Conteúdo
              </Button>
            </div>

            <div
              className="bg-background/60 backdrop-blur-sm border rounded-lg p-5 cursor-text hover:border-primary/50 transition-colors"
              onClick={handleEdit}
            >
              <h3 className="font-semibold text-lg text-secondary mb-3 pr-28">{current.title}</h3>
              <ScrollArea className="h-[120px] w-full pr-4">
                <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {current.content}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </CardContent>

      <style>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </Card>
  )
}
