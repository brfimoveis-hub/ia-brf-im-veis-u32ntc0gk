import { UazapiConfig } from '@/components/UazapiConfig'

const Index = () => {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Central</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas integrações e monitore o status do sistema em tempo real.
        </p>
      </div>

      <div className="grid gap-6">
        <UazapiConfig />
      </div>
    </div>
  )
}

export default Index
