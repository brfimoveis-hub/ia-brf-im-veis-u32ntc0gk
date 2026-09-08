// Migration 0155: Extrai campos específicos de debug_self e permissions
migrate(
  (app) => {
    let rec = null
    try {
      rec = app.findFirstRecordByData('system_logs', 'id', 'uaas5lsr3w7na3s')
    } catch (_) {
      return
    }

    const details = JSON.parse(rec.getString('details') || '{}')
    const debugData =
      (details.debug_self && details.debug_self.body && details.debug_self.body.data) || {}
    const permsData = (details.perms && details.perms.body && details.perms.body.data) || []
    const meData = (details.me && details.me.body) || {}

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const log = new Record(logsCol)
    log.set('type', 'whatsapp_diag_summary')
    log.set(
      'message',
      'VALID: is_valid=' +
        debugData.is_valid +
        ' app_id=' +
        debugData.app_id +
        ' type=' +
        debugData.type +
        ' expires_at=' +
        debugData.expires_at,
    )
    log.set('user_id', 'g5jto8bhulw01bz')
    log.set(
      'payload',
      JSON.stringify({
        is_valid: debugData.is_valid,
        app_id: debugData.app_id,
        application: debugData.application,
        type: debugData.type,
        expires_at: debugData.expires_at,
        data_access_expires_at: debugData.data_access_expires_at,
        scopes: debugData.scopes,
        granular_scopes: debugData.granular_scopes,
        user_id_system: debugData.user_id,
        me: meData,
      }),
    )
    log.set('details', JSON.stringify({ scopes: debugData.scopes, perms: permsData, me: meData }))
    app.save(log)
  },
  (app) => {},
)
