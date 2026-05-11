import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SettingsAi } from './settings/SettingsAi'
import { SettingsUazapi } from './settings/SettingsUazapi'
import { SettingsCadences } from './settings/SettingsCadences'
import { MessageSquare, Bot, ListOrdered, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Settings() {
  const handleHardRefresh = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister()
        }
      })
    }
    window.location.reload()
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">IA Mãe - Neural Hub</h1>
          <p className="text-muted-foreground mt-2">
            Centro de controle para a IA Mãe: gerencie a expert core, status das integrações e
            cadências imobiliárias (SC).
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleHardRefresh}
          className="shrink-0 text-muted-foreground"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Atualizar Sistema
        </Button>
      </div>
      <Tabs defaultValue="ai" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="ai" className="flex items-center justify-center gap-2 py-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">Core Expert (Mãe)</span>
          </TabsTrigger>
          <TabsTrigger value="uazapi" className="flex items-center justify-center gap-2 py-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Conexão Uazapi</span>
          </TabsTrigger>
          <TabsTrigger value="cadences" className="flex items-center justify-center gap-2 py-2">
            <ListOrdered className="h-4 w-4" />
            <span className="hidden sm:inline">Cadências Inteligentes</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="ai" className="space-y-4 outline-none">
          <SettingsAi />
        </TabsContent>
        <TabsContent value="uazapi" className="space-y-4 outline-none">
          <SettingsUazapi />
        </TabsContent>
        <TabsContent value="cadences" className="space-y-4 outline-none">
          <SettingsCadences />
        </TabsContent>
      </Tabs>
    </div>
  )
}
