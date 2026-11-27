import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { KeyRound, Loader2, ArrowLeft, MailCheck } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const { toast } = useToast()
  const { signOut } = useAuth()

  useEffect(() => {
    // Limpa qualquer sessão inválida/expirada para que a GuestRoute aceite a página
    // (sem isto, um authStore corrompido deixa o usuário "preso" vendo erros genéricos)
    try {
      if (pb.authStore.record && !pb.authStore.isValid) pb.authStore.clear()
    } catch {
      /* ignore */
    }
    signOut()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const sanitizedEmail = email.trim()
    setErrorMsg('')
    setSucesso(false)
    try {
      // Rota própria (prova em logs: a nativa request-password-reset nunca chegava
      // a produzir email observável). O backend localiza o usuário, gera o token
      // nativo e envia o email — 404 se o email não existe, 500 com motivo se falhar.
      const res = (await pb.send('/backend/v1/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email: sanitizedEmail }),
        headers: { 'Content-Type': 'application/json' },
      })) as { sent?: boolean; error?: string }
      console.log('[ForgotPassword] reset solicitado:', res)
      if (res && res.sent === false) {
        throw new Error(res.error || 'Falha no envio do email de redefinição.')
      }

      setSucesso(true)
      toast({
        title: 'Email enviado',
        description: 'Um link de redefinição foi enviado para o seu email.',
      })
      setEmail('')
    } catch (error: any) {
      const motivoBruto: string = (error && (error.response?.message || error.message)) || ''
      // Extrai o motivo REAL devolvido pelo hook (sem mostrar HTML/stack ao usuário)
      const motivo = motivoBruto.replace(/<[^>]*>/g, '').trim()

      if (error?.status === 404 || /não encontrado/i.test(motivo)) {
        setErrorMsg('Usuário não encontrado. Verifique se o endereço de email está correto.')
      } else if (/email é obrigatório/i.test(motivo)) {
        setErrorMsg('Digite o email para solicitar a redefinição.')
      } else if (motivo) {
        // Mostra o motivo específico devolvido pelo servidor (ex.: SMTP fora do ar)
        setErrorMsg(motivo.slice(0, 200))
        toast({
          title: 'Erro ao solicitar redefinição',
          description: motivo.slice(0, 200),
          variant: 'destructive',
        })
      } else {
        setErrorMsg('Falha de conexão com o servidor. Verifique sua internet e tente novamente.')
        toast({
          title: 'Erro ao solicitar redefinição',
          description: 'Falha de conexão com o servidor. Tente novamente.',
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh w-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto bg-primary/10 p-3 rounded-full mb-4 w-fit">
            {sucesso ? (
              <MailCheck className="w-6 h-6 text-primary" />
            ) : (
              <KeyRound className="w-6 h-6 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {sucesso ? 'Email enviado!' : 'Esqueceu a senha?'}
          </CardTitle>
          <CardDescription>
            {sucesso
              ? 'Abra a caixa de entrada (e a pasta de spam) e clique no link para criar a nova senha. O link expira em 30 minutos.'
              : 'Digite seu email para receber um link de redefinição.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!sucesso && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setErrorMsg('')
                  }}
                  required
                  pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                  title="Por favor, insira um endereço de e-mail válido."
                  className={errorMsg ? 'border-destructive' : ''}
                />
                {errorMsg && <p className="text-sm text-destructive font-medium">{errorMsg}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Enviando...' : 'Enviar Link de Redefinição'}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center border-t p-4">
          <Link
            to="/login"
            className="flex items-center text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o login
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
