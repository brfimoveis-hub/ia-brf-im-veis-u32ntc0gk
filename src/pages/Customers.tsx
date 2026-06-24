import { Routes, Route, useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { CustomersOverview } from '@/components/customers/CustomersOverview'

function CustomerDetail() {
  const { id } = useParams()

  return (
    <div className="p-6">
      <Button variant="ghost" asChild className="mb-4">
        <Link to="/customers">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Link>
      </Button>
      <h2 className="text-2xl font-bold">Detalhes do Cliente</h2>
      <p className="text-muted-foreground mt-2">Visualizando CRM para o ID: {id}</p>
      <div className="mt-8 border rounded-lg p-8 bg-slate-50 text-center">
        <p className="text-sm text-slate-500">Módulo de CRM em desenvolvimento.</p>
      </div>
    </div>
  )
}

export default function Customers() {
  return (
    <Routes>
      <Route index element={<CustomersOverview />} />
      <Route path=":id" element={<CustomerDetail />} />
    </Routes>
  )
}
