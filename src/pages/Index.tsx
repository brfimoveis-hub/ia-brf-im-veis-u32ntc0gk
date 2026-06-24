import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Bot, GitMerge, Settings, BrainCircuit } from 'lucide-react'

export default function Dashboard() {
  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-8 animate-fade-in-up">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">Dashboard Principal</h1>
        <p className="text-muted-foreground text-lg">
          Bem-vindo ao CRM Inteligente. Gerencie seus leads, fluxos automatizados e a inteligência
          artificial.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <Users className="w-8 h-8 text-primary mb-2" />
            <CardTitle>Clientes e Leads</CardTitle>
            <CardDescription>
              Visualize e gerencie todos os contatos do funil de vendas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/customers">Acessar CRM</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <GitMerge className="w-8 h-8 text-primary mb-2" />
            <CardTitle>Cadências</CardTitle>
            <CardDescription>
              Configure os fluxos de mensagens e passos de atendimento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/cadences">Gerenciar Cadências</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-primary/20 bg-primary/5">
          <CardHeader className="pb-4">
            <BrainCircuit className="w-8 h-8 text-primary mb-2" />
            <CardTitle>Inteligência Artificial</CardTitle>
            <CardDescription>
              Ajuste as diretrizes de persona (Bia) e as regras globais (IA Mãe).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/settings/ai">Configurar IA</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <Bot className="w-8 h-8 text-primary mb-2" />
            <CardTitle>Conexões Meta/Uazapi</CardTitle>
            <CardDescription>Configure o WhatsApp, Meta CAPI e outras integrações.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/settings/connections">Ver Conexões</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <Settings className="w-8 h-8 text-primary mb-2" />
            <CardTitle>Remarketing</CardTitle>
            <CardDescription>Gerencie suas configurações de remarketing e disparo.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/settings/remarketing">Ver Remarketing</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
