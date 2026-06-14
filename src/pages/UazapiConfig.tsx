import { UazapiConfig as Config } from '@/components/UazapiConfig'

export default function UazapiConfigPage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conexões Uazapi</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas instâncias e credenciais para o WhatsApp.
        </p>
      </div>
      <Config />
    </div>
  )
}
