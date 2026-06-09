import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Loader2, Bot, Save, FileText } from 'lucide-react'

export default function Bia() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    ai_name: '',
    bia_instructions: '',
    ai_instructions: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        ai_name: user.ai_name || 'Bia',
        bia_instructions: user.bia_instructions || '',
        ai_instructions: user.ai_instructions || '',
      })
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      await pb.collection('users').update(user.id, formData)
      toast({ title: 'Sucesso', description: 'Configurações da IA Mãe (Bia) salvas com sucesso.' })
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao salvar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl animate-fade-in-up">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
          <Bot className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">IA Mãe (Bia)</h1>
          <p className="text-slate-500">
            Configure o comportamento, nome e base de conhecimento da inteligência artificial.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Configurações da Persona</CardTitle>
            <CardDescription>Defina como a IA deve se apresentar e se comportar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="ai_name">Nome da IA</Label>
              <Input
                id="ai_name"
                name="ai_name"
                placeholder="Ex: Bia"
                value={formData.ai_name}
                onChange={handleChange}
              />
              <p className="text-xs text-slate-500">
                Nome pelo qual a IA será conhecida no atendimento.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bia_instructions">Instruções Principais (Bia)</Label>
              <Textarea
                id="bia_instructions"
                name="bia_instructions"
                placeholder="Ex: Você é a Bia, uma assistente cordial e direta..."
                className="min-h-[120px]"
                value={formData.bia_instructions}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai_instructions">Instruções Adicionais</Label>
              <Textarea
                id="ai_instructions"
                name="ai_instructions"
                placeholder="Detalhes adicionais de comportamento..."
                className="min-h-[120px]"
                value={formData.ai_instructions}
                onChange={handleChange}
              />
            </div>

            <div className="pt-4 border-t border-slate-100">
              <Label className="mb-2 block">Base de Conhecimento</Label>
              <div className="flex items-center gap-3 p-4 bg-slate-50 border rounded-md">
                <FileText className="h-5 w-5 text-slate-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Arquivos de Treinamento</p>
                  <p className="text-xs text-slate-500">
                    {user?.ai_knowledge_files
                      ? 'Arquivo carregado.'
                      : 'Nenhum arquivo carregado no momento.'}
                  </p>
                </div>
                <Button variant="outline" size="sm" type="button" disabled>
                  Atualizar Arquivo
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t flex justify-end p-4">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Alterações
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
