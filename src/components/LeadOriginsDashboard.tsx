import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Globe, Instagram, Youtube, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'

interface SourceStatus {
  name: string
  id?: string
  status: 'Online' | 'Offline' | 'Checking'
  icon: any
  url?: string
}

export function LeadOriginsDashboard() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isChecking, setIsChecking] = useState(false)
  const [sources, setSources] = useState<SourceStatus[]>([
    { name: 'Website', url: 'https://www.brfimoveis.com.br/', status: 'Checking', icon: Globe },
    {
      name: 'Instagram',
      id: '@maurofengler (ID: 17841466333365448)',
      status: 'Checking',
      icon: Instagram,
    },
    { name: 'YouTube', id: 'Studio Channel integration', status: 'Checking', icon: Youtube },
  ])

  const checkConnectivity = async () => {
    setIsChecking(true)
    setSources((prev) => prev.map((s) => ({ ...s, status: 'Checking' })))

    try {
      const res = await pb.send('/backend/v1/ping-sources', {
        method: 'POST',
      })

      const isMetaValid =
        user?.meta_token_status === 'valid' || user?.meta_token_status === 'active'

      setSources([
        {
          name: 'Website',
          url: 'https://www.brfimoveis.com.br/',
          status: res.website === 'CONNECTED' ? 'Online' : 'Offline',
          icon: Globe,
        },
        {
          name: 'Instagram',
          id: '@maurofengler (ID: 17841466333365448)',
          status: isMetaValid ? 'Online' : 'Offline',
          icon: Instagram,
        },
        {
          name: 'YouTube',
          id: 'Studio Channel integration',
          status: res.youtube === 'CONNECTED' ? 'Online' : 'Offline',
          icon: Youtube,
        },
      ])

      toast({
        title: 'Verificação Concluída',
        description: 'Status de conectividade das origens de leads atualizado.',
      })
    } catch (error) {
      setSources((prev) => prev.map((s) => ({ ...s, status: 'Offline' })))
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
  }, [user?.meta_token_status])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Online':
        return (
          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20 shadow-sm">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Online
          </Badge>
        )
      case 'Offline':
        return (
          <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20 shadow-sm">
            <XCircle className="w-3 h-3 mr-1" /> Offline
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground animate-pulse shadow-sm">
            Verificando...
          </Badge>
        )
    }
  }

  return (
    <Card className="border-border shadow-sm overflow-hidden shrink-0">
      <div className="h-1 bg-blue-500 w-full"></div>
      <CardHeader className="bg-muted/10 pb-4 border-b flex flex-col sm:flex-row sm:items-start justify-between gap-4">
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
          className="gap-2 shrink-0"
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
