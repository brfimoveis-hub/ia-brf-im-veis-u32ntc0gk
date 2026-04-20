import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Search, Plus, Edit, Trash2, BookOpen, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function KnowledgeBase() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<KnowledgeBaseEntry | null>(null)
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

  const openSheet = (entry?: KnowledgeBaseEntry) => {
    setEditingEntry(entry || null)
    setForm(
      entry
        ? { title: entry.title, content: entry.content, category: entry.category || '' }
        : { title: '', content: '', category: '' },
    )
    setFieldErrors({})
    setIsSheetOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta entrada?')) return
    try {
      await deleteKnowledgeBaseEntry(id)
      toast({ title: 'Entrada excluída com sucesso' })
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  const handleSave = async () => {
    if (!user || !form.title.trim() || !form.content.trim()) return
    setSaving(true)
    setFieldErrors({})
    try {
      if (editingEntry) await updateKnowledgeBaseEntry(editingEntry.id, form)
      else await createKnowledgeBaseEntry({ user_id: user.id, ...form })
      toast({
        title: editingEntry ? 'Entrada atualizada com sucesso' : 'Nova entrada criada com sucesso',
      })
      setIsSheetOpen(false)
    } catch (err) {
      setFieldErrors(extractFieldErrors(err))
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-secondary">Base de Conhecimento</h2>
          <p className="text-muted-foreground mt-2">
            Gerencie procedimentos, documentos e informações importantes.
          </p>
        </div>
        <Button onClick={() => openSheet()} className="shrink-0 gap-2">
          <Plus className="h-4 w-4" /> Nova Entrada
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título, conteúdo ou categoria..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed">
          <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <CardTitle className="text-xl">Nenhuma entrada encontrada</CardTitle>
          <CardDescription className="mt-2 max-w-sm">
            {search
              ? 'Nenhum resultado corresponde à sua busca. Tente outros termos.'
              : 'Sua base de conhecimento está vazia. Crie sua primeira entrada para começar.'}
          </CardDescription>
          {!search && (
            <Button onClick={() => openSheet()} variant="outline" className="mt-6 gap-2">
              <Plus className="h-4 w-4" /> Adicionar Primeira Entrada
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredEntries.map((entry) => (
            <Card
              key={entry.id}
              className="flex flex-col h-full shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3 flex-row justify-between items-start space-y-0">
                <div className="space-y-1.5 flex-1 pr-4">
                  <CardTitle className="text-lg line-clamp-1">{entry.title}</CardTitle>
                  {entry.category && (
                    <Badge variant="secondary" className="font-normal text-xs">
                      {entry.category}
                    </Badge>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openSheet(entry)}
                    className="h-8 w-8"
                  >
                    <Edit className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(entry.id)}
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                  {entry.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-xl flex flex-col h-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingEntry ? 'Editar Entrada' : 'Nova Entrada'}</SheetTitle>
            <SheetDescription>
              Preencha os detalhes da entrada da base de conhecimento.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-6 py-6 flex-1">
            <div className="space-y-2">
              <Label htmlFor="title" className={cn(fieldErrors.title && 'text-destructive')}>
                Título *
              </Label>
              <Input
                id="title"
                placeholder="Ex: Como realizar um reembolso"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              {fieldErrors.title && <p className="text-sm text-destructive">{fieldErrors.title}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="category" className={cn(fieldErrors.category && 'text-destructive')}>
                Categoria
              </Label>
              <Input
                id="category"
                placeholder="Ex: Financeiro, Suporte, Vendas"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
              {fieldErrors.category && (
                <p className="text-sm text-destructive">{fieldErrors.category}</p>
              )}
            </div>
            <div className="space-y-2 flex-1 flex flex-col">
              <Label htmlFor="content" className={cn(fieldErrors.content && 'text-destructive')}>
                Conteúdo *
              </Label>
              <Textarea
                id="content"
                placeholder="Detalhes, procedimentos e informações importantes..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="flex-1 min-h-[300px] resize-none"
              />
              {fieldErrors.content && (
                <p className="text-sm text-destructive">{fieldErrors.content}</p>
              )}
            </div>
          </div>
          <SheetFooter className="mt-auto pt-6 pb-2">
            <Button variant="outline" onClick={() => setIsSheetOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.title.trim() || !form.content.trim() || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
