import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Users, Loader2 } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('brfimoveis@gmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const { signIn, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/configuracoes', { replace: true })
    }
  }, [user, authLoading, navigate])

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const sanitizedEmail = email.trim()
    const { error } = await signIn(sanitizedEmail, password)
    setLoading(false)
    if (error) {
      const isNetworkError = error.status === 0
      const fieldErrors = error.response?.data
        ? Object.values(error.response.data)
            .map((e: any) => e.message)
            .join(', ')
        : ''
      toast({
        title: isNetworkError ? 'Erro de Conexão' : 'Credenciais inválidas',
        description: isNetworkError
          ? 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.'
          : fieldErrors || 'Não foi possível autenticar. Por favor, verifique seu e-mail e senha.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto bg-primary/10 p-3 rounded-full mb-4 w-fit">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Bem-vindo(a) de volta</CardTitle>
          <CardDescription>Acesse o CRM para gerenciar seus clientes.</CardDescription>
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Autenticando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
