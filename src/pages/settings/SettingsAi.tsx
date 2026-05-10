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
  bia_executiva: {
    id: 'bia_executiva',
    name: 'BIA Executiva',
    instructions:
      'Você é a BIA Executiva, assistente virtual de alto nível da BRF Imóveis. Seja formal, direta e orientada a resultados. Seu objetivo é atender clientes de alto padrão, focando em investimentos e imóveis premium.',
    voice_id: 'bia_executiva_v1',
    avatar_url: 'https://img.usecurling.com/ppl/thumbnail?gender=female&seed=10',
  },
  bia_regional: {
    id: 'bia_regional',
    name: 'BIA Regional',
    instructions:
      'Você é a BIA Regional, assistente da BRF Imóveis com conhecimento profundo da região. Seja acolhedora e informal. Destaque os benefícios de cada bairro, infraestrutura local e proximidade de serviços.',
    voice_id: 'bia_regional_v1',
    avatar_url: 'https://img.usecurling.com/ppl/thumbnail?gender=female&seed=11',
  },
  bia_profissional: {
    id: 'bia_profissional',
    name: 'BIA Profissional',
    instructions:
      'Você é a BIA Profissional, especialista técnica da BRF Imóveis. Seja clara, objetiva e foque em detalhes técnicos, financiamentos, documentação e viabilidade comercial.',
    voice_id: 'bia_profissional_v1',
    avatar_url: 'https://img.usecurling.com/ppl/thumbnail?gender=female&seed=12',
  },
}

type ProfileId = keyof typeof DEFAULT_PRESETS

export function SettingsAi() {
  const { user } = useAuth()

  const [activeProfileId, setActiveProfileId] = useState<ProfileId>('bia_executiva')
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
        setProfiles(JSON.parse(savedProfiles))
      } catch {
        /* intentionally ignored */
      }
    }
  }, [])

  useEffect(() => {
    if (user) {
      setAiName(user.ai_name || profiles.bia_executiva.name)
      setAiInstructions(user.ai_instructions || profiles.bia_executiva.instructions)
      setAiVoiceId(user.ai_voice_id || profiles.bia_executiva.voice_id)

      if (user.ai_avatar) {
        setAvatarPreview(pb.files.getURL(user, user.ai_avatar))
      } else {
        setAvatarPreview(profiles.bia_executiva.avatar_url)
      }

      const found = Object.values(profiles).find((p) => p.name === user.ai_name)
      if (found) setActiveProfileId(found.id as ProfileId)
    }
  }, [user])

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
        <CardTitle>Gerenciamento de Personas BIA</CardTitle>
        <CardDescription>
          Escolha e customize um dos perfis. O perfil que for salvo será o ativo em sua instância
          Uazapi.
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
          <Button onClick={handleSave} disabled={isSaving} size="lg" className="w-full sm:w-auto">
            {isSaving ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-5 w-5" />
            )}
            Ativar Perfil BIA
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
