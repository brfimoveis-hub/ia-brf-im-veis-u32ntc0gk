import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { MetaCapiConfig } from './MetaCapiConfig'

export default function ConfiguracoesCore() {
  const location = useLocation()

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as integrações e parâmetros do sistema.</p>
      </div>

      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0 flex-1 min-h-0">
        <aside className="-mx-4 lg:w-1/5">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1 px-4 lg:px-0">
            <Link
              to="/configuracoes/meta-capi"
              className={`justify-start ${
                location.pathname.includes('/meta-capi')
                  ? 'bg-muted hover:bg-muted font-semibold'
                  : 'hover:bg-transparent hover:underline'
              } inline-flex items-center rounded-md px-3 py-2 text-sm`}
            >
              Meta CAPI
            </Link>
          </nav>
        </aside>
        <div className="flex-1 min-h-0 overflow-auto px-4 lg:px-0">
          <Routes>
            <Route path="/" element={<Navigate to="meta-capi" replace />} />
            <Route path="meta-capi" element={<MetaCapiConfig />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
