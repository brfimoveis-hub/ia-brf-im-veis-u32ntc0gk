import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SettingsAi } from './settings/SettingsAi'
import { SettingsUazapi } from './settings/SettingsUazapi'
import { SettingsCadences } from './settings/SettingsCadences'

export default function Settings() {
  return (
    <div className="container mx-auto py-8 max-w-5xl px-4 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas preferências de IA, integrações e cadências.
        </p>
      </div>

      <Tabs defaultValue="ai" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto bg-transparent border-b rounded-none h-auto p-0">
          <TabsTrigger
            value="ai"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
          >
            Inteligência Artificial
          </TabsTrigger>
          <TabsTrigger
            value="uazapi"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
          >
            WhatsApp (Uazapi)
          </TabsTrigger>
          <TabsTrigger
            value="cadences"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
          >
            Cadências
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
          <SettingsAi />
        </TabsContent>
        <TabsContent
          value="uazapi"
          className="mt-6 focus-visible:outline-none focus-visible:ring-0"
        >
          <SettingsUazapi />
        </TabsContent>
        <TabsContent
          value="cadences"
          className="mt-6 focus-visible:outline-none focus-visible:ring-0"
        >
          <SettingsCadences />
        </TabsContent>
      </Tabs>
    </div>
  )
}
