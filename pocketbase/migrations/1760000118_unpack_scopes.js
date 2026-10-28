// Migration 1760000118: Desempacotar dados do debug_token do Page Token
migrate(
  (app) => {
    const log = app.findFirstRecordByFilter('system_logs', "id = 'lzmhobf7glxx171'")
    if (!log) return

    let data = {}
    try {
      const parsed = JSON.parse(log.getString('details'))
      data = parsed.data || {}
    } catch (_) {}

    const sysLogsCol = app.findCollectionByNameOrId('system_logs')
    const r = new Record(sysLogsCol, {
      user_id: log.getString('user_id'),
      type: 'messenger_token_scopes',
      message: `App: ${data.app_id} | Page: ${data.profile_id} | IsValid: ${data.is_valid}`,
      details: `Scopes: ${JSON.stringify(data.scopes || [])} | Granular: ${JSON.stringify(data.granular_scopes || [])}`,
      payload: {
        app_id: data.app_id,
        type: data.type,
        is_valid: data.is_valid,
        profile_id: data.profile_id,
        scopes: data.scopes,
      },
    })
    app.save(r)
  },
  (app) => {},
)
