import { useState } from 'react'
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

export function DominiosConfig() {
  const defaultDomain = 'www.meusite.ia.crm.inteligente.com.br'
  const [domainStatus, setDomainStatus] = useState<'Pendente' | 'Ativo'>('Pendente')
  const [isVerifying, setIsVerifying] = useState(false)

  const handleVerify = async () => {
    setIsVerifying(true)
    // Mock verification process
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setDomainStatus('Ativo')
    setIsVerifying(false)
    toast.success('Domínio verificado com sucesso!')
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-none md:border md:shadow-sm">
        <CardHeader className="px-0 md:px-6">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Domínios Personalizados
          </CardTitle>
          <CardDescription>
            Gerencie e verifique os domínios utilizados para o acesso à sua plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6 space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label>Domínio Principal</Label>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <Input
                  value={defaultDomain}
                  readOnly
                  className="bg-muted text-muted-foreground flex-1"
                />
                <div className="flex items-center gap-2 min-w-[140px]">
                  {domainStatus === 'Ativo' ? (
                    <div className="flex items-center gap-1.5 text-sm font-medium text-green-600 bg-green-500/10 px-3 py-1.5 rounded-md w-full justify-center">
                      <CheckCircle2 className="h-4 w-4" />
                      Ativo
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
