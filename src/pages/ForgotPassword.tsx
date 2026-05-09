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
import { KeyRound, Loader2, ArrowLeft } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useAuth } from '@/hooks/use-auth'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { signOut } = useAuth()

  useEffect(() => {
    signOut()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const sanitizedEmail = email.trim()
    try {
      await pb.collection('users').requestPasswordReset(sanitizedEmail)
      toast({
        title: 'Email enviado',
        description: 'Se houver uma conta para este email, um link de redefinição foi enviado.',
      })
      setEmail('')
    } catch (error: any) {
      const errorMsg = getErrorMessage(error)
      toast({
        title: 'Erro ao solicitar redefinição',
        description:
          errorMsg.toLowerCase().includes('not found') || error.status === 404
            ? 'Usuário não encontrado. Verifique se o endereço está correto.'
            : 'Não foi possível enviar o email de redefinição. Verifique se o endereço está correto.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto bg-primary/10 p-3 rounded-full mb-4 w-fit">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Esqueceu a senha?</CardTitle>
          <CardDescription>Digite seu email para receber um link de redefinição.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                title="Por favor, insira um endereço de e-mail válido."
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Enviando...' : 'Enviar Link de Redefinição'}
            </Button>
          </form>
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
