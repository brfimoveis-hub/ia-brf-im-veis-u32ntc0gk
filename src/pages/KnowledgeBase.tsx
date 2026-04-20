import { useState, useEffect, useCallback, useRef } from 'react'
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
import { useRealtime } from '@/hooks/use-realtime'
import {
  getKnowledgeBaseEntries,
  createKnowledgeBaseEntry,
  updateKnowledgeBaseEntry,
  KnowledgeBaseEntry,
} from '@/services/knowledge_base'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'
import { Loader2, Save, Globe, Tags, Bot, Paperclip, Upload, FileText, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function KnowledgeBase() {
  const { user } = useAuth()
  const { toast } = useToast()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [entry, setEntry] = useState<KnowledgeBaseEntry | null>(null)
  const [form, setForm] = useState({ site: '', tags: '', ai_instructions: '' })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const loadEntry = useCallback(
    async (resetForm: boolean = true) => {
      if (!user) return
      try {
        const entries = await getKnowledgeBaseEntries()
        if (entries.length > 0) {
          const loadedEntry = entries[0]
          setEntry(loadedEntry)
          if (resetForm) {
            setForm({
              site: loadedEntry.site || '',
              tags: loadedEntry.tags || '',
              ai_instructions: loadedEntry.ai_instructions || '',
            })
          }
        }
      } catch (err) {
        toast({ title: 'Erro ao carregar configurações', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    },
    [user, toast],
  )

  useEffect(() => {
    loadEntry(true)
  }, [loadEntry])

  useRealtime('knowledge_base', (e) => {
    if (e.action === 'update' && e.record.id === entry?.id) {
      loadEntry(false)
    } else if (e.action === 'create' && e.record.user_id === user?.id) {
      loadEntry(false)
    }
  })

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setFieldErrors({})
    try {
      if (entry?.id) {
        await updateKnowledgeBaseEntry(entry.id, form)
        toast({ title: 'Configurações salvas com sucesso!' })
      } else {
        const newEntry = await createKnowledgeBaseEntry({ user_id: user.id, ...form })
        setEntry(newEntry)
        toast({ title: 'Configurações salvas com sucesso!' })
      }
      loadEntry(false)
    } catch (err) {
      setFieldErrors(extractFieldErrors(err))
      toast({
        title: 'Erro ao salvar as configurações. Tente novamente.',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0 || !user) return

    setUploading(true)
    try {
      const formData = new FormData()

      if (entry?.attachments) {
        entry.attachments.forEach((att) => formData.append('attachments', att))
      }

      Array.from(files).forEach((file) => formData.append('attachments', file))

      if (entry?.id) {
        await pb.collection('knowledge_base').update(entry.id, formData)
      } else {
        formData.append('user_id', user.id)
        formData.append('site', form.site)
        formData.append('tags', form.tags)
        formData.append('ai_instructions', form.ai_instructions)
        const newEntry = await pb.collection('knowledge_base').create<KnowledgeBaseEntry>(formData)
        setEntry(newEntry)
      }

      toast({ title: 'Arquivo enviado com sucesso e integrado à base de conhecimento' })
      loadEntry(false)
    } catch (err) {
      toast({
        title: 'Erro ao enviar arquivo',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteFile = async (filenameToDelete: string) => {
    if (!entry?.id || !user) return
    try {
      const formData = new FormData()
      const filesToKeep = (entry.attachments || []).filter((f) => f !== filenameToDelete)

      if (filesToKeep.length > 0) {
        filesToKeep.forEach((att) => formData.append('attachments', att))
      } else {
        formData.append('attachments', '')
      }

      await pb.collection('knowledge_base').update(entry.id, formData)
      toast({ title: 'Arquivo removido com sucesso' })
      loadEntry(false)
    } catch (err) {
      toast({
        title: 'Erro ao remover arquivo',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
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
              htmlFor="site"
              className={cn(
                'flex items-center gap-2 text-base font-semibold',
                fieldErrors.site && 'text-destructive',
              )}
            >
              <Globe className="h-4 w-4" />
              Site
            </Label>
            <p className="text-sm text-muted-foreground">
              URL do seu site ou detalhes sobre o seu negócio online.
            </p>
            <Input
              id="site"
              placeholder="Ex: https://meusite.com.br - Venda de produtos eletrônicos"
              value={form.site}
              onChange={(e) => setForm({ ...form, site: e.target.value })}
              className="max-w-xl"
            />
            {fieldErrors.site && <p className="text-sm text-destructive">{fieldErrors.site}</p>}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="tags"
              className={cn(
                'flex items-center gap-2 text-base font-semibold',
                fieldErrors.tags && 'text-destructive',
              )}
            >
              <Tags className="h-4 w-4" />
              Tags
            </Label>
            <p className="text-sm text-muted-foreground">
              Palavras-chave que definem seu negócio ou configurações de Facebook Ads.
            </p>
            <Input
              id="tags"
              placeholder="Ex: Facebook Ads, eletrônicos, suporte técnico"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="max-w-xl"
            />
            {fieldErrors.tags && <p className="text-sm text-destructive">{fieldErrors.tags}</p>}
          </div>

          <div className="space-y-2 flex flex-col flex-1 min-h-[250px]">
            <Label
              htmlFor="ai_instructions"
              className={cn(
                'flex items-center gap-2 text-base font-semibold',
                fieldErrors.ai_instructions && 'text-destructive',
              )}
            >
              <Bot className="h-4 w-4" />
              Orientações de como a IA deve proceder
            </Label>
            <p className="text-sm text-muted-foreground">
              Instruções detalhadas, regras de atendimento e como a IA deve interagir com os
              clientes.
            </p>
            <Textarea
              id="ai_instructions"
              placeholder="Ex: A IA deve ser educada e prestativa. Sempre perguntar o nome do cliente no início..."
              value={form.ai_instructions}
              onChange={(e) => setForm({ ...form, ai_instructions: e.target.value })}
              className="flex-1 resize-none text-base"
            />
            {fieldErrors.ai_instructions && (
              <p className="text-sm text-destructive">{fieldErrors.ai_instructions}</p>
            )}
          </div>

          <div className="space-y-4 pt-6 border-t mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <Label className="flex items-center gap-2 text-base font-semibold">
                  <Paperclip className="h-4 w-4" />
                  Arquivos Anexos
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Faça upload de documentos (PDF, TXT, DOCX) para a IA usar como contexto.
                </p>
              </div>
              <div>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploading ? 'Enviando...' : 'Subir Arquivos'}
                </Button>
              </div>
            </div>

            {entry?.attachments && entry.attachments.length > 0 && (
              <ul className="space-y-2 mt-4">
                {entry.attachments.map((filename, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between p-3 bg-muted/20 rounded-md border text-sm"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <a
                        href={pb.files.getURL(entry, filename)}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline text-foreground truncate font-medium"
                      >
                        {filename}
                      </a>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteFile(filename)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>

        <CardFooter className="border-t p-4 bg-muted/10 flex justify-end gap-2">
          <Button size="lg" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Save className="h-5 w-5 mr-2" />
            )}
            Salvar
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
