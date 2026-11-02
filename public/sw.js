// Service Worker Kill-Switch (v0.0.1350)
// Desregistra todos os service workers da origem, limpa todos os caches e se auto-destrói.
// Não cacheia nenhum recurso da aplicação.

self.addEventListener('install', function (event) {
  // Pula a fila de espera para ativar imediatamente
  self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  event.waitUntil(
    (async function () {
      // 1. Apagar todos os caches da origem
      if ('caches' in self) {
        try {
          const keys = await caches.keys()
          await Promise.all(
            keys.map(function (k) {
              return caches.delete(k)
            }),
          )
        } catch (e) {
          console.warn('[SW Kill-Switch] Erro ao limpar caches:', e)
        }
      }

      // 2. Desregistrar TODOS os service workers existentes na origem
      if (self.registration && 'getRegistrations' in self.registration) {
        try {
          const regs = await self.registration.getRegistrations()
          await Promise.all(
            regs.map(function (r) {
              return r.unregister()
            }),
          )
        } catch (e) {
          console.warn('[SW Kill-Switch] Erro ao desregistrar outros SWs:', e)
        }
      }

      // 3. Tomar controle de todos os clientes abertos e avisá-los para recarregar
      try {
        await self.clients.claim()
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        for (const client of clients) {
          client.postMessage({ type: 'sw-kill-switch-reload', version: 'v0.0.1350' })
        }
      } catch (e) {
        console.warn('[SW Kill-Switch] Erro ao notificar clientes:', e)
      }

      // 4. Auto-desregistrar esta própria registration
      try {
        if (self.registration && typeof self.registration.unregister === 'function') {
          await self.registration.unregister()
        }
      } catch (e) {
        console.warn('[SW Kill-Switch] Erro no auto-unregister:', e)
      }
    })(),
  )
})

// Sem interceptação de fetch - passthrough transparente para a rede
