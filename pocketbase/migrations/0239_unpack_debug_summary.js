migrate(
  (app) => {
    const l = app.findFirstRecordByData('system_logs', 'id', 'gr8z72vh9q6u9xq')
    if (!l) return
    const d = JSON.parse(l.getString('details') || '{}')
    const debugToken = (d.debug_token && d.debug_token.data && d.debug_token.data.data) || {}

    const logsCol = app.findCollectionByNameOrId('system_logs')

    // 1. debug info
    const r1 = new Record(logsCol)
    r1.set('user_id', 'g5jto8bhulw01bz')
    r1.set('type', 'meta_token_summary_1')
    r1.set('message', 'Debug Token Summary')
    r1.set(
      'details',
      JSON.stringify({
        app_id: debugToken.app_id,
        type: debugToken.type,
        application: debugToken.application,
        data_access_expires_at: debugToken.data_access_expires_at,
        expires_at: debugToken.expires_at,
        is_valid: debugToken.is_valid,
        scopes: debugToken.scopes,
        user_id: debugToken.user_id,
      }),
    )
    app.saveNoValidate(r1)

    // 2. target error message full
    const r2 = new Record(logsCol)
    r2.set('user_id', 'g5jto8bhulw01bz')
    r2.set('type', 'meta_token_summary_2')
    r2.set('message', 'Target Error Full')
    r2.set('details', d.target_page_err_message)
    app.saveNoValidate(r2)
  },
  (app) => {},
)
