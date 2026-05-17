import { Navigate } from 'react-router-dom'

export default function Index() {
  // O dashboard é a tela inicial principal para usuários autenticados
  return <Navigate to="/dashboard" replace />
}
