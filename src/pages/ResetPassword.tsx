import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
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
import { Lock, Loader2, ArrowLeft } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      toast({
        title: 'Token inválido',
        description: 'O link de redefinição de senha é inválido ou expirou.',
        variant: 'destructive',
      })
      return
    }

    if (password !== passwordConfirm) {
      toast({
        title: 'Senhas não conferem',
        description: 'A nova senha e a confirmação devem ser iguais.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm)
      toast({
        title: 'Senha redefinida',
        description: 'Sua senha foi alterada com sucesso. Você já pode fazer login.',
      })
      navigate('/login')
    } catch (error: any) {
      const message = getErrorMessage(error)
      toast({
        title: 'Erro ao redefinir senha',
        description: message || 'Token inválido/expirado ou dados incorretos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl text-destructive">Token Inválido</CardTitle>
            <CardDescription>
              O link de redefinição de senha está ausente ou inválido.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/login')} className="w-full">
              Ir para o Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto bg-primary/10 p-3 rounded-full mb-4 w-fit">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Redefinir Senha</CardTitle>
          <CardDescription>Digite sua nova senha abaixo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">Confirmar Nova Senha</Label>
              <Input
                id="passwordConfirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Redefinindo...' : 'Salvar Nova Senha'}
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
