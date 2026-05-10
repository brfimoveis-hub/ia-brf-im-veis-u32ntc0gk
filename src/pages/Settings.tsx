import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SettingsAi } from './settings/SettingsAi'
import { SettingsUazapi } from './settings/SettingsUazapi'
import { SettingsCadences } from './settings/SettingsCadences'
import { MessageSquare, Bot, ListOrdered } from 'lucide-react'

export default function Settings() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações Gerais</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie sua Inteligência Artificial, integrações e réguas de cadência de forma
          centralizada.
        </p>
      </div>
      <Tabs defaultValue="ai" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="ai" className="flex items-center justify-center gap-2 py-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">Perfis BIA</span>
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
