import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { Bot, Save, FileUp, Upload } from 'lucide-react'

export default function Bia() {
  const { user } = useAuth()
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

  const handleSave = async () => {
    if (!user) return
    setLoading(true)
    try {
      await pb.collection('users').update(user.id, formData)
      toast({ title: 'Sucesso', description: 'Configurações da IA atualizadas com sucesso.' })
    } catch (e) {
      console.error(e)
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (!user || !e.target.files || e.target.files.length === 0) return
    setLoading(true)
    try {
      const uploadData = new FormData()
      uploadData.append(field, e.target.files[0])
      await pb.collection('users').update(user.id, uploadData)
      toast({ title: 'Sucesso', description: 'Arquivo enviado com sucesso.' })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o arquivo.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 text-primary rounded-full">
          <Bot className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">IA Mãe (Bia)</h1>
          <p className="text-muted-foreground">
            Configure a persona, instruções e base de conhecimento da sua IA.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identidade e Instruções</CardTitle>
          <CardDescription>Personalize como sua IA se comunica com seus clientes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="ai_name">Nome da IA</Label>
            <Input
              id="ai_name"
              name="ai_name"
              value={formData.ai_name}
              onChange={handleChange}
              placeholder="Ex: Bia"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bia_instructions">Instruções Principais (IA Mãe)</Label>
            <Textarea
              id="bia_instructions"
              name="bia_instructions"
              value={formData.bia_instructions}
              onChange={handleChange}
              className="min-h-[150px]"
              placeholder="Defina as diretrizes gerais de comportamento da IA."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai_instructions">Instruções Específicas de Vendas</Label>
            <Textarea
              id="ai_instructions"
              name="ai_instructions"
              value={formData.ai_instructions}
              onChange={handleChange}
              className="min-h-[150px]"
              placeholder="Instruções focadas na abordagem comercial e conversão."
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end bg-slate-50 border-t mt-4 p-4 rounded-b-lg">
          <Button onClick={handleSave} disabled={loading}>
            <Save className="mr-2 h-4 w-4" /> Salvar Configurações
          </Button>
        </CardFooter>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Avatar da IA</CardTitle>
            <CardDescription>A imagem que representará a IA.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {user.ai_avatar ? (
              <img
                src={pb.files.getUrl(user, user.ai_avatar)}
                alt="Avatar da IA"
                className="w-24 h-24 rounded-full object-cover border"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center border border-dashed">
                <Bot className="h-10 w-10 text-slate-300" />
              </div>
            )}
            <Label htmlFor="ai_avatar_upload" className="cursor-pointer">
              <div className="flex items-center px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors">
                <Upload className="mr-2 h-4 w-4" /> Enviar Avatar
              </div>
              <input
                id="ai_avatar_upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'ai_avatar')}
                disabled={loading}
              />
            </Label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Base de Conhecimento</CardTitle>
            <CardDescription>Documentos de referência para a IA.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-lg bg-slate-100 flex items-center justify-center border border-dashed">
              <FileUp className="h-10 w-10 text-slate-300" />
            </div>
            {user.ai_knowledge_files && (
              <p className="text-sm text-green-600 font-medium">Arquivo carregado</p>
            )}
            <Label htmlFor="ai_kb_upload" className="cursor-pointer">
              <div className="flex items-center px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors">
                <Upload className="mr-2 h-4 w-4" /> Enviar Base
              </div>
              <input
                id="ai_kb_upload"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'ai_knowledge_files')}
                disabled={loading}
              />
            </Label>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
