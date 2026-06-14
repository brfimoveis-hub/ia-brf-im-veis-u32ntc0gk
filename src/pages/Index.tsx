import { UazapiConfig } from '@/components/UazapiConfig'

const Index = () => {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas conexões e configurações do WhatsApp.
        </p>
      </div>

      <UazapiConfig />
    </div>
  )
}

export default Index
