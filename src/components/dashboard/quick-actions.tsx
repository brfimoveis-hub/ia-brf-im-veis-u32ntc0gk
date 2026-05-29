import { Button } from '@/components/ui/button'
import { PlusCircle, Settings, Share2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="default" size="sm">
        <Link to="/clientes">
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Lead
        </Link>
      </Button>
      <Button asChild variant="secondary" size="sm">
        <Link to="/configuracoes">
          <Settings className="mr-2 h-4 w-4" />
          Configurar IA
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link to="/configuracoes/meta-capi">
          <Share2 className="mr-2 h-4 w-4" />
          Atualizar Token Meta
        </Link>
      </Button>
    </div>
  )
}
