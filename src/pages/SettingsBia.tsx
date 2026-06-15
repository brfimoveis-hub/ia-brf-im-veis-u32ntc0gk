import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Bot, Save, Upload, Mic } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function SettingsBia() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    ai_name: '',
    bia_instructions: '',
    ai_voice_id: '',
  })
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      setFormData({
        ai_name: user.ai_name || '',
        bia_instructions: user.bia_instructions || '',
        ai_voice_id: user.ai_voice_id || 'nova',
      })
      if (user.ai_avatar) {
        setAvatarPreview(pb.files.getURL(user, user.ai_avatar))
      }
    }
  }, [user])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      const data = new FormData()
      data.append('ai_name', formData.ai_name)
      data.append('bia_instructions', formData.bia_instructions)
      data.append('ai_voice_id', formData.ai_voice_id)

      if (avatarFile) {
        data.append('ai_avatar', avatarFile)
      }

      await pb.collection('users').update(user.id, data)
      toast({ title: 'Configurações da IA atualizadas com sucesso' })
    } catch (error) {
      toast({ title: 'Erro ao salvar as configurações', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">IA Mãe (Bia)</h1>
        <p className="text-muted-foreground">
          Configure a personalidade, voz e aparência da sua inteligência artificial.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>Avatar utilizado no WhatsApp.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                <AvatarImage
                  src={
                    avatarPreview ||
                    `https://img.usecurling.com/ppl/medium?seed=${user?.id}&gender=female`
                  }
                />
                <AvatarFallback>
                  <Bot className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Alterar Avatar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Voz (TTS)</CardTitle>
              <CardDescription>Selecione a voz para mensagens de áudio.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mic className="h-4 w-4" /> Voz Principal
                </Label>
                <Select
                  value={formData.ai_voice_id}
                  onValueChange={(v) => setFormData({ ...formData, ai_voice_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma voz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nova">Nova (Feminina, Suave)</SelectItem>
                    <SelectItem value="shimmer">Shimmer (Feminina, Clara)</SelectItem>
                    <SelectItem value="alloy">Alloy (Feminina, Neutra)</SelectItem>
                    <SelectItem value="echo">Echo (Masculina, Quente)</SelectItem>
                    <SelectItem value="onyx">Onyx (Masculina, Profunda)</SelectItem>
                    <SelectItem value="fable">Fable (Masculina, Britânica)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Identidade & Comportamento</CardTitle>
              <CardDescription>
                Defina como a IA se apresenta e quais suas regras globais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da IA</Label>
                <Input
                  value={formData.ai_name}
                  onChange={(e) => setFormData({ ...formData, ai_name: e.target.value })}
                  placeholder="Ex: Bia, Atendimento BRF..."
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Instruções Principais (Prompt de Sistema)</Label>
                </div>
                <Textarea
                  value={formData.bia_instructions}
                  onChange={(e) => setFormData({ ...formData, bia_instructions: e.target.value })}
                  placeholder="Escreva como a IA deve se comportar, qual o tom de voz, regras de negócio gerais..."
                  className="min-h-[250px] font-mono text-sm leading-relaxed"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Estas instruções serão usadas em todas as conversas. Instruções de cadência
                  (configuradas no menu Cadências) são adicionadas dinamicamente ao contexto do
                  cliente.
                </p>
              </div>

              <div className="pt-4 border-t flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    'Salvando...'
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" /> Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
