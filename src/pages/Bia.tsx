import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Bot, Save, Loader2 } from 'lucide-react'

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
        ai_name: user.ai_name || '',
        bia_instructions: user.bia_instructions || '',
        ai_instructions: user.ai_instructions || '',
      })
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setLoading(true)
    try {
      await pb.collection('users').update(user.id, formData)
      toast({
        title: 'Sucesso',
        description: 'Configurações da IA salvas com sucesso.',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Ocorreu um erro ao atualizar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bot className="h-8 w-8" />
          IA Mãe (Bia)
        </h1>
        <p className="text-muted-foreground">
          Gerencie o comportamento, nome e as instruções globais da sua inteligência artificial.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações da Persona</CardTitle>
          <CardDescription>Defina a identidade e as diretrizes de atuação da IA.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="ai_name">Nome da IA</Label>
            <Input
              id="ai_name"
              value={formData.ai_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, ai_name: e.target.value }))}
              placeholder="Ex: Bia, Assistente Virtual..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bia_instructions">Instruções Principais (Bia)</Label>
            <Textarea
              id="bia_instructions"
              value={formData.bia_instructions}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, bia_instructions: e.target.value }))
              }
              placeholder="Instruções gerais de como a IA deve se portar..."
              className="min-h-[150px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai_instructions">Diretrizes Adicionais de Atendimento</Label>
            <Textarea
              id="ai_instructions"
              value={formData.ai_instructions}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, ai_instructions: e.target.value }))
              }
              placeholder="Regras de negócio específicas, limites de atuação..."
              className="min-h-[150px]"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-6">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar Configurações
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
