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
  getFirstKnowledgeBaseEntry,
  createKnowledgeBaseEntry,
  updateKnowledgeBaseEntry,
  KnowledgeBaseEntry,
} from '@/services/knowledge_base'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'
import { Loader2, Save, Globe, Tags, Bot, Paperclip, Upload, FileText, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBlocker } from 'react-router-dom'

export default function KnowledgeBase() {
  const { user } = useAuth()
  const { toast } = useToast()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [entry, setEntry] = useState<KnowledgeBaseEntry | null>(null)
  const [form, setForm] = useState({ site: '', tags: '', ai_instructions: '' })
  const [initialForm, setInitialForm] = useState({ site: '', tags: '', ai_instructions: '' })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const isDirty =
    form.site !== initialForm.site ||
    form.tags !== initialForm.tags ||
    form.ai_instructions !== initialForm.ai_instructions

  const isDirtyRef = useRef(isDirty)
  useEffect(() => {
    isDirtyRef.current = isDirty
  }, [isDirty])

  const loadEntry = useCallback(
    async (resetForm: boolean = true) => {
      if (!user) return
      try {
        const loadedEntry = await getFirstKnowledgeBaseEntry(user.id)
        if (loadedEntry) {
          setEntry(loadedEntry)
          if (resetForm || !isDirtyRef.current) {
            const formData = {
              site: loadedEntry.site || '',
              tags: loadedEntry.tags || '',
              ai_instructions: loadedEntry.ai_instructions || '',
            }
            setForm(formData)
            setInitialForm(formData)
          }
        } else {
          setEntry(null)
          if (resetForm || !isDirtyRef.current) {
            setForm({ site: '', tags: '', ai_instructions: '' })
            setInitialForm({ site: '', tags: '', ai_instructions: '' })
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

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const confirmLeave = window.confirm(
        'Você tem informações de texto não salvas. Deseja sair sem salvar?',
      )
      if (confirmLeave) {
        blocker.proceed()
      } else {
        blocker.reset()
      }
    }
  }, [blocker])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const handleSave = useCallback(
    async (silent = false) => {
      if (!user) return
      setSaving(true)
      setFieldErrors({})
      const formToSave = form
      try {
        if (entry?.id) {
          await updateKnowledgeBaseEntry(entry.id, formToSave)
          if (!silent) toast({ title: 'Configurações salvas com sucesso!' })
        } else {
          const newEntry = await createKnowledgeBaseEntry({ user_id: user.id, ...formToSave })
          setEntry(newEntry)
          if (!silent) toast({ title: 'Configurações salvas com sucesso!' })
        }
        setInitialForm(formToSave)
        loadEntry(false)
      } catch (err) {
        setFieldErrors(extractFieldErrors(err))
        if (!silent) {
          toast({
            title: 'Erro ao salvar as configurações. Tente novamente.',
            description: getErrorMessage(err),
            variant: 'destructive',
          })
        }
      } finally {
        setSaving(false)
      }
    },
    [user, entry?.id, form, loadEntry, toast],
  )

  useEffect(() => {
    if (!isDirty || saving) return

    const timer = setTimeout(() => {
      handleSave(true)
    }, 2500)

    return () => clearTimeout(timer)
  }, [form, isDirty, saving, handleSave])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0 || !user) return

    setUploading(true)
    try {
      const formData = new FormData()

      if (entry?.id) {
        Array.from(files).forEach((file) => formData.append('attachments+', file))
        await pb.collection('knowledge_base').update(entry.id, formData)
      } else {
        formData.append('user_id', user.id)
        formData.append('site', form.site)
        formData.append('tags', form.tags)
        formData.append('ai_instructions', form.ai_instructions)
        Array.from(files).forEach((file) => formData.append('attachments', file))
        const newEntry = await pb.collection('knowledge_base').create<KnowledgeBaseEntry>(formData)
        setEntry(newEntry)
        setInitialForm(form)
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
      formData.append('attachments-', filenameToDelete)

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
    <div className="max-w-5xl mx-auto space-y-8 pb-24 p-4 md:p-6">
      <div className="space-y-2 mb-2">
        <h2 className="text-3xl font-bold tracking-tight text-secondary">Base de Conhecimento</h2>
        <p className="text-muted-foreground mt-2 text-lg">
          Forneça o contexto, regras e documentos para guiar o atendimento da IA.
        </p>
      </div>

      <Card className="border-border shadow-elevation overflow-hidden">
        <div className="h-1 bg-blue-500 w-full"></div>
        <CardHeader className="bg-muted/10 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl">
              <Bot className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-xl">Instruções de Comportamento</CardTitle>
              <CardDescription>
                Preencha os dados abaixo para guiar o atendimento da IA.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
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
      </Card>

      {/* Floating Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border flex justify-end md:pl-[var(--sidebar-width)] z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl w-full mx-auto flex justify-end items-center gap-4 px-4 md:px-0">
          {isDirty && (
            <span className="text-sm text-amber-500 font-medium hidden sm:inline-block">
              Alterações não salvas
            </span>
          )}
          <Button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="shadow-md px-8 h-11 hover:scale-105 transition-transform"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </span>
            ) : (
              <span className="flex items-center gap-2 font-medium">
                <Save className="h-5 w-5" />
                Salvar Alterações
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
