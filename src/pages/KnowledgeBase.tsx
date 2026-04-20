import { useState, useEffect, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getKnowledgeBaseEntries,
  createKnowledgeBaseEntry,
  updateKnowledgeBaseEntry,
  deleteKnowledgeBaseEntry,
  type KnowledgeBaseEntry,
} from '@/services/knowledge_base'
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'
import { Search, Plus, Trash2, BookOpen, Loader2, ChevronLeft, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function KnowledgeBase() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [selectedEntry, setSelectedEntry] = useState<KnowledgeBaseEntry | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', category: '' })
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const loadEntries = async () => {
    try {
      setLoading(true)
      setEntries(await getKnowledgeBaseEntries())
    } catch {
      toast({ title: 'Erro ao carregar base de conhecimento', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) loadEntries()
  }, [user])

  useRealtime('knowledge_base', () => loadEntries())

  const filteredEntries = useMemo(() => {
    const q = search.toLowerCase()
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q),
    )
  }, [entries, search])

  const handleSelect = (entry: KnowledgeBaseEntry) => {
    setSelectedEntry(entry)
    setIsCreating(false)
    setForm({ title: entry.title, content: entry.content, category: entry.category || '' })
    setFieldErrors({})
  }

  const handleCreateNew = () => {
    setSelectedEntry(null)
    setIsCreating(true)
    setForm({ title: '', content: '', category: '' })
    setFieldErrors({})
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Tem certeza que deseja excluir esta entrada?')) return
    try {
      await deleteKnowledgeBaseEntry(id)
      toast({ title: 'Conhecimento removido com sucesso!' })
      if (selectedEntry?.id === id) {
        setSelectedEntry(null)
        setForm({ title: '', content: '', category: '' })
      }
    } catch (err) {
      toast({ title: 'Erro ao excluir', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  const handleSave = async () => {
    if (!user || !form.title.trim() || !form.content.trim()) return
    setSaving(true)
    setFieldErrors({})
    try {
      if (selectedEntry) {
        await updateKnowledgeBaseEntry(selectedEntry.id, form)
        toast({ title: 'Conhecimento atualizado com sucesso!' })
      } else {
        const newEntry = await createKnowledgeBaseEntry({ user_id: user.id, ...form })
        toast({ title: 'Conhecimento salvo com sucesso!' })
        setSelectedEntry(newEntry)
        setIsCreating(false)
      }
    } catch (err) {
      setFieldErrors(extractFieldErrors(err))
      toast({ title: 'Erro ao salvar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const isFormVisible = selectedEntry !== null || isCreating

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-6rem)] flex flex-col p-4 md:p-6">
      <div className="mb-6 flex-none">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Base de Conhecimento</h2>
        <p className="text-muted-foreground">Gerencie seus procedimentos e informações.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        {/* Left Column: Search & List */}
        <div
          className={cn(
            'md:w-1/3 lg:w-1/4 flex-col gap-4',
            isFormVisible ? 'hidden md:flex' : 'flex',
          )}
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={handleCreateNew} size="icon" className="shrink-0" title="Nova Entrada">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 pb-4">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-10 px-4 text-muted-foreground border rounded-lg border-dashed bg-muted/10">
                <BookOpen className="mx-auto h-8 w-8 mb-3 opacity-50" />
                <p className="text-sm">Nenhum registro encontrado.</p>
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <Card
                  key={entry.id}
                  className={cn(
                    'cursor-pointer hover:border-primary/50 transition-colors',
                    selectedEntry?.id === entry.id ? 'border-primary bg-primary/5' : '',
                  )}
                  onClick={() => handleSelect(entry)}
                >
                  <CardHeader className="p-4">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-base line-clamp-2 leading-tight">
                        {entry.title}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mt-1 -mr-1"
                        onClick={(e) => handleDelete(entry.id, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {entry.category && (
                      <Badge variant="outline" className="mt-2 text-xs font-normal">
                        {entry.category}
                      </Badge>
                    )}
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Form */}
        <div className={cn('flex-1', !isFormVisible ? 'hidden md:block' : 'block')}>
          {isFormVisible ? (
            <Card className="flex flex-col h-full border shadow-sm">
              <CardHeader className="flex flex-row items-center space-y-0 pb-4 border-b">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden mr-2 -ml-2"
                  onClick={() => {
                    setSelectedEntry(null)
                    setIsCreating(false)
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                  <CardTitle className="text-xl">
                    {isCreating ? 'Nova Entrada' : 'Editar Entrada'}
                  </CardTitle>
                  <CardDescription>
                    {isCreating
                      ? 'Adicione um novo item à base.'
                      : 'Atualize os detalhes do item selecionado.'}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-4 pt-6 overflow-y-auto">
                <div className="space-y-2 flex-none">
                  <Label htmlFor="title" className={cn(fieldErrors.title && 'text-destructive')}>
                    Título *
                  </Label>
                  <Input
                    id="title"
                    placeholder="Ex: Como realizar um reembolso"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                  {fieldErrors.title && (
                    <p className="text-sm text-destructive">{fieldErrors.title}</p>
                  )}
                </div>

                <div className="space-y-2 flex-none">
                  <Label
                    htmlFor="category"
                    className={cn(fieldErrors.category && 'text-destructive')}
                  >
                    Categoria
                  </Label>
                  <Input
                    id="category"
                    placeholder="Ex: Financeiro, Suporte"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                  {fieldErrors.category && (
                    <p className="text-sm text-destructive">{fieldErrors.category}</p>
                  )}
                </div>

                <div className="space-y-2 flex-1 flex flex-col min-h-[200px]">
                  <Label
                    htmlFor="content"
                    className={cn(fieldErrors.content && 'text-destructive')}
                  >
                    Conteúdo *
                  </Label>
                  <Textarea
                    id="content"
                    placeholder="Descreva as instruções ou informações importantes..."
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    className="flex-1 resize-none"
                  />
                  {fieldErrors.content && (
                    <p className="text-sm text-destructive">{fieldErrors.content}</p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="border-t p-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedEntry(null)
                    setIsCreating(false)
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!form.title.trim() || !form.content.trim() || saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="hidden md:flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
              <BookOpen className="h-12 w-12 mb-4 opacity-50" />
              <p>Selecione um item da lista para visualizar ou editar,</p>
              <p>ou crie uma nova entrada.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
