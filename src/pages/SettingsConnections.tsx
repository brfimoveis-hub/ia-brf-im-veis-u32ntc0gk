import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { UazapiConfig } from '@/components/UazapiConfig'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function SettingsConnections() {
  const location = useLocation()
  const currentTab = location.pathname.includes('/meta') ? 'meta' : 'uazapi'

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conexões</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as integrações da sua IA com plataformas externas.
        </p>
      </div>

      <Tabs value={currentTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="uazapi" asChild>
            <Link to="/settings/connections/uazapi">WhatsApp (Uazapi)</Link>
          </TabsTrigger>
          <TabsTrigger value="meta" asChild>
            <Link to="/settings/connections/meta">Meta (Facebook/Insta)</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Routes>
        <Route path="/" element={<Navigate to="uazapi" replace />} />
        <Route path="uazapi" element={<UazapiConfig />} />
        <Route
          path="meta"
          element={
            <div className="p-8 border rounded-lg bg-card text-center text-muted-foreground">
              Configuração do Meta Ads em breve.
            </div>
          }
        />
      </Routes>
    </div>
  )
}
