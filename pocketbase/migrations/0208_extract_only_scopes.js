migrate(
  (app) => {
    try {
      const logRec = app.findFirstRecordByData('system_logs', 'id', 'uma31fpnbus3cqq')
      if (!logRec) return

      const parsed = JSON.parse(logRec.getString('details') || '{}')
      const logCol = app.findCollectionByNameOrId('system_logs')

      const logScopes = new Record(logCol)
      logScopes.set('user_id', 'g5jto8bhulw01bz')
      logScopes.set('type', 'api_integration')
      logScopes.set('message', 'Scopes do Token Novo Mauro')
      logScopes.set(
        'details',
        JSON.stringify({
          scopes: parsed.scopes || [],
          me_name: parsed.me_name,
          me_id: parsed.me_id,
          app_id: parsed.app_id,
          type: parsed.type,
          expires_at: parsed.expires_at,
          is_valid: parsed.is_valid,
        }),
      )
      logScopes.set('payload', JSON.stringify({ part: 'only_scopes' }))
      app.saveNoValidate(logScopes)
    } catch (_) {}
  },
  (app) => {},
)
