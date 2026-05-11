import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Loader2, Upload, Sparkles, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEFAULT_PRESETS = {
  bia_elegante: {
    id: 'bia_elegante',
    name: 'BIA Elegante',
    instructions:
      'Você é a BIA Elegante, uma assistente virtual sofisticada e amigável. Seu tom é acolhedor, profissional e moderno. Especializada em atendimento premium.',
    voice_id: 'voice_harmonious_female_1',
    avatar_url: 'https://img.usecurling.com/p/256/256?q=elegant%20young%20woman%20smiling',
  },
  bia_jovem: {
    id: 'bia_jovem',
    name: 'BIA Jovem',
    instructions:
      'Você é a BIA Jovem, com uma abordagem enérgica, acolhedora e muito moderna. Foca em criar empatia rápida com o cliente.',
    voice_id: 'voice_harmonious_female_2',
    avatar_url: 'https://img.usecurling.com/p/256/256?q=friendly%20young%20woman',
  },
  bia_acolhedora: {
    id: 'bia_acolhedora',
    name: 'BIA Acolhedora',
    instructions:
      'Você é a BIA Acolhedora, muito paciente e atenciosa. Sua prioridade é fazer o cliente se sentir seguro e bem guiado em cada etapa.',
    voice_id: 'voice_harmonious_female_3',
    avatar_url: 'https://img.usecurling.com/p/256/256?q=kind%20woman%20portrait',
  },
  bia_executiva: {
    id: 'bia_executiva',
    name: 'BIA Executiva',
    instructions:
      'Você é a BIA Executiva. Seu tom é altamente profissional, seguro e formal, focado em clareza para clientes corporativos e investidores.',
    voice_id: 'voice_harmonious_female_4',
    avatar_url: 'https://img.usecurling.com/p/256/256?q=professional%20woman%20suit',
  },
  ia_mae_expert: {
    id: 'ia_mae_expert',
    name: 'IA Mãe Expert',
    instructions:
      'Você é a IA Mãe Expert, especializada no mercado imobiliário. Foca em dados precisos e conversão rápida (Nível 5), mantendo uma postura elegante.',
    voice_id: 'voice_harmonious_female_5',
    avatar_url: 'https://img.usecurling.com/p/256/256?q=smart%20young%20woman%20glasses',
  },
}

type ProfileId = keyof typeof DEFAULT_PRESETS

export function SettingsAi() {
  const { user } = useAuth()

  const [activeProfileId, setActiveProfileId] = useState<ProfileId>('bia_elegante')
  const [profiles, setProfiles] = useState(DEFAULT_PRESETS)

  const [aiName, setAiName] = useState('')
  const [aiInstructions, setAiInstructions] = useState('')
  const [aiVoiceId, setAiVoiceId] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const savedProfiles = localStorage.getItem('bia_profiles_custom')
    if (savedProfiles) {
      try {
        const parsed = JSON.parse(savedProfiles)
        if (!parsed.bia_elegante) {
          localStorage.removeItem('bia_profiles_custom')
        } else {
          setProfiles(parsed)
        }
      } catch {
        /* intentionally ignored */
      }
    }
  }, [])

  useEffect(() => {
    if (user) {
      setAiName(user.ai_name || profiles.bia_elegante.name)
      setAiInstructions(user.ai_instructions || profiles.bia_elegante.instructions)
      setAiVoiceId(user.ai_voice_id || profiles.bia_elegante.voice_id)

      if (user.ai_avatar) {
        setAvatarPreview(pb.files.getURL(user, user.ai_avatar))
      } else {
        setAvatarPreview(profiles.bia_elegante.avatar_url)
      }

      const found = Object.values(profiles).find((p) => p.name === user.ai_name)
      if (found) setActiveProfileId(found.id as ProfileId)
    }
  }, [user, profiles])

  const handleSelectProfile = (profileId: ProfileId) => {
    setActiveProfileId(profileId)
    const profile = profiles[profileId]
    setAiName(profile.name)
    setAiInstructions(profile.instructions)
    setAiVoiceId(profile.voice_id)
    setAvatarPreview(profile.avatar_url)
    setAvatarFile(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const objUrl = URL.createObjectURL(file)
      setAvatarPreview(objUrl)

      setProfiles((prev) => {
        const updated = {
          ...prev,
          [activeProfileId]: {
            ...prev[activeProfileId],
            avatar_url: objUrl,
          },
        }
        localStorage.setItem('bia_profiles_custom', JSON.stringify(updated))
        return updated
      })
    }
  }

  const handleFieldChange = (field: string, value: string) => {
    if (field === 'name') setAiName(value)
    if (field === 'instructions') setAiInstructions(value)
    if (field === 'voice_id') setAiVoiceId(value)

    setProfiles((prev) => {
      const updated = {
        ...prev,
        [activeProfileId]: {
          ...prev[activeProfileId],
          [field]: value,
        },
      }
      localStorage.setItem('bia_profiles_custom', JSON.stringify(updated))
      return updated
    })
  }

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('ai_name', aiName)
      formData.append('ai_instructions', aiInstructions)
      formData.append('ai_voice_id', aiVoiceId)

      if (avatarFile) {
        formData.append('ai_avatar', avatarFile)
      }

      const updatedUser = await pb.collection('users').update(user.id, formData)

      if (updatedUser.ai_avatar) {
        const newAvatarUrl = pb.files.getURL(updatedUser, updatedUser.ai_avatar)
        setAvatarPreview(newAvatarUrl)

        setProfiles((prev) => {
          const updated = {
            ...prev,
            [activeProfileId]: {
              ...prev[activeProfileId],
              avatar_url: newAvatarUrl,
            },
          }
          localStorage.setItem('bia_profiles_custom', JSON.stringify(updated))
          return updated
        })
      }

      toast.success('Perfil BIA ativado e salvo com sucesso!')
    } catch (err) {
      toast.error('Erro ao salvar o perfil BIA')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle>Configuração da Persona da IA</CardTitle>
        <CardDescription>
          Selecione um perfil visual e vocal para sua assistente virtual. Nossas novas personas
          oferecem uma imagem mais moderna, acolhedora e elegante.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.values(profiles).map((profile) => (
            <Card
              key={profile.id}
              className={cn(
                'cursor-pointer transition-all',
                activeProfileId === profile.id
                  ? 'border-primary shadow-md ring-1 ring-primary/30'
                  : 'border-border/50 hover:border-primary/50',
              )}
              onClick={() => handleSelectProfile(profile.id as ProfileId)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center space-y-3">
                <Avatar
                  className={cn(
                    'h-16 w-16 border-2',
                    activeProfileId === profile.id ? 'border-primary' : 'border-transparent',
                  )}
                >
                  <AvatarImage src={profile.avatar_url} className="object-cover" />
                  <AvatarFallback>{profile.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold flex items-center justify-center gap-1.5 text-sm">
                    {activeProfileId === profile.id && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                    {profile.name}
                  </h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="pt-6 border-t space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-lg flex items-center">
              <Sparkles className="mr-2 h-5 w-5 text-primary" />
              Customizando: {profiles[activeProfileId].name}
            </h3>
          </div>

          <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-6 sm:space-y-0 items-center sm:items-start">
            <Avatar className="h-24 w-24 border shadow-sm">
              <AvatarImage src={avatarPreview || ''} alt="AI Avatar" className="object-cover" />
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {aiName?.charAt(0) || 'IA'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-3 text-center sm:text-left">
              <div>
                <Label className="text-base">Foto de Perfil</Label>
                <p className="text-sm text-muted-foreground">
                  Esta imagem representará a IA nas conversas.
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-fit mx-auto sm:mx-0"
                size="sm"
              >
                <Upload className="mr-2 h-4 w-4" />
                Carregar Imagem
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aiName">Nome de Exibição</Label>
                <Input
                  id="aiName"
                  value={aiName}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="Ex: BIA Executiva"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aiVoiceId">ID da Voz</Label>
                <Input
                  id="aiVoiceId"
                  value={aiVoiceId}
                  onChange={(e) => handleFieldChange('voice_id', e.target.value)}
                  placeholder="Ex: pJ23x..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aiInstructions">Instruções de Comportamento (Prompt)</Label>
              <Textarea
                id="aiInstructions"
                value={aiInstructions}
                onChange={(e) => handleFieldChange('instructions', e.target.value)}
                placeholder="Instruções para o comportamento da IA..."
                className="min-h-[150px] resize-y"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            size="lg"
            className="w-full sm:w-auto"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-5 w-5" />
            )}
            Salvar Persona da IA
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
