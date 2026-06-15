import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Bot } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export default function SettingsBia() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    ai_name: '',
    bia_instructions: '',
    ai_instructions: '',
    ai_voice_id: '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [kbFiles, setKbFiles] = useState<FileList | null>(null)

  useEffect(() => {
    if (user) {
      setFormData({
        ai_name: user.ai_name || '',
        bia_instructions: user.bia_instructions || '',
        ai_instructions: user.ai_instructions || '',
        ai_voice_id: user.ai_voice_id || '',
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      const data = new FormData()
      data.append('ai_name', formData.ai_name)
      data.append('bia_instructions', formData.bia_instructions)
      data.append('ai_instructions', formData.ai_instructions)
      data.append('ai_voice_id', formData.ai_voice_id)

      if (avatarFile) {
        data.append('ai_avatar', avatarFile)
      }

      if (kbFiles) {
        for (let i = 0; i < kbFiles.length; i++) {
          data.append('ai_knowledge_files', kbFiles[i])
        }
      }

      await pb.collection('users').update(user.id, data)
      toast({
        title: 'Configurações Salvas',
        description: 'As configurações da sua IA foram atualizadas com sucesso.',
      })

      // Clear file inputs state
      setAvatarFile(null)
      setKbFiles(null)
    } catch (error) {
      toast({
        title: 'Erro ao Salvar',
        description: 'Não foi possível atualizar as configurações da IA. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Bot className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">IA Mãe (Bia)</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações de Identidade e Comportamento</CardTitle>
          <CardDescription>
            Personalize a persona da sua IA, forneça diretrizes de comunicação e faça o upload da
            base de conhecimento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ai_name">Nome da IA</Label>
                <Input
                  id="ai_name"
                  placeholder="Ex: Bia, Assistente Virtual"
                  value={formData.ai_name}
                  onChange={(e) => setFormData({ ...formData, ai_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai_voice_id">ID da Voz da IA</Label>
                <Input
                  id="ai_voice_id"
                  placeholder="ID da voz (ex: ElevenLabs)"
                  value={formData.ai_voice_id}
                  onChange={(e) => setFormData({ ...formData, ai_voice_id: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bia_instructions">Instruções Globais (IA Mãe)</Label>
              <Textarea
                id="bia_instructions"
                placeholder="Defina o comportamento global da IA e regras que nunca devem ser quebradas..."
                rows={4}
                value={formData.bia_instructions}
                onChange={(e) => setFormData({ ...formData, bia_instructions: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Instruções que valem para todos os fluxos e campanhas.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai_instructions">Instruções Específicas de Atendimento</Label>
              <Textarea
                id="ai_instructions"
                placeholder="Exemplo prático de atendimento, saudação ou diretriz de vendas..."
                rows={4}
                value={formData.ai_instructions}
                onChange={(e) => setFormData({ ...formData, ai_instructions: e.target.value })}
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="ai_avatar">Avatar (Foto de Perfil)</Label>
                <Input
                  id="ai_avatar"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                />
                {user?.ai_avatar && !avatarFile && (
                  <p className="text-xs text-muted-foreground">
                    Você já possui um avatar configurado.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai_knowledge_files">Arquivos de Conhecimento (PDFs, Docs)</Label>
                <Input
                  id="ai_knowledge_files"
                  type="file"
                  multiple
                  onChange={(e) => setKbFiles(e.target.files)}
                />
                <p className="text-xs text-muted-foreground">
                  Faça upload de materiais para alimentar a inteligência (RAG) da IA. Arquivos
                  antigos com o mesmo nome serão substituídos.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading} size="lg">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Configurações da IA
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
