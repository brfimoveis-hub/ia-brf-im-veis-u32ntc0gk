import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Loader2, MessageSquare, Save, Play, Server, Hash, Key } from 'lucide-react'

export default function UazapiConfig() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [formData, setFormData] = useState({
    uazapi_domain: '',
    uazapi_instance_number: '',
    uazapi_token: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        uazapi_domain: user.uazapi_domain || '',
        uazapi_instance_number: user.uazapi_instance_number || '',
        uazapi_token: user.uazapi_token || '',
      })
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!user) return false
    setLoading(true)
    try {
      await pb.collection('users').update(user.id, formData)
      toast({ title: 'Sucesso', description: 'Configurações do Uazapi salvas com sucesso.' })
      return true
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao salvar as configurações.',
        variant: 'destructive',
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleTest = async () => {
    if (!user) return
    const saved = await handleSave()
    if (!saved) return

    setTesting(true)
    try {
      await pb.send('/backend/v1/uazapi/test-connection', { method: 'POST' })
      toast({ title: 'Conectado', description: 'Conexão com Uazapi estabelecida com sucesso.' })
    } catch (error: any) {
      toast({
        title: 'Erro de Conexão',
        description:
          'Verifique se o "Instance Number" deve ser o Slug (nome) da instância em vez do número de telefone. ' +
          (error.message || ''),
        variant: 'destructive',
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl animate-fade-in-up">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
          <MessageSquare className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conexão Uazapi</h1>
          <p className="text-slate-500">Configure a conexão com seu servidor WhatsApp Uazapi.</p>
        </div>
      </div>

      <Card className="shadow-sm">
        <form onSubmit={handleSave}>
          <CardHeader>
            <CardTitle>Credenciais do Servidor</CardTitle>
            <CardDescription>Preencha os dados do seu painel Uazapi Evolution API.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="uazapi_domain" className="flex items-center gap-2">
                <Server className="h-4 w-4 text-slate-500" />
                Server URL (Base Domain)
              </Label>
              <Input
                id="uazapi_domain"
                name="uazapi_domain"
                placeholder="Ex: https://iabrfimveis.uazapi.com"
                value={formData.uazapi_domain}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="uazapi_instance_number" className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-slate-500" />
                Instance Number (ou Slug)
              </Label>
              <Input
                id="uazapi_instance_number"
                name="uazapi_instance_number"
                placeholder="Ex: 5548992098050 ou nome_da_instancia"
                value={formData.uazapi_instance_number}
                onChange={handleChange}
              />
              <p className="text-xs text-slate-500">
                Atenção: Em alguns casos, isso deve ser o nome da instância, não o telefone.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="uazapi_token" className="flex items-center gap-2">
                <Key className="h-4 w-4 text-slate-500" />
                Instance Token (API Key)
              </Label>
              <Input
                id="uazapi_token"
                name="uazapi_token"
                type="password"
                placeholder="Insira o token de acesso da instância..."
                value={formData.uazapi_token}
                onChange={handleChange}
              />
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t flex justify-between p-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing || loading}
            >
              {testing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Testar Conexão
            </Button>
            <Button type="submit" disabled={loading || testing}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Alterações
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
