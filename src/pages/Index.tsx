import { Link, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { Bot, ArrowRight, Activity, Users, Target, LayoutDashboard } from 'lucide-react'

export default function Index() {
  const { user, loading } = useAuth()

  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-6 h-16 flex items-center border-b sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <Link to="/" className="flex items-center gap-2 transition-transform hover:scale-105">
          <div className="bg-primary/10 p-2 rounded-xl">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <span className="font-bold text-lg tracking-tight">IA BRF Imóveis</span>
        </Link>
        <nav className="ml-auto flex items-center gap-4">
          <Link to="/login">
            <Button variant="ghost" className="font-medium">
              Entrar
            </Button>
          </Link>
          <Link to="/login">
            <Button className="font-medium shadow-sm">
              Começar <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-20 md:py-32 bg-gradient-to-b from-muted/50 via-background to-background relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-black/[0.02] -z-10" />
          <div className="container px-4 md:px-6 max-w-5xl mx-auto">
            <div className="flex flex-col items-center space-y-8 text-center animate-fade-in-up">
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors border-transparent bg-primary/10 text-primary">
                Sistema Operacional 100% Online
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                  Gestão Inteligente de <span className="text-primary">Leads</span> e Cadências
                </h1>
                <p className="mx-auto max-w-[750px] text-muted-foreground md:text-xl leading-relaxed">
                  Automatize seu CRM com a IA BRF Imóveis. Integre diretamente ao Uazapi e Meta CAPI
                  para escalar seu atendimento e fechar mais vendas.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 min-w-[200px]">
                <Link to="/login" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full shadow-lg hover:shadow-xl transition-all">
                    Acessar Plataforma <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-20 md:py-32 border-t bg-muted/20">
          <div className="container px-4 md:px-6 max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Funcionalidades Principais
              </h2>
              <p className="text-muted-foreground md:text-lg max-w-2xl mx-auto">
                Tudo o que você precisa para gerenciar sua operação de vendas de forma eficiente e
                centralizada.
              </p>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="group flex flex-col items-start p-6 bg-background rounded-2xl shadow-sm border hover:shadow-md transition-all duration-300">
                <div className="p-3 bg-primary/10 rounded-xl mb-4 group-hover:bg-primary/20 transition-colors">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Integração Uazapi</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Gerencie instâncias e status em tempo real. Suporte completo para conectar seu
                  WhatsApp via Uazapi.
                </p>
              </div>
              <div className="group flex flex-col items-start p-6 bg-background rounded-2xl shadow-sm border hover:shadow-md transition-all duration-300">
                <div className="p-3 bg-primary/10 rounded-xl mb-4 group-hover:bg-primary/20 transition-colors">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Gestão de Clientes</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Controle de milhares de leads e cadências de forma eficiente, otimizando o fluxo
                  de contatos.
                </p>
              </div>
              <div className="group flex flex-col items-start p-6 bg-background rounded-2xl shadow-sm border hover:shadow-md transition-all duration-300">
                <div className="p-3 bg-primary/10 rounded-xl mb-4 group-hover:bg-primary/20 transition-colors">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Meta CAPI</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Rastreamento avançado e sincronização de eventos diretamente com a API de
                  Conversões do Facebook.
                </p>
              </div>
              <div className="group flex flex-col items-start p-6 bg-background rounded-2xl shadow-sm border hover:shadow-md transition-all duration-300 sm:col-span-2 lg:col-span-3">
                <div className="p-3 bg-primary/10 rounded-xl mb-4 group-hover:bg-primary/20 transition-colors">
                  <LayoutDashboard className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Painel de Controle Centralizado</h3>
                <p className="text-muted-foreground leading-relaxed max-w-3xl">
                  Acompanhe métricas, status de conexão das APIs, interações de IA e muito mais em
                  um único dashboard intuitivo e responsivo.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t bg-background py-8">
        <div className="container px-4 md:px-6 max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-semibold">IA BRF Imóveis</span>
          </div>
          <p className="text-sm text-muted-foreground text-center md:text-left">
            © {new Date().getFullYear()} IA BRF Imóveis. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
