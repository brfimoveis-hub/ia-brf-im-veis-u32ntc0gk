import { Navigate } from 'react-router-dom'

export default function Index() {
  // Redirecionamento simples para o dashboard para garantir a integridade da rota
  // e evitar renderização indevida nas rotas de configuração
  return <Navigate to="/dashboard" replace />
}
