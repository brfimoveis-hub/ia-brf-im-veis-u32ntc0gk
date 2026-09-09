migrate(
  (app) => {
    try {
      const logRec = app.findFirstRecordByData('system_logs', 'id', 'gq44xethb1zo99m')
      if (!logRec) return

      const parsed = JSON.parse(logRec.getString('details') || '{}')
      const debugData = parsed.debug_token || {}
      const meData = parsed.me || {}

      const logCol = app.findCollectionByNameOrId('system_logs')

      const logSummary = new Record(logCol)
      logSummary.set('user_id', 'g5jto8bhulw01bz')
      logSummary.set('type', 'api_integration')
      logSummary.set('message', 'Resumo Verificação Token Mauro Novo')
      logSummary.set(
        'details',
        JSON.stringify({
          is_valid: debugData.is_valid,
          expires_at: debugData.expires_at,
          app_id: debugData.app_id,
          type: debugData.type,
          scopes: debugData.scopes,
          granular_scopes: debugData.granular_scopes,
          me_name: meData.name,
          me_id: meData.id,
        }),
      )
      logSummary.set('payload', JSON.stringify({ part: 'token_summary_extracted' }))
      app.saveNoValidate(logSummary)
    } catch (_) {}
  },
  (app) => {},
)
