migrate(
  (app) => {
    let log = null
    try {
      log = app.findFirstRecordByData('system_logs', 'id', 'psx40db42uduapz')
    } catch (_) {
      return
    }
    if (!log) return

    const fullDetails = JSON.parse(log.getString('details') || '{}')
    const waPerms =
      (fullDetails.wa &&
        fullDetails.wa.permissions &&
        fullDetails.wa.permissions.body &&
        fullDetails.wa.permissions.body.data) ||
      []
    const capiPerms =
      (fullDetails.capi &&
        fullDetails.capi.permissions &&
        fullDetails.capi.permissions.body &&
        fullDetails.capi.permissions.body.data) ||
      []

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const rec = new Record(logsCol)
    rec.set('user_id', log.getString('user_id'))
    rec.set('type', 'api_integration')
    rec.set('message', 'Unpacked Permissions')
    rec.set(
      'details',
      JSON.stringify({
        wa_granted: waPerms.map((p) => p.permission),
        capi_granted: capiPerms.map((p) => p.permission),
      }),
    )
    rec.set('payload', JSON.stringify({ probe: 'perms_only' }))
    app.saveNoValidate(rec)
  },
  (app) => {},
)
