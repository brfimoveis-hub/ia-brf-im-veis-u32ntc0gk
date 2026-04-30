import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Globe,
  Instagram,
  Youtube,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

interface SourceStatus {
  name: string
  id?: string
  status: 'CONNECTED' | 'ATTENTION' | 'DISCONNECTED' | 'CHECKING'
  icon: any
  url?: string
}

export function LeadOriginsDashboard() {
  const { toast } = useToast()
  const [isChecking, setIsChecking] = useState(false)
  const [sources, setSources] = useState<SourceStatus[]>([
    { name: 'Website', url: 'https://www.brfimoveis.com.br/', status: 'CHECKING', icon: Globe },
    {
      name: 'Instagram',
      id: '@maurofengler (17841466333365448)',
      status: 'CHECKING',
      icon: Instagram,
    },
    { name: 'YouTube', id: 'BRF Imóveis Channel', status: 'CHECKING', icon: Youtube },
  ])

  const checkConnectivity = async () => {
    setIsChecking(true)

    // Set all to checking state visually
    setSources((prev) => prev.map((s) => ({ ...s, status: 'CHECKING' })))

    try {
      const res = await pb.send('/backend/v1/ping-sources', {
        method: 'POST',
        body: JSON.stringify({ instagramId: '17841466333365448' }),
      })

      setSources([
        {
          name: 'Website',
          url: 'https://www.brfimoveis.com.br/',
          status: res.website || 'CONNECTED',
          icon: Globe,
        },
        {
          name: 'Instagram',
          id: '@maurofengler (17841466333365448)',
          status: res.instagram || 'CONNECTED',
          icon: Instagram,
        },
        {
          name: 'YouTube',
          id: 'BRF Imóveis Channel',
          status: res.youtube || 'CONNECTED',
          icon: Youtube,
        },
      ])

      toast({
        title: 'Verificação Concluída',
        description: 'Status de conectividade das origens de leads atualizado.',
      })
    } catch (error) {
      setSources((prev) => prev.map((s) => ({ ...s, status: 'DISCONNECTED' })))
      toast({
        title: 'Erro na Verificação',
        description: 'Não foi possível validar a conectividade com as origens.',
        variant: 'destructive',
      })
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    checkConnectivity()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return (
          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Conectado
          </Badge>
        )
      case 'ATTENTION':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20">
            <AlertTriangle className="w-3 h-3 mr-1" /> Atenção
          </Badge>
        )
      case 'DISCONNECTED':
        return (
          <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" /> Desconectado
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground animate-pulse">
            Verificando...
          </Badge>
        )
    }
  }

  return (
    <Card className="border-border shadow-elevation overflow-hidden">
      <div className="h-1 bg-blue-500 w-full"></div>
      <CardHeader className="bg-muted/10 pb-4 border-b flex flex-row items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-xl">
            <Globe className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-xl">Origens de Leads (Connectivity Dashboard)</CardTitle>
            <CardDescription>
              Monitore a saúde e integração dos seus canais de entrada de clientes.
            </CardDescription>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={checkConnectivity}
          disabled={isChecking}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
          Atualizar Status
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-3">
          {sources.map((source, idx) => {
            const Icon = source.icon
            return (
              <div
                key={idx}
                className="flex flex-col p-4 border rounded-xl bg-card shadow-sm gap-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-muted rounded-xl">
                      <Icon className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{source.name}</h4>
                      <p
                        className="text-xs text-muted-foreground truncate max-w-[150px]"
                        title={source.url || source.id}
                      >
                        {source.url || source.id}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto pt-2 border-t">
                  <span className="text-xs font-medium text-muted-foreground">Status Atual:</span>
                  {getStatusBadge(source.status)}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
