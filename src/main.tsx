import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { installDomCrashGuard } from './lib/dom-crash-guard'
import App from './App'
import './main.css'

// Instala crash-guard global para erros de mutação DOM (insertBefore/removeChild)
installDomCrashGuard()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
