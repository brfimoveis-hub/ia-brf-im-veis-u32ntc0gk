import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DiagnosticCenter } from '@/components/DiagnosticCenter'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const ConfiguracoesCore = () => {
  const [open, setOpen] = useState(false)

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações do Sistema</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie integrações, diagnósticos e preferências da sua conta de forma centralizada.
          </p>
        </div>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Ajuda / Suporte
        </Button>
      </div>

      <Tabs defaultValue="diagnostics" className="w-full">
        <TabsList className="mb-4 bg-muted/50 border">
          <TabsTrigger value="diagnostics">Diagnóstico e Integrações</TabsTrigger>
          <TabsTrigger value="geral">Geral</TabsTrigger>
        </TabsList>
        <TabsContent value="diagnostics" className="mt-6">
          <DiagnosticCenter />
        </TabsContent>
        <TabsContent value="geral" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>Ajustes básicos e preferências do sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Mais opções de configuração da conta serão adicionadas aqui em breve.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuda e Suporte</DialogTitle>
            <DialogDescription>
              Precisa de ajuda para configurar os canais de integração Uazapi ou Meta Pixel?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Acesse a documentação oficial do CRM ou entre em contato com nosso suporte técnico
              para orientações detalhadas sobre a manutenção da estabilidade de seus fluxos.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ConfiguracoesCore
