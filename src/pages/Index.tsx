import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Users, Settings, Database } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Index() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard CRM BRF</h1>
        <p className="text-muted-foreground mt-2">
          Visão geral do sistema, integrações e leads recentes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/configuracoes">
          <Card className="hover:bg-muted/50 transition-colors border-border shadow-sm cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Saúde do Sistema</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Diagnósticos</div>
              <p className="text-xs text-muted-foreground mt-1">Verificar Meta & Uazapi</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/clientes">
          <Card className="hover:bg-muted/50 transition-colors border-border shadow-sm cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Leads</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Gerenciar</div>
              <p className="text-xs text-muted-foreground mt-1">Acessar CRM e contatos</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/cadencias">
          <Card className="hover:bg-muted/50 transition-colors border-border shadow-sm cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Cadências</CardTitle>
              <Database className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Automações</div>
              <p className="text-xs text-muted-foreground mt-1">Regras e respostas da IA</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/configuracoes/meta-capi">
          <Card className="hover:bg-muted/50 transition-colors border-border shadow-sm cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Configurações</CardTitle>
              <Settings className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Ajustes</div>
              <p className="text-xs text-muted-foreground mt-1">Pixel, Tokens e Uazapi</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
