import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import { Bot, Save, FileUp, Upload, Database, ArrowRight } from 'lucide-react'
import { BiaAvatar, defaultBiaImg } from '@/components/common/BiaAvatar'
import { assertCanUploadFiles } from '@/services/ai_knowledge_storage'
import { uploadAiKnowledgeFile } from '@/services/ai_knowledge_files'

export default function Bia() {
  const { user, loading: authLoading } = useAuth()
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
    const file = e.target.files[0]

    // Se for arquivo de base de conhecimento, subir na coleção dedicada ai_knowledge_files
    if (field === 'ai_knowledge_files') {
      try {
        await assertCanUploadFiles([file], undefined, user.id)
      } catch (validationErr: any) {
        toast({
          title: 'Não foi possível enviar para a Bia',
          description:
            validationErr.message ||
            'Verifique se o arquivo tem até 500 MB e se há espaço disponível na cota da Bia.',
          variant: 'destructive',
        })
        e.target.value = ''
        return
      }

      setLoading(true)
      try {
        await uploadAiKnowledgeFile(file, user.id)
        toast({
          title: 'Arquivo indexado com sucesso!',
          description:
            'Documento enviado para a Base de Conhecimento da Bia com detecção automática de imóvel.',
        })
      } catch (err: any) {
        console.error(err)
        toast({
          title: 'Erro no upload',
          description: err?.message || 'Não foi possível enviar o arquivo.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
        e.target.value = ''
      }
      return
    }

    setLoading(true)
    try {
      const uploadData = new FormData()
      uploadData.append(field, file)
      await pb.collection('users').update(user.id, uploadData)
      toast({ title: 'Sucesso', description: 'Arquivo enviado com sucesso.' })
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro',
        description: err?.message || 'Não foi possível enviar o arquivo.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <BiaAvatar size="xl" className="w-16 h-16" />
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
            <img
              src={
                user.ai_avatar && typeof pb?.files?.getURL === 'function'
                  ? pb.files.getURL(user, user.ai_avatar)
                  : defaultBiaImg
              }
              alt="Avatar da IA"
              className="w-24 h-24 rounded-full object-cover border-4 border-amber-500/40 shadow-sm"
              onError={(e) => {
                const target = e.currentTarget
                if (target.src !== defaultBiaImg) {
                  target.src = defaultBiaImg
                }
              }}
            />
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
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Base de Conhecimento</span>
              <Link
                to="/settings/ai"
                className="text-xs text-primary font-normal flex items-center gap-1 hover:underline"
              >
                Gerenciador Avançado <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardTitle>
            <CardDescription>
              Envio rápido de tabelas, PDFs e livros para a Bia (até 500 MB por arquivo).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-lg bg-slate-100 flex items-center justify-center border border-dashed">
              <Database className="h-10 w-10 text-slate-400" />
            </div>
            <p className="text-xs text-center text-muted-foreground max-w-xs">
              Os arquivos sobem com auto-detecção de imóvel e indexação automática para o cérebro da
              Bia.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Label htmlFor="ai_kb_upload" className="cursor-pointer">
                <div className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium">
                  <Upload className="mr-2 h-4 w-4" /> Enviar Arquivo
                </div>
                <input
                  id="ai_kb_upload"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'ai_knowledge_files')}
                  disabled={loading}
                />
              </Label>
              <Link to="/settings/ai">
                <Button variant="outline" size="sm" type="button">
                  Abrir Base Completa
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
