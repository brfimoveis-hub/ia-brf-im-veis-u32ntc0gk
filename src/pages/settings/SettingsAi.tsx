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
import { Loader2, Upload } from 'lucide-react'

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
