migrate(
  (app) => {
    try {
      const lastLog = app.findFirstRecordByData('system_logs', 'id', 'tvsf3ip2awyxhan')
      if (!lastLog) return

      const parsed = JSON.parse(lastLog.getString('details') || '{}')
      const logCol = app.findCollectionByNameOrId('system_logs')

      // Log 1: debug_token e me
      const log1 = new Record(logCol)
      log1.set('user_id', 'g5jto8bhulw01bz')
      log1.set('type', 'api_integration')
      log1.set('message', 'Auditoria Token v21: debug_token + me')
      log1.set(
        'details',
        JSON.stringify({
          debug_token: parsed.debug_token || {},
          me: parsed.me || {},
        }),
      )
      log1.set('payload', JSON.stringify({ part: 'debug_me' }))
      app.saveNoValidate(log1)

      // Log 2: permissões concedidas vs ausentes
      const log2 = new Record(logCol)
      log2.set('user_id', 'g5jto8bhulw01bz')
      log2.set('type', 'api_integration')
      log2.set('message', 'Auditoria Token v21: Permissões')
      log2.set(
        'details',
        JSON.stringify({
          granted: parsed.grantedPermissions || [],
          missing: parsed.missingPermissions || [],
        }),
      )
      log2.set('payload', JSON.stringify({ part: 'permissions' }))
      app.saveNoValidate(log2)

      // Log 3: datasetCheck e testEventResult
      const log3 = new Record(logCol)
      log3.set('user_id', 'g5jto8bhulw01bz')
      log3.set('type', 'api_integration')
      log3.set('message', 'Auditoria Token v21: Dataset + Events Result')
      log3.set(
        'details',
        JSON.stringify({
          datasetCheck: parsed.datasetCheck || {},
          testEventResult: parsed.testEventResult || {},
        }),
      )
      log3.set('payload', JSON.stringify({ part: 'dataset_events' }))
      app.saveNoValidate(log3)
    } catch (_) {}
  },
  (app) => {},
)
