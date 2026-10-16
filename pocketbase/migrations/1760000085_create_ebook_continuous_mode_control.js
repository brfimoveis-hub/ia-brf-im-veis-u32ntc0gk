migrate(
  (app) => {
    // Inicializa o controle de estado do Modo Contínuo de Reenvio de E-book em app_controls
    try {
      const col = app.findCollectionByNameOrId('app_controls')
      let ctrl = null
      try {
        ctrl = app.findFirstRecordByFilter('app_controls', "key = 'ebook_continuous_mode'")
      } catch (_) {}

      if (!ctrl) {
        ctrl = new Record(col)
        ctrl.set('key', 'ebook_continuous_mode')
        ctrl.set('name', 'Modo Contínuo de Reenvio de E-book (Vistage)')
        ctrl.set('is_active', false)
        ctrl.set(
          'description',
          'Controle de disparo contínuo automático a cada 15 minutos (máx 15 por lote) na janela 8h-18h Brasília.',
        )
        ctrl.set('metadata', {
          next_batch_at: null,
          last_dispatched_at: null,
          last_dispatched_count: 0,
          remaining_pending: 0,
          stop_reason: null,
        })
        app.saveNoValidate(ctrl)
        console.log('[MIGRATION 1760000085] Controle ebook_continuous_mode criado em app_controls.')
      }
    } catch (e) {
      console.warn('[MIGRATION 1760000085] Aviso:', e.message)
    }
  },
  (app) => {
    try {
      const ctrl = app.findFirstRecordByFilter('app_controls', "key = 'ebook_continuous_mode'")
      if (ctrl) {
        app.delete(ctrl)
      }
    } catch (_) {}
  },
)
