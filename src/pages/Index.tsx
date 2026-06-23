import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage, extractFieldErrors } from '@/lib/pocketbase/errors'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Upload, FileText, Brain, MessageSquare, Save, CheckCircle2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const formSchema = z.object({
  ai_name: z
    .string()
    .min(1, 'O nome é obrigatório')
    .refine((val) => val === 'Bia', {
      message: 'O nome da IA deve ser Bia',
    }),
  ai_voice_id: z.string().min(1, 'Selecione uma voz'),
  ai_instructions: z
    .string()
    .min(10, 'Forneça instruções estratégicas mais detalhadas (min 10 caracteres)'),
  bia_instructions: z
    .string()
    .min(10, 'Forneça instruções de personalidade mais detalhadas (min 10 caracteres)'),
})

const AVATAR_PRESETS = [
  'https://img.usecurling.com/p/256/256?q=mature%20female%20realtor%20blazer',
  'https://img.usecurling.com/p/256/256?q=professional%20business%20woman%20suit',
  'https://img.usecurling.com/p/256/256?q=elegant%20realtor%20woman%20office',
]

export default function Dashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [selectedPresetUrl, setSelectedPresetUrl] = useState<string | null>(null)
  const [selectedPresetFile, setSelectedPresetFile] = useState<File | null>(null)
  const [knowledgeFiles, setKnowledgeFiles] = useState<FileList | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ai_name: 'Bia',
      ai_voice_id: user?.ai_voice_id || 'br_female_1',
      ai_instructions: user?.ai_instructions || '',
      bia_instructions: user?.bia_instructions || '',
    },
  })

  const handlePresetSelect = async (url: string) => {
    setSelectedPresetUrl(url)
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const file = new File([blob], 'avatar.jpg', { type: blob.type })
      setSelectedPresetFile(file)
    } catch (err) {
      console.error('Failed to fetch preset image', err)
      toast({
        title: 'Erro',
        description: 'Não foi possível selecionar este avatar no momento.',
        variant: 'destructive',
      })
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return
    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('ai_name', 'Bia') // Always force "Bia"
      formData.append('ai_voice_id', values.ai_voice_id)
      formData.append('ai_instructions', values.ai_instructions)
      formData.append('bia_instructions', values.bia_instructions)

      if (selectedPresetFile) {
        formData.append('ai_avatar', selectedPresetFile)
      }

      if (knowledgeFiles && knowledgeFiles.length > 0) {
        for (let i = 0; i < knowledgeFiles.length; i++) {
          formData.append('ai_knowledge_files', knowledgeFiles[i])
        }
      }

      await pb.collection('users').update(user.id, formData)

      toast({
        title: 'Configurações atualizadas',
        description: 'As alterações agora estão ativas no WhatsApp (Uazapi) e no CRM.',
      })

      setKnowledgeFiles(null)
      const fileInput = document.getElementById('knowledge_files') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } catch (err) {
      const fieldErrors = extractFieldErrors(err)
      if (Object.keys(fieldErrors).length > 0) {
        Object.entries(fieldErrors).forEach(([field, msg]) => {
          form.setError(field as any, { message: msg })
        })
      } else {
        toast({
          title: 'Erro ao salvar',
          description: getErrorMessage(err),
          variant: 'destructive',
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" /> Cérebro do Sistema
          </h1>
          <p className="text-slate-500 mt-1">
            Central de inteligência para gestão da IA Mãe e Persona Bia.
          </p>
        </div>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={isSaving}
          className="w-full md:w-auto"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar Configurações
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 shadow-sm border-slate-200 h-fit">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">Identidade Visual</CardTitle>
                <CardDescription>
                  Selecione o avatar e a voz da assistente profissional.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="ai_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Inteligência</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          readOnly
                          className="bg-slate-50 text-slate-500 font-medium cursor-not-allowed"
                        />
                      </FormControl>
                      <FormDescription>O nome padrão foi consolidado como "Bia".</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormLabel>Avatar Profissional</FormLabel>
                  <div className="grid grid-cols-3 gap-3">
                    {AVATAR_PRESETS.map((url, idx) => {
                      const isSelected =
                        selectedPresetUrl === url ||
                        (!selectedPresetUrl &&
                          user?.ai_avatar &&
                          pb.files.getUrl(user, user.ai_avatar) === url)
                      return (
                        <div
                          key={idx}
                          onClick={() => handlePresetSelect(url)}
                          className={cn(
                            'cursor-pointer rounded-lg border-2 overflow-hidden transition-all duration-200 relative aspect-square group',
                            isSelected
                              ? 'border-primary ring-2 ring-primary/20 ring-offset-1'
                              : 'border-transparent hover:border-slate-300',
                          )}
                        >
                          <img
                            src={url}
                            alt={`Avatar ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-primary text-white rounded-full p-0.5 shadow-sm">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {user?.ai_avatar && !selectedPresetUrl && (
                    <div className="mt-4 flex items-center gap-3 p-3 bg-slate-50 rounded-md border border-slate-100">
                      <Avatar className="h-10 w-10 border border-slate-200">
                        <AvatarImage src={pb.files.getUrl(user, user.ai_avatar)} />
                        <AvatarFallback>BIA</AvatarFallback>
                      </Avatar>
                      <div className="text-sm text-slate-600 font-medium">Avatar atual em uso</div>
                    </div>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="ai_voice_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voz de Áudio (TTS)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a voz" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="br_female_1">Voz Profissional 1</SelectItem>
                          <SelectItem value="br_female_2">Voz Profissional 2</SelectItem>
                          <SelectItem value="br_female_3">Voz Profissional 3</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="md:col-span-2 space-y-6">
              <Card className="shadow-sm border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5 text-indigo-500" />
                    IA Mãe (Cérebro Estratégico)
                  </CardTitle>
                  <CardDescription>
                    Regras de negócio, diretrizes de qualificação e estratégia de longo prazo.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="ai_instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Descreva as regras da imobiliária, processos de fechamento..."
                            className="min-h-[160px] resize-y font-mono text-sm leading-relaxed"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="shadow-sm border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-emerald-500" />
                    Persona Bia (Atendimento)
                  </CardTitle>
                  <CardDescription>
                    Tom de voz, estilo de comunicação e como ela interage com clientes no WhatsApp.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="bia_instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Seja cordial, evite jargões excessivos, seja objetiva..."
                            className="min-h-[160px] resize-y font-mono text-sm leading-relaxed"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="shadow-sm border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-amber-500" />
                    Base de Conhecimento
                  </CardTitle>
                  <CardDescription>
                    Faça upload de PDFs, planilhas ou documentos para alimentar a inteligência da
                    Bia.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col justify-center items-center p-6 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <Upload className="h-8 w-8 text-slate-400 mb-3" />
                    <p className="text-sm text-slate-600 font-medium mb-1">
                      Arraste arquivos ou clique para selecionar
                    </p>
                    <p className="text-xs text-slate-500 mb-4">PDF, DOCX, XLSX ou TXT (Max 5MB)</p>
                    <Input
                      id="knowledge_files"
                      type="file"
                      multiple
                      className="max-w-xs cursor-pointer"
                      onChange={(e) => setKnowledgeFiles(e.target.files)}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                    />
                  </div>

                  {user?.ai_knowledge_files && (
                    <div className="bg-white border rounded-md p-3">
                      <p className="text-sm font-medium mb-2 text-slate-700">
                        Arquivos atuais na base:
                      </p>
                      <ul className="space-y-2">
                        {(Array.isArray(user.ai_knowledge_files)
                          ? user.ai_knowledge_files
                          : [user.ai_knowledge_files]
                        ).map((filename: string, idx: number) => (
                          <li
                            key={idx}
                            className="flex items-center text-sm text-slate-600 bg-slate-50 p-2 rounded"
                          >
                            <FileText className="h-4 w-4 mr-2 text-slate-400 flex-shrink-0" />
                            <a
                              href={pb.files.getUrl(user, filename)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline hover:text-primary truncate max-w-full"
                            >
                              {filename}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
