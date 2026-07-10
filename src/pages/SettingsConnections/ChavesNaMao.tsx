import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Copy, CheckCircle2, Activity, Building2, Loader2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export default function ChavesNaMao() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [status, setStatus] = useState<'idle' | 'checking' | 'active' | 'error'>('idle')

  if (!user) {
    return (
      <Card className="shadow-sm border-slate-200">
        <CardContent className="py-10 text-center text-muted-foreground">
          Carregando dados do usuário...
        </CardContent>
      </Card>
    )
  }

  const webhookUrl = `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/chaves_na_mao_webhook?provider=chavesnamao&user_id=${user.id}`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl)
    toast({
      title: 'Copiado!',
      description: 'URL do Webhook copiada para a área de transferência.',
    })
  }

  const checkStatus = async () => {
    setStatus('checking')
    try {
      const res = await pb.send('/backend/v1/chaves_na_mao_webhook/status', { method: 'GET' })
      if (res && res.status === 'active') {
        setStatus('active')
        toast({
          title: 'Conexão Ativa',
          description: 'A integração com o Chaves na Mão está pronta para receber leads.',
        })
      } else {
        setStatus('error')
      }
    } catch (err) {
      setStatus('error')
      toast({
        variant: 'destructive',
        title: 'Erro na conexão',
        description: 'Não foi possível verificar o status da integração.',
      })
    }
  }

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="bg-slate-50/50 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">Chaves na Mão</CardTitle>
          </div>
          <Badge variant="secondary" className="text-sm py-1">
            Portal de Imóveis
          </Badge>
        </div>
        <CardDescription className="pt-2">
          Configure a integração para receber leads do portal Chaves na Mão diretamente no seu
          Pipeline.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-2">
          <Label>URL do Webhook</Label>
          <p className="text-xs text-muted-foreground">
            Copie esta URL e cole nas configurações de integração (webhook) do portal Chaves na Mão.
          </p>
          <div className="flex gap-2">
            <Input readOnly value={webhookUrl} className="font-mono text-xs" />
            <Button variant="secondary" onClick={copyToClipboard}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t flex items-center gap-4">
          <Button onClick={checkStatus} disabled={status === 'checking'} variant="outline">
            {status === 'checking' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            Testar Conexão
          </Button>
          {status === 'active' ? (
            <span className="flex items-center text-sm text-green-600 font-medium">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Conectado e Operante no Pipeline
            </span>
          ) : status === 'error' ? (
            <span className="text-sm text-red-600 font-medium">
              Erro ao verificar status. Tente novamente mais tarde.
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
