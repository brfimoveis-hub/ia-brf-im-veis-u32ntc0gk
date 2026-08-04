import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, Instagram } from 'lucide-react'

export default function InstagramCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      setStatus('error')
      setErrorMsg(error === 'access_denied' ? 'Você cancelou a autorização.' : `Erro: ${error}`)
      return
    }

    if (!code) {
      setStatus('error')
      setErrorMsg('Código de autorização não encontrado.')
      return
    }

    const redirectUri = `${window.location.origin}/settings/connections/instagram/callback`

    pb.send('/backend/v1/instagram/oauth/exchange', {
      method: 'POST',
      body: { code, redirect_uri: redirectUri },
    })
      .then((res: any) => {
        if (res.success) {
          setStatus('success')
        } else {
          setStatus('error')
          setErrorMsg('Falha ao trocar código por token de acesso.')
        }
      })
      .catch((err: any) => {
        setStatus('error')
        setErrorMsg(err?.response?.message || err?.message || 'Erro ao processar autorização.')
      })
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Instagram className="h-12 w-12 text-primary" />
          </div>
          <CardTitle>Instagram Business OAuth</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Processando autorização...</p>
            </div>
          )}
          {status === 'success' && (
            <div className="space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
              <p className="text-sm font-medium">Instagram Business conectado com sucesso!</p>
              <p className="text-xs text-muted-foreground">
                Você pode fechar esta aba e voltar para o CRM.
              </p>
              <Button onClick={() => navigate('/settings/connections')} className="w-full">
                Voltar para Configurações
              </Button>
            </div>
          )}
          {status === 'error' && (
            <div className="space-y-3">
              <XCircle className="h-12 w-12 text-red-600 mx-auto" />
              <p className="text-sm font-medium text-red-600">Falha na conexão</p>
              <p className="text-xs text-muted-foreground">{errorMsg}</p>
              <Button
                onClick={() => navigate('/settings/connections')}
                variant="outline"
                className="w-full"
              >
                Voltar para Configurações
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
