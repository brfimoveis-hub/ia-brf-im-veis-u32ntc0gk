import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import {
  Loader2,
  Save,
  Globe,
  Tags,
  Bot,
  Paperclip,
  Upload,
  FileText,
  Trash2,
  User,
  Mic,
  Info,
  MapPin,
  Briefcase,
  Headset,
  Volume2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBlocker } from 'react-router-dom'

const VOICE_PROFILES = [
  {
    id: 'bia_executiva',
    name: 'Bia Executiva',
    tone: 'Madura, pausada e autoritária',
    stability: 75,
    clarity: 80,
  },
  {
    id: 'bia_amiga',
    name: 'Bia Amiga',
    tone: 'Jovem, dinâmica e entusiasmada',
    stability: 45,
    clarity: 90,
  },
  {
    id: 'bia_consultora',
    name: 'Bia Consultora',
    tone: 'Equilibrada, empática e segura',
    stability: 60,
    clarity: 85,
  },
]

const AVATAR_STYLES = [
  {
    id: 'foco_regional',
    name: 'Foco Regional',
    description:
      'Visual de corretora local, fundo com praias ou centros urbanos de Biguaçu/Floripa',
    query: 'female%20realtor%20beach',
    icon: MapPin,
  },
  {
    id: 'foco_luxo',
    name: 'Foco Luxo',
    description:
      'Trajes executivos mais formais, fundo de escritório moderno ou decorado do Villa dos Açores',
    query: 'female%20executive%20modern%20office',
    icon: Briefcase,
  },
  {
    id: 'foco_agilidade',
    name: 'Foco Agilidade',
    description:
      'Visual moderno, com fone de ouvido estilo "central de inteligência", reforçando o suporte 24h',
    query: 'modern%20female%20support%20agent%20headset',
    icon: Headset,
  },
]

export default function KnowledgeBase() {
  const { user } = useAuth()
  const { toast } = useToast()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [entry, setEntry] = useState<KnowledgeBaseEntry | null>(null)
  const [form, setForm] = useState({ site: '', tags: '', ai_instructions: '' })
  const [initialForm, setInitialForm] = useState({ site: '', tags: '', ai_instructions: '' })

  const [userForm, setUserForm] = useState({
    ai_name: 'Bia',
    voice: 'bia_consultora',
    avatarStyle: 'foco_luxo',
  })
  const [initialUserForm, setInitialUserForm] = useState({
    ai_name: 'Bia',
    voice: 'bia_consultora',
    avatarStyle: 'foco_luxo',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const isDirty =
    form.site !== initialForm.site ||
    form.tags !== initialForm.tags ||
    form.ai_instructions !== initialForm.ai_instructions ||
    userForm.ai_name !== initialUserForm.ai_name ||
    userForm.voice !== initialUserForm.voice ||
    userForm.avatarStyle !== initialUserForm.avatarStyle ||
    avatarFile !== null

  const isDirtyRef = useRef(isDirty)
  useEffect(() => {
    isDirtyRef.current = isDirty
  }, [isDirty])

  const loadEntry = useCallback(
    async (resetForm: boolean = true) => {
      if (!user) return
      try {
        const [loadedEntry, loadedUser] = await Promise.all([
          getFirstKnowledgeBaseEntry(user.id),
          pb.collection('users').getOne(user.id),
        ])

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
            const defaultInstructions = `{
  "project": "Ia Uazapi Skip",
  "agent": "Bia",
  "version": "1.2 - Consolidada",
  "system_prompt": "Você é Bia, a assistente virtual de vendas da BRF Imóveis para o Villa dos Açores. Sua missão é identificar a origem do lead, qualificar e fechar a venda com cordialidade e precisão.\\n\\n[DIRETRIZES DE ENTRADA]\\n- Saude dinamicamente: 'Bom dia', 'Boa tarde' ou 'Boa noite' conforme o horário.\\n- Identificação: 'Eu sou Bia, responsável pelo atendimento de todos os leads da nossa cadência'.\\n- MISSÃO 1: Identificar a origem absoluta. Script: 'Para eu falar com clareza e precisão absoluta, me confirme: por qual canal você nos encontrou (Instagram, Site, Google)?'.\\n\\n[BASE TÉCNICA - VILLA DOS AÇORES]\\n- Localização: Rio Caveiras, Biguaçu. Esquina Manoel Urbano Bueno com Simão Ludvig, ao lado da BR-101 duplicada.\\n- Planta LM311: 70,78 m², 2 quartos (1 suíte), sacada com churrasqueira privativa.\\n- Estrutura: 4 torres com lazer completo (Piscina com deck, Playground, Pet place, Fitness, Kids area).\\n- Comercial: Valor de R$ 4.930,77 por m².\\n\\n[ESTRATÉGIA DE CONVERSÃO E REMARKETING]\\nSiga a cadência de 10 passos para levar o cliente ao fechamento:\\n1. Origem: Identificação do canal de entrada.\\n2. Localização: Destaque da facilidade de acesso pela BR-101.\\n3. Lazer: Apresentação da piscina e áreas de convivência.\\n4. Planta: Detalhamento do modelo LM311 (70,78m²).\\n5. Valorização: Foco no preço competitivo (R$ 4.930,77/m²).\\n6. Segurança: Condomínio fechado e infraestrutura das torres.\\n7. Família: Destaque para Kids area e Playground.\\n8. Pets: Informações sobre o Pet place.\\n9. Urgência: Alerta de unidades limitadas e fim de tabela.\\n10. Visita: Convite final agressivo para o decorado e fechamento.\\n\\n[TOM DE VOZ]\\nCordial, objetivo, dinâmico e profundo. Toda interação deve terminar com uma Pergunta de Fechamento ou Chamada para Ação (CTA).",
  "config": {
    "temperature": 0.7,
    "model": "gpt-4o"
  }
}`
            setForm({ site: '', tags: '', ai_instructions: defaultInstructions })
            setInitialForm({ site: '', tags: '', ai_instructions: defaultInstructions })
          }
        }

        if (resetForm || !isDirtyRef.current) {
          let voice = 'bia_consultora'
          let avatarStyle = 'foco_luxo'

          if (loadedUser.ai_voice_id) {
            try {
              if (loadedUser.ai_voice_id.startsWith('{')) {
                const parsed = JSON.parse(loadedUser.ai_voice_id)
                voice = parsed.voice || voice
                avatarStyle = parsed.avatarStyle || avatarStyle
              } else {
                // Fallback for old simple string data
                voice = loadedUser.ai_voice_id
              }
            } catch (e) {
              voice = loadedUser.ai_voice_id
            }
          }

          const uFormData = {
            ai_name: loadedUser.ai_name || 'Bia',
            voice,
            avatarStyle,
          }
          setUserForm(uFormData)
          setInitialUserForm(uFormData)
          if (loadedUser.ai_avatar) {
            setAvatarPreview(pb.files.getURL(loadedUser, loadedUser.ai_avatar))
          } else {
            setAvatarPreview(null)
          }
          setAvatarFile(null)
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
    if (!isDirtyRef.current) {
      if (e.action === 'update' && e.record.id === entry?.id) {
        loadEntry(false)
      } else if (e.action === 'create' && e.record.user_id === user?.id) {
        loadEntry(false)
      }
    }
  })

  useRealtime('users', (e) => {
    if (!isDirtyRef.current && e.action === 'update' && e.record.id === user?.id) {
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
        'Você tem informações não salvas. Deseja sair sem salvar?',
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
        let updatedEntry
        if (entry?.id) {
          updatedEntry = await updateKnowledgeBaseEntry(entry.id, {
            site: formToSave.site,
            tags: formToSave.tags,
            ai_instructions: formToSave.ai_instructions,
          })
        } else {
          updatedEntry = await createKnowledgeBaseEntry({
            user_id: user.id,
            site: formToSave.site,
            tags: formToSave.tags,
            ai_instructions: formToSave.ai_instructions,
          })
        }
        setEntry(updatedEntry)
        setInitialForm(formToSave)

        let updatedUser = false
        const userData = new FormData()
        const finalAiName = userForm.ai_name.trim() || 'Bia'
        const currentVoiceJson = JSON.stringify({
          voice: userForm.voice,
          avatarStyle: userForm.avatarStyle,
        })
        const initialVoiceJson = JSON.stringify({
          voice: initialUserForm.voice,
          avatarStyle: initialUserForm.avatarStyle,
        })

        if (finalAiName !== initialUserForm.ai_name) {
          userData.append('ai_name', finalAiName)
          updatedUser = true
        }
        if (currentVoiceJson !== initialVoiceJson) {
          userData.append('ai_voice_id', currentVoiceJson)
          updatedUser = true
        }
        if (avatarFile) {
          userData.append('ai_avatar', avatarFile)
          updatedUser = true
        }

        if (updatedUser) {
          const savedUser = await pb.collection('users').update(user.id, userData)

          let savedVoice = 'bia_consultora'
          let savedAvatarStyle = 'foco_luxo'
          if (savedUser.ai_voice_id) {
            try {
              const parsed = JSON.parse(savedUser.ai_voice_id)
              savedVoice = parsed.voice || savedVoice
              savedAvatarStyle = parsed.avatarStyle || savedAvatarStyle
            } catch {
              /* intentionally ignored */
            }
          }

          const newUForm = {
            ai_name: savedUser.ai_name || 'Bia',
            voice: savedVoice,
            avatarStyle: savedAvatarStyle,
          }
          setUserForm(newUForm)
          setInitialUserForm(newUForm)
          if (savedUser.ai_avatar) {
            setAvatarPreview(pb.files.getURL(savedUser, savedUser.ai_avatar))
          }
          setAvatarFile(null)
        }

        if (!silent) toast({ title: 'Alterações salvas com sucesso!' })
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
    [user, entry?.id, form, userForm, initialUserForm, avatarFile, toast],
  )

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0 || !user) return

    setUploading(true)
    try {
      const formData = new FormData()

      let xmlContextToAdd = ''
      for (const file of Array.from(files)) {
        if (file.name.toLowerCase().endsWith('.xml')) {
          try {
            const text = await file.text()
            const parser = new DOMParser()
            const xmlDoc = parser.parseFromString(text, 'text/xml')

            const elements = Array.from(xmlDoc.getElementsByTagName('*'))
            const extractedText = elements
              .map((el) => {
                return Array.from(el.childNodes)
                  .filter((node) => node.nodeType === Node.TEXT_NODE)
                  .map((node) => node.textContent?.trim())
                  .filter(Boolean)
                  .join(' ')
              })
              .filter(Boolean)
              .join('\n')

            const finalContext = extractedText || text
            xmlContextToAdd += `\n\n--- Conteúdo Estruturado (${file.name}) ---\n${finalContext}\n---------------------------\n`
          } catch (e) {
            console.error('Failed to parse XML file:', e)
          }
        }
      }

      if (entry?.id) {
        Array.from(files).forEach((file) => formData.append('attachments+', file))
        if (xmlContextToAdd) {
          const currentContent = entry.content || ''
          formData.append('content', currentContent + xmlContextToAdd)
        }
        const updatedEntry = await pb
          .collection('knowledge_base')
          .update<KnowledgeBaseEntry>(entry.id, formData)
        setEntry(updatedEntry)
      } else {
        formData.append('user_id', user.id)
        formData.append('site', form.site)
        formData.append('tags', form.tags)
        formData.append('ai_instructions', form.ai_instructions)
        if (xmlContextToAdd) {
          formData.append('content', xmlContextToAdd)
        }
        Array.from(files).forEach((file) => formData.append('attachments', file))
        const newEntry = await pb.collection('knowledge_base').create<KnowledgeBaseEntry>(formData)
        setEntry(newEntry)
        setInitialForm(form)
      }

      toast({ title: 'Arquivo enviado com sucesso e integrado à base de conhecimento' })
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

      const updatedEntry = await pb
        .collection('knowledge_base')
        .update<KnowledgeBaseEntry>(entry.id, formData)
      setEntry(updatedEntry)
      toast({ title: 'Arquivo removido com sucesso' })
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
        <div className="h-1 bg-purple-500 w-full"></div>
        <CardHeader className="bg-muted/10 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 rounded-xl">
              <User className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-xl">Identidade da IA</CardTitle>
              <CardDescription>
                Personalize o nome, a foto e a voz da sua assistente virtual.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-8 mb-8">
            <div className="flex flex-col items-center space-y-4 lg:w-1/4">
              <Avatar className="h-32 w-32 border-4 border-background shadow-md">
                <AvatarImage
                  src={
                    avatarPreview ||
                    `https://img.usecurling.com/p/256/256?q=${AVATAR_STYLES.find((s) => s.id === userForm.avatarStyle)?.query}&dpr=2`
                  }
                  className="object-cover bg-muted"
                />
                <AvatarFallback className="text-3xl bg-primary/10 text-primary font-medium">
                  {userForm.ai_name?.charAt(0)?.toUpperCase() || 'B'}
                </AvatarFallback>
              </Avatar>
              <div className="text-center w-full">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  ref={avatarInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setAvatarFile(file)
                      setAvatarPreview(URL.createObjectURL(file))
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={saving}
                  className="w-full max-w-[200px]"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Personalizado
                </Button>
                {avatarPreview && !avatarFile && (
                  <p className="text-xs text-muted-foreground mt-3 px-2">
                    Sua foto salva prevalece sobre o estilo visual escolhido.
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-8">
              <div className="space-y-2">
                <Label htmlFor="ai_name" className="text-base font-semibold">
                  Nome da IA
                </Label>
                <p className="text-sm text-muted-foreground">
                  Como a inteligência artificial deve se chamar ao interagir com os clientes.
                </p>
                <Input
                  id="ai_name"
                  placeholder="Ex: Bia"
                  value={userForm.ai_name}
                  onChange={(e) => setUserForm({ ...userForm, ai_name: e.target.value })}
                  className="max-w-md text-lg font-medium"
                  disabled={saving}
                />
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">Estilo Visual da IA (Avatar)</Label>
                <p className="text-sm text-muted-foreground">
                  Escolha o foco da identidade visual caso não envie uma foto personalizada.
                </p>
                <RadioGroup
                  value={userForm.avatarStyle}
                  onValueChange={(v) => setUserForm({ ...userForm, avatarStyle: v })}
                  className="grid grid-cols-1 xl:grid-cols-3 gap-4"
                  disabled={saving}
                >
                  {AVATAR_STYLES.map((style) => (
                    <div key={style.id}>
                      <RadioGroupItem
                        value={style.id}
                        id={`avatar-${style.id}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`avatar-${style.id}`}
                        className="flex flex-col rounded-xl border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer h-full transition-all"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-muted rounded-md text-foreground peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground transition-colors">
                            <style.icon className="h-4 w-4" />
                          </div>
                          <span className="font-semibold text-sm">{style.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground leading-relaxed flex-1">
                          {style.description}
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
          </div>

          <div className="border-t pt-8 space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Perfil de Voz</Label>
              <p className="text-sm text-muted-foreground">
                Selecione a persona de voz que a IA utilizará para enviar respostas em áudio.
              </p>
              <RadioGroup
                value={userForm.voice}
                onValueChange={(v) => setUserForm({ ...userForm, voice: v })}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                disabled={saving}
              >
                {VOICE_PROFILES.map((profile) => (
                  <div key={profile.id}>
                    <RadioGroupItem
                      value={profile.id}
                      id={`voice-${profile.id}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`voice-${profile.id}`}
                      className="flex flex-col items-center text-center rounded-xl border-2 border-muted bg-card p-5 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer h-full transition-all relative overflow-hidden group"
                    >
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="p-1.5 rounded-full bg-muted text-muted-foreground hover:text-foreground">
                              <Info className="h-4 w-4" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="text-sm p-3 space-y-1" side="top">
                            <p>
                              <strong>Estabilidade:</strong> {profile.stability}%
                            </p>
                            <p>
                              <strong>Clareza:</strong> {profile.clarity}%
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary transition-colors peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground">
                        <Volume2 className="h-6 w-6" />
                      </div>
                      <span className="font-semibold mb-1 text-base">{profile.name}</span>
                      <span className="text-xs text-muted-foreground mb-4">{profile.tone}</span>

                      <div className="w-full mt-auto pt-4 border-t flex justify-around text-xs text-muted-foreground">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-medium text-foreground text-sm">
                            {profile.stability}%
                          </span>
                          <span className="text-[10px] uppercase tracking-wider">Estabilidade</span>
                        </div>
                        <div className="w-px h-8 bg-border"></div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-medium text-foreground text-sm">
                            {profile.clarity}%
                          </span>
                          <span className="text-[10px] uppercase tracking-wider">Clareza</span>
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="bg-muted/30 p-5 rounded-xl border border-border/50 shadow-sm mt-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
                <Mic className="h-4 w-4 text-primary" />
                Script de Teste de Voz Padrão
              </h4>
              <p className="text-sm text-muted-foreground italic leading-relaxed border-l-2 border-primary/40 pl-4 py-1">
                "Bom dia! Eu sou {userForm.ai_name || 'Bia'}, responsável pelo atendimento do Villa
                dos Açores. Antes de te passar todos os detalhes da planta LM311, por onde você nos
                conheceu? Quero garantir que sua experiência aqui seja impecável."
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
              disabled={loading || saving}
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
              disabled={loading || saving}
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
              disabled={loading || saving}
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
                  Faça upload de documentos (PDF, TXT, DOCX, XML) para a IA usar como contexto.
                </p>
              </div>
              <div>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.txt,.doc,.docx,.xml,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/xml,text/xml"
                />{' '}
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
