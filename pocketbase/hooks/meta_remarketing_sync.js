routerAdd(
  'POST',
  '/backend/v1/meta-remarketing-sync',
  (e) => {
    // Sincronização server-side via CAPI desativada.
    return e.json(200, {
      success: true,
      synced: 0,
      message: 'Sincronização server-side (CAPI) foi desativada no sistema.',
    })
  },
  $apis.requireAuth(),
)
