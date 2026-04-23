import { useState, useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
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
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function CadenceRoulette() {
  const [cadences, setCadences] = useState<Cadence[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editContent, setEditContent] = useState('')
  const { toast } = useToast()

  // Prevent navigation when editing
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isEditing && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state === 'blocked') {
      toast({
        title: 'Edição em andamento',
        description: 'Salve ou cancele as alterações antes de sair da página.',
        variant: 'destructive',
      })
    }
  }, [blocker.state, toast])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEditing) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isEditing])

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
    setEditContent(current.content)
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!current) return
    if (!editContent.trim()) {
      toast({
        title: 'Aviso',
        description: 'O conteúdo da mensagem é obrigatório.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const updated = await updateCadence(current.id, { content: editContent })
      setCadences((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      setIsEditing(false)
      toast({ title: 'Sucesso', description: 'Mensagem sugerida atualizada com sucesso.' })
      if (blocker.state === 'blocked') {
        blocker.proceed?.()
      }
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao atualizar cadência.', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    if (blocker.state === 'blocked') {
      blocker.proceed?.()
    }
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

  const parts = current.title.split('|').map((s) => s.trim())
  const step = parts[0] || current.title
  const trigger = parts[1] || ''
  const channel = parts[2] || ''

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
            Roleta Inteligente: Villa dos Açores
            <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium border border-primary/20">
              {currentIndex + 1} / {cadences.length}
            </span>
          </CardTitle>
          <CardDescription>Pipeline da Bia - Ciclo de Cadência</CardDescription>
        </div>

        <div className="flex items-center gap-1 bg-background/50 backdrop-blur-sm rounded-md p-1 border shadow-sm z-10">
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
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge
            variant="outline"
            className="bg-primary/5 text-primary border-primary/20 shadow-sm"
          >
            {step}
          </Badge>
          {trigger && (
            <Badge
              variant="outline"
              className="bg-primary/5 text-primary border-primary/20 shadow-sm"
            >
              Gatilho: {trigger}
            </Badge>
          )}
          {channel && (
            <Badge
              variant="outline"
              className="bg-primary/5 text-primary border-primary/20 shadow-sm"
            >
              Canal: {channel}
            </Badge>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-secondary flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" /> ÁREA EDITÁVEL - Mensagem Sugerida
              </span>
            </div>
            <Textarea
              className="min-h-[120px] resize-none bg-background/80 shadow-inner border-primary/30 focus-visible:ring-primary/50"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Conteúdo da mensagem sugerida..."
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
              <Button
                variant="secondary"
                size="sm"
                onClick={handleEdit}
                className="shadow-sm border border-border/50"
              >
                <Edit2 className="w-3.5 h-3.5 mr-2" /> Editar Mensagem
              </Button>
            </div>

            <div
              className="bg-background/60 backdrop-blur-sm border border-border/50 rounded-lg p-5 cursor-text hover:border-primary/40 transition-colors shadow-sm group-hover:shadow relative"
              onClick={handleEdit}
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 rounded-l-lg" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Mensagem Sugerida
              </h4>
              <ScrollArea className="h-[100px] w-full pr-4">
                <div className="text-sm text-secondary/90 font-medium whitespace-pre-wrap leading-relaxed">
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
