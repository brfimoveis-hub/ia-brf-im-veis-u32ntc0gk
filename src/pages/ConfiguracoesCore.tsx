import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { UazapiConfig } from '@/components/UazapiConfig'
import { MetaCapiConfig } from './MetaCapiConfig'

export default function ConfiguracoesCore() {
  const location = useLocation()

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">Gerencie as integrações e parâmetros do sistema.</p>
      </div>

      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="-mx-4 lg:w-1/5">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
            <Link
              to="/configuracoes/uazapi"
              className={`justify-start px-4 py-2 rounded-md ${location.pathname.includes('/uazapi') ? 'bg-muted font-bold' : 'hover:bg-transparent hover:underline'}`}
            >
              Integração Uazapi
            </Link>
            <Link
              to="/configuracoes/meta-capi"
              className={`justify-start px-4 py-2 rounded-md ${location.pathname.includes('/meta-capi') ? 'bg-muted font-bold' : 'hover:bg-transparent hover:underline'}`}
            >
              Configurações Meta CAPI
            </Link>
          </nav>
        </aside>
        <div className="flex-1 lg:max-w-3xl">
          <Routes>
            <Route path="/" element={<Navigate to="uazapi" replace />} />
            <Route path="uazapi" element={<UazapiConfig />} />
            <Route path="meta-capi" element={<MetaCapiConfig />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
