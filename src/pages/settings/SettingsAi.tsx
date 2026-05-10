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
    id: 'bia_1',
    name: 'Bia - Atendimento Inicial',
    instructions:
      'Você é a Bia, assistente virtual da BRF Imóveis. Seja extremamente educada, empática e prestativa. Seu objetivo é recepcionar os clientes, descobrir o nome deles e qual tipo de imóvel estão buscando (comprar ou alugar).',
    voice_id: 'bia_reception_v1',
  },
  {
    id: 'bia_2',
    name: 'Bia - Qualificação Avançada',
    instructions:
      'Você é a Bia, especialista em imóveis da BRF. Faça perguntas focadas para entender o orçamento do cliente, a região desejada, número de quartos e se ele já possui algum financiamento pré-aprovado.',
    voice_id: 'bia_qual_v1',
  },
  {
    id: 'bia_3',
    name: 'Bia - Agendamento de Visitas',
    instructions:
      'Você é a Bia, responsável por coordenar visitas aos imóveis da BRF. Seu foco é apresentar horários disponíveis, confirmar a disponibilidade do cliente e agendar a visita com o corretor responsável.',
    voice_id: 'bia_schedule_v1',
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
                  onClick={() => {
                    setAiName(preset.name)
                    setAiInstructions(preset.instructions)
                    setAiVoiceId(preset.voice_id)
                    toast.success(`Template "${preset.name}" carregado.`)
                  }}
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
