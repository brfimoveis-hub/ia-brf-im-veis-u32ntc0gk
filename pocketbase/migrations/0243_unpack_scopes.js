migrate(
  (app) => {
    const l = app.findFirstRecordByData('system_logs', 'id', '7816rmcsx8i4hgd')
    if (!l) return
    const d = JSON.parse(l.getString('details') || '{}')
    const bodyData = (d.body && d.body.data) || {}

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const r = new Record(logsCol)
    r.set('user_id', 'g5jto8bhulw01bz')
    r.set('type', 'meta_token_parsed_scopes')
    r.set('message', 'Parsed Token Info and Scopes')
    r.set(
      'details',
      JSON.stringify({
        app_id: bodyData.app_id,
        type: bodyData.type,
        user_id: bodyData.user_id,
        is_valid: bodyData.is_valid,
        expires_at: bodyData.expires_at,
        scopes: bodyData.scopes,
        granular_scopes: bodyData.granular_scopes,
      }),
    )
    app.saveNoValidate(r)
  },
  (app) => {},
)
