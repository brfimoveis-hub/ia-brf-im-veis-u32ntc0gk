import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { MetaWhatsAppPanel } from './SettingsConnections/MetaWhatsAppPanel'
import CapiPanel from './SettingsConnections/CapiPanel'
import IntegrationLogs from './SettingsConnections/IntegrationLogs'
import ChavesNaMao from './SettingsConnections/ChavesNaMao'
import { StatusTrafficLight } from './SettingsConnections/StatusTrafficLight'
import { MessageCircle, TrendingUp } from 'lucide-react'

export default function SettingsConnections() {
  const { user } = useAuth()
  const [metaStatus, setMetaStatus] = useState('')
  const [capiStatus, setCapiStatus] = useState('')
  const [capiError, setCapiError] = useState('')

  useEffect(() => {
    if (user) {
      setMetaStatus(user.meta_token_status || '')
      setCapiStatus(user.meta_capi_status || '')
      setCapiError(user.meta_capi_error || '')
    }
  }, [user])

  useRealtime('users', (e) => {
    if (!user?.id || e.record.id !== user.id) return
    setMetaStatus(e.record.meta_token_status || '')
    setCapiStatus(e.record.meta_capi_status || '')
    setCapiError(e.record.meta_capi_error || '')
  })

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
        <p className="text-muted-foreground">
          Configure suas integrações com Meta API e portais de imóveis no BRF IA CRM.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Meta WhatsApp API</span>
            </div>
            <StatusTrafficLight status={metaStatus} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Conversions API (CAPI)</span>
            </div>
            <StatusTrafficLight status={capiStatus} error={capiError} />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="meta">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="meta">Meta API Configuration</TabsTrigger>
          <TabsTrigger value="capi">Conversions API (CAPI)</TabsTrigger>
          <TabsTrigger value="logs">Integration Logs</TabsTrigger>
          <TabsTrigger value="chaves">ChavesNaMao</TabsTrigger>
        </TabsList>

        <TabsContent value="meta" className="mt-4">
          <MetaWhatsAppPanel />
        </TabsContent>

        <TabsContent value="capi" className="mt-4">
          <CapiPanel />
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <IntegrationLogs />
        </TabsContent>

        <TabsContent value="chaves" className="mt-4">
          <ChavesNaMao />
        </TabsContent>
      </Tabs>
    </div>
  )
}
