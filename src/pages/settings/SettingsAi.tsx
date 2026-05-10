import { useState, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Loader2, Upload, Sparkles } from 'lucide-react'

const BIA_PRESETS = [
  {
    id: 'bia_executiva',
    name: 'BIA Executiva',
    instructions:
      'Você é a BIA Executiva, assistente virtual de alto nível da BRF Imóveis. Seja formal, direta e orientada a resultados. Seu objetivo é atender clientes de alto padrão, focando em investimentos e imóveis premium.',
    voice_id: 'bia_executiva_v1',
    avatar_url: 'https://img.usecurling.com/ppl/thumbnail?gender=female&seed=10',
  },
  {
    id: 'bia_regional',
    name: 'BIA Regional',
    instructions:
      'Você é a BIA Regional, assistente da BRF Imóveis com conhecimento profundo da região. Seja acolhedora e informal. Destaque os benefícios de cada bairro, infraestrutura local e proximidade de serviços.',
    voice_id: 'bia_regional_v1',
    avatar_url: 'https://img.usecurling.com/ppl/thumbnail?gender=female&seed=11',
  },
  {
    id: 'bia_profissional',
    name: 'BIA Profissional',
    instructions:
      'Você é a BIA Profissional, especialista técnica da BRF Imóveis. Seja clara, objetiva e foque em detalhes técnicos, financiamentos, documentação e viabilidade comercial.',
    voice_id: 'bia_profissional_v1',
    avatar_url: 'https://img.usecurling.com/ppl/thumbnail?gender=female&seed=12',
  },
]

export function SettingsAi() {
  const { user } = useAuth()
  const [aiName, setAiName] = useState(user?.ai_name || '')
  const [aiInstructions, setAiInstructions] = useState(user?.ai_instructions || '')
  const [aiVoiceId, setAiVoiceId] = useState(user?.ai_voice_id || '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.ai_avatar ? pb.files.getUrl(user, user.ai_avatar) : null,
  )
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSelectPreset = async (preset: (typeof BIA_PRESETS)[0]) => {
    setAiName(preset.name)
    setAiInstructions(preset.instructions)
    setAiVoiceId(preset.voice_id)
    setAvatarPreview(preset.avatar_url)

    try {
      const res = await fetch(preset.avatar_url)
      const blob = await res.blob()
      const file = new File([blob], `${preset.id}.jpg`, { type: blob.type })
      setAvatarFile(file)
      toast.success(`Template "${preset.name}" carregado. Não esqueça de salvar.`)
    } catch (e) {
      console.error('Erro ao baixar avatar do preset', e)
      toast.success(`Template "${preset.name}" carregado, mas sem foto.`)
    }
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
        setAvatarPreview(pb.files.getUrl(updatedUser, updatedUser.ai_avatar))
      }

      toast.success('Configurações de IA salvas com sucesso')
    } catch (err) {
      toast.error('Erro ao salvar configurações de IA')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle>Configurações da IA</CardTitle>
        <CardDescription>
          Personalize o comportamento e a identidade da sua Inteligência Artificial.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-6 sm:space-y-0">
          <Avatar className="h-24 w-24 border">
            <AvatarImage src={avatarPreview || ''} alt="AI Avatar" className="object-cover" />
            <AvatarFallback className="text-xl bg-primary/10 text-primary">
              {aiName?.charAt(0) || 'IA'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col justify-center space-y-3">
            <div>
              <Label className="text-base">Avatar da IA</Label>
              <p className="text-sm text-muted-foreground">Escolha uma imagem representativa.</p>
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
              className="w-fit"
            >
              <Upload className="mr-2 h-4 w-4" />
              Alterar Foto
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t space-y-4">
          <div className="space-y-3">
            <Label>Versões da Bia (Templates)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BIA_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  variant="outline"
                  className="flex flex-col items-start p-4 h-auto text-left space-y-1 hover:border-primary/50"
                  onClick={() => handleSelectPreset(preset)}
                >
                  <span className="font-semibold flex items-center">
                    <Sparkles className="h-4 w-4 mr-2 text-primary" />
                    {preset.name}
                  </span>
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {preset.instructions}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor="aiName">Nome da IA</Label>
            <Input
              id="aiName"
              value={aiName}
              onChange={(e) => setAiName(e.target.value)}
              placeholder="Ex: Assistente Inteligente BRF"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aiInstructions">Instruções (Prompt Base)</Label>
            <Textarea
              id="aiInstructions"
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              placeholder="Instruções para o comportamento da IA..."
              className="min-h-[200px] resize-y"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aiVoiceId">ID da Voz (opcional)</Label>
            <Input
              id="aiVoiceId"
              value={aiVoiceId}
              onChange={(e) => setAiVoiceId(e.target.value)}
              placeholder="Ex: pJ23x..."
            />
          </div>
          <div className="pt-2">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Configurações
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
