import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Globe, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

export function DominiosConfig() {
  const { user } = useAuth()
  const [domain, setDomain] = useState(user?.uazapi_domain || '')
  const [domainStatus, setDomainStatus] = useState<'Pendente' | 'Ativo' | 'Erro'>('Pendente')
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.uazapi_domain) {
      setDomain(user.uazapi_domain)
      setDomainStatus(user.uazapi_domain.startsWith('https://') ? 'Ativo' : 'Pendente')
    } else {
      setDomainStatus('Pendente')
    }
  }, [user?.uazapi_domain])

  useRealtime('users', (e) => {
    if (e.record.id === user?.id) {
      if (e.record.uazapi_domain !== domain) {
        setDomain(e.record.uazapi_domain || '')
      }
      setDomainStatus(e.record.uazapi_domain?.startsWith('https://') ? 'Ativo' : 'Pendente')
    }
  })

  const handleVerify = async () => {
    let finalDomain = domain.trim()
    if (finalDomain && !/^https?:\/\//i.test(finalDomain)) {
      finalDomain = `https://${finalDomain}`
    }

    try {
      new URL(finalDomain)
    } catch (e) {
      setError('O URL inserido é inválido. Verifique o formato do domínio e tente novamente.')
      setDomainStatus('Erro')
      return
    }

    setDomain(finalDomain)
    setError('')
    setIsVerifying(true)

    try {
      await pb.collection('users').update(user!.id, { uazapi_domain: finalDomain })
      await pb.collection('users').authRefresh()
      setDomainStatus('Ativo')
      toast.success('Domínio verificado e salvo com sucesso!')
    } catch (err) {
      setDomainStatus('Erro')
      toast.error('Erro ao salvar domínio.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-none md:border md:shadow-sm">
        <CardHeader className="px-0 md:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Domínios Personalizados
              </CardTitle>
              <CardDescription>
                Gerencie e verifique os domínios utilizados para o acesso à sua plataforma.
              </CardDescription>
            </div>
            {user?.created && (
              <span className="text-xs font-normal text-muted-foreground whitespace-nowrap">
                Criado em{' '}
                {new Intl.DateTimeFormat('pt-BR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }).format(new Date(user.created))}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-0 md:px-6 space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label>Domínio Principal</Label>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex-1 space-y-2 w-full">
                  <Input
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="https://www.meusite.ia.crm.inteligente.com.br"
                    className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                <div className="flex items-center gap-2 min-w-[140px] w-full sm:w-auto">
                  {domainStatus === 'Ativo' ? (
                    <div className="flex items-center gap-1.5 text-sm font-medium text-green-600 bg-green-500/10 px-3 py-1.5 rounded-md w-full justify-center">
                      <CheckCircle2 className="h-4 w-4" />
                      Ativo
                    </div>
                  ) : domainStatus === 'Erro' ? (
                    <div className="flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-500/10 px-3 py-1.5 rounded-md w-full justify-center">
                      <AlertCircle className="h-4 w-4" />
                      Erro
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-sm font-medium text-yellow-600 bg-yellow-500/10 px-3 py-1.5 rounded-md w-full justify-center">
                      <AlertCircle className="h-4 w-4" />
                      Pendente
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="px-0 md:px-6 flex justify-end">
          <Button onClick={handleVerify} disabled={isVerifying || domainStatus === 'Ativo'}>
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : domainStatus === 'Ativo' ? (
              'Verificado'
            ) : (
              'Verificar Domínio'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
