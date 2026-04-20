import { useState, useEffect } from 'react'
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
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import {
  getKnowledgeBaseEntries,
  createKnowledgeBaseEntry,
  updateKnowledgeBaseEntry,
} from '@/services/knowledge_base'
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'
import { Loader2, Save, Globe, Tags, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function KnowledgeBase() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [entryId, setEntryId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', content: '', category: '' })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const loadEntry = async () => {
      if (!user) return
      try {
        setLoading(true)
        const entries = await getKnowledgeBaseEntries()
        if (entries.length > 0) {
          const entry = entries[0]
          setEntryId(entry.id)
          setForm({
            title: entry.title || '',
            content: entry.content || '',
            category: entry.category || '',
          })
        }
      } catch (err) {
        toast({ title: 'Erro ao carregar configurações', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    loadEntry()
  }, [user, toast])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setFieldErrors({})
    try {
      if (entryId) {
        await updateKnowledgeBaseEntry(entryId, form)
        toast({ title: 'Configurações atualizadas com sucesso!' })
      } else {
        const newEntry = await createKnowledgeBaseEntry({ user_id: user.id, ...form })
        setEntryId(newEntry.id)
        toast({ title: 'Configurações salvas com sucesso!' })
      }
    } catch (err) {
      setFieldErrors(extractFieldErrors(err))
      toast({ title: 'Erro ao salvar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col p-4 md:p-6">
      <div className="mb-6 flex-none">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Base de Conhecimento e IA
        </h2>
        <p className="text-muted-foreground">
          Forneça o contexto necessário para a Inteligência Artificial operar corretamente.
        </p>
      </div>

      <Card className="flex-1 flex flex-col shadow-sm border overflow-hidden">
        <CardHeader className="border-b bg-muted/10">
          <CardTitle className="text-xl">Instruções de Comportamento</CardTitle>
          <CardDescription>
            Preencha os dados abaixo para guiar o atendimento da IA.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-2">
            <Label
              htmlFor="title"
              className={cn(
                'flex items-center gap-2 text-base font-semibold',
                fieldErrors.title && 'text-destructive',
              )}
            >
              <Globe className="h-4 w-4" />
              Informações do Site *
            </Label>
            <p className="text-sm text-muted-foreground">
              URL do seu site ou detalhes sobre o seu negócio online.
            </p>
            <Input
              id="title"
              placeholder="Ex: https://meusite.com.br - Venda de produtos eletrônicos"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="max-w-xl"
            />
            {fieldErrors.title && <p className="text-sm text-destructive">{fieldErrors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="category"
              className={cn(
                'flex items-center gap-2 text-base font-semibold',
                fieldErrors.category && 'text-destructive',
              )}
            >
              <Tags className="h-4 w-4" />
              Tags
            </Label>
            <p className="text-sm text-muted-foreground">
              Palavras-chave que definem seu negócio ou categorização da base.
            </p>
            <Input
              id="category"
              placeholder="Ex: eletrônicos, suporte técnico, vendas"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="max-w-xl"
            />
            {fieldErrors.category && (
              <p className="text-sm text-destructive">{fieldErrors.category}</p>
            )}
          </div>

          <div className="space-y-2 flex flex-col flex-1 min-h-[250px]">
            <Label
              htmlFor="content"
              className={cn(
                'flex items-center gap-2 text-base font-semibold',
                fieldErrors.content && 'text-destructive',
              )}
            >
              <Bot className="h-4 w-4" />
              Orientações de como a IA deve proceder *
            </Label>
            <p className="text-sm text-muted-foreground">
              Instruções detalhadas, regras de atendimento e como a IA deve interagir com os
              clientes.
            </p>
            <Textarea
              id="content"
              placeholder="Ex: A IA deve ser educada e prestativa. Sempre perguntar o nome do cliente no início..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="flex-1 resize-none text-base"
            />
            {fieldErrors.content && (
              <p className="text-sm text-destructive">{fieldErrors.content}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="border-t p-4 bg-muted/10 flex justify-end">
          <Button
            size="lg"
            onClick={handleSave}
            disabled={saving || !form.title.trim() || !form.content.trim()}
          >
            {saving ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Save className="h-5 w-5 mr-2" />
            )}
            Salvar Configurações
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
