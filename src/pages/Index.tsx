import { Navigate } from 'react-router-dom'

export default function Index() {
  let to = '/dashboard'
  try {
    const saved = localStorage.getItem('currentRoute')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed && parsed.path && parsed.path !== '/') {
        to = parsed.path
      }
    }
  } catch (e) {
    // ignore
  }
  return <Navigate to={to} replace />
}
