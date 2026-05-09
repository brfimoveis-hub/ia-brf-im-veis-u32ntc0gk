import { useAuth } from '@/hooks/use-auth'
import { Navigate, Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const Index = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl mb-6">
          CRM Inteligente
        </h1>
        <p className="mx-auto max-w-[700px] text-lg text-muted-foreground mb-8">
          Acesse sua conta para gerenciar clientes, cadências e a base de conhecimento da sua
          assistente de IA.
        </p>
        <Button asChild size="lg" className="h-12 px-8 text-base">
          <Link to="/login">Fazer Login</Link>
        </Button>
      </main>
    </div>
  )
}

export default Index
