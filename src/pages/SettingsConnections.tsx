import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { MetaWhatsAppPanel } from './SettingsConnections/MetaWhatsAppPanel'
import CapiPanel from './SettingsConnections/CapiPanel'
import IntegrationLogs from './SettingsConnections/IntegrationLogs'
import ChavesNaMao from './SettingsConnections/ChavesNaMao'
import { StatusTrafficLight } from './SettingsConnections/StatusTrafficLight'
import { ConnectionHealthDashboard } from './SettingsConnections/ConnectionHealthDashboard'
import { InstagramConnect } from './SettingsConnections/InstagramConnect'
import { VerifiableConnectionCard } from './SettingsConnections/VerifiableConnectionCard'
import { MessageCircle, TrendingUp, Instagram, MessageSquare } from 'lucide-react'

export default function SettingsConnections() {
  const { user, loading } = useAuth()
  const [metaStatus, setMetaStatus] = useState('')
  const [capiStatus, setCapiStatus] = useState('')
  const [capiError, setCapiError] = useState('')
  const [instagramStatus, setInstagramStatus] = useState('')
  const [messengerStatus, setMessengerStatus] = useState('')
  const [instagramErrorMsg, setInstagramErrorMsg] = useState('')
  const [messengerErrorMsg, setMessengerErrorMsg] = useState('')

  useEffect(() => {
    if (user) {
      setMetaStatus(user.meta_token_status || '')
      setCapiStatus(user.meta_capi_status || '')
      setCapiError(user.meta_capi_error || '')
      setInstagramStatus(user.meta_instagram_business_id ? 'connected' : '')
      setMessengerStatus(user.meta_page_access_token ? 'connected' : '')
      setInstagramErrorMsg('')
      setMessengerErrorMsg('')
    }
  }, [user])

  useRealtime('users', (e) => {
    if (!user?.id || e.record.id !== user.id) return
    setMetaStatus(e.record.meta_token_status || '')
    setCapiStatus(e.record.meta_capi_status || '')
    setCapiError(e.record.meta_capi_error || '')
    setInstagramStatus(e.record.meta_instagram_business_id ? 'connected' : '')
    setMessengerStatus(e.record.meta_page_access_token ? 'connected' : '')
    setInstagramErrorMsg('')
    setMessengerErrorMsg('')
  })

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto animate-fade-in">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    )
  }

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
        <VerifiableConnectionCard
          icon={<Instagram className="h-5 w-5 text-muted-foreground" />}
          title="Instagram Business"
          status={instagramStatus}
          error={instagramErrorMsg}
          connectionKey="instagram"
          onStatusChange={(s, e) => {
            setInstagramStatus(s)
            setInstagramErrorMsg(e || '')
          }}
        />
        <VerifiableConnectionCard
          icon={<MessageSquare className="h-5 w-5 text-muted-foreground" />}
          title="Messenger"
          status={messengerStatus}
          error={messengerErrorMsg}
          connectionKey="messenger"
          onStatusChange={(s, e) => {
            setMessengerStatus(s)
            setMessengerErrorMsg(e || '')
          }}
        />
      </div>

      <ConnectionHealthDashboard />

      <Tabs defaultValue="meta">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="meta">Meta API Configuration</TabsTrigger>
          <TabsTrigger value="capi">Conversions API (CAPI)</TabsTrigger>
          <TabsTrigger value="logs">Integration Logs</TabsTrigger>
          <TabsTrigger value="chaves">ChavesNaMao</TabsTrigger>
        </TabsList>

        <TabsContent value="meta" className="mt-4 space-y-4">
          <InstagramConnect />
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
