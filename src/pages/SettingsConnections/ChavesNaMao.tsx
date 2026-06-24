import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Copy, CheckCircle2, Activity } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export default function ChavesNaMao() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [status, setStatus] = useState<'idle' | 'checking' | 'active' | 'error'>('idle')

  const webhookUrl = `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/webhooks/chaves-na-mao?uid=${user?.id || ''}`

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
      const res = await pb.send('/backend/v1/webhooks/chaves-na-mao/status', { method: 'GET' })
      if (res && res.status === 'active') {
        setStatus('active')
        toast({
          title: 'Conexão Ativa',
          description:
            'A integração com o Chaves na Mão está pronta para receber leads no Pipeline.',
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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Chaves na Mão</h3>
        <p className="text-sm text-muted-foreground">
          Configure a integração para receber leads do portal Chaves na Mão diretamente no seu
          Pipeline.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>URL do Webhook</CardTitle>
          <CardDescription>
            Copie esta URL e cole nas configurações de integração (webhook) do portal Chaves na Mão.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Endpoint de Recepção</Label>
            <div className="flex gap-2">
              <Input readOnly value={webhookUrl} />
              <Button variant="secondary" onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status da Integração</CardTitle>
          <CardDescription>
            Verifique se o seu Pipeline está pronto para receber leads deste portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button onClick={checkStatus} disabled={status === 'checking'}>
              {status === 'checking' ? (
                <Activity className="h-4 w-4 mr-2 animate-pulse" />
              ) : (
                <Activity className="h-4 w-4 mr-2" />
              )}
              Testar Conexão
            </Button>
            {status === 'active' && (
              <span className="flex items-center text-sm text-green-600 font-medium">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Conectado e Operante no Pipeline
              </span>
            )}
            {status === 'error' && (
              <span className="text-sm text-red-600 font-medium">
                Erro ao verificar status. Tente novamente mais tarde.
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
