// Migration 0153: Grava detalhes expandidos em múltiplos registros de log para leitura fácil
migrate(
  (app) => {
    let diag = null
    try {
      diag = app.findFirstRecordByData('system_logs', 'id', 'h3iqdyxzqt8zv9o')
    } catch (_) {
      return
    }

    const fullDetailsStr = diag.getString('details') || ''
    const fullDetails = JSON.parse(fullDetailsStr)

    const logsCol = app.findCollectionByNameOrId('system_logs')

    // 1. Phone Info Log
    const phoneLog = new Record(logsCol)
    phoneLog.set('type', 'whatsapp_diag_phone')
    phoneLog.set('message', 'Phone Info Details')
    phoneLog.set('user_id', 'g5jto8bhulw01bz')
    phoneLog.set('details', JSON.stringify(fullDetails.phone_info || {}))
    app.save(phoneLog)

    // 2. Subscribed Apps Log
    const subLog = new Record(logsCol)
    subLog.set('type', 'whatsapp_diag_subs')
    subLog.set('message', 'Subscribed Apps Details')
    subLog.set('user_id', 'g5jto8bhulw01bz')
    subLog.set(
      'details',
      JSON.stringify({
        initial: fullDetails.subscribed_apps_initial,
        post: fullDetails.subscribed_apps_post,
        verify: fullDetails.subscribed_apps_verify,
      }),
    )
    app.save(subLog)

    // 3. Debug Token Log
    const debugLog = new Record(logsCol)
    debugLog.set('type', 'whatsapp_diag_debug')
    debugLog.set('message', 'Debug Token Details')
    debugLog.set('user_id', 'g5jto8bhulw01bz')
    debugLog.set('details', JSON.stringify(fullDetails.debug_token || {}))
    app.save(debugLog)
  },
  (app) => {},
)
