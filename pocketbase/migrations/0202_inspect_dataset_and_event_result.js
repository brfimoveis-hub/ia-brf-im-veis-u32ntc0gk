migrate(
  (app) => {
    try {
      const lastLog = app.findFirstRecordByData('system_logs', 'id', 'ofc954z33mvaqhn')
      if (!lastLog) return

      const parsed = JSON.parse(lastLog.getString('details') || '{}')

      const logCol = app.findCollectionByNameOrId('system_logs')

      const log1 = new Record(logCol)
      log1.set('user_id', 'g5jto8bhulw01bz')
      log1.set('type', 'api_integration')
      log1.set('message', 'Auditoria Detalhada: Dataset Check')
      log1.set('details', JSON.stringify(parsed.datasetCheck || {}))
      log1.set('payload', JSON.stringify({ part: 1 }))
      app.saveNoValidate(log1)

      const log2 = new Record(logCol)
      log2.set('user_id', 'g5jto8bhulw01bz')
      log2.set('type', 'api_integration')
      log2.set('message', 'Auditoria Detalhada: Test Event Result')
      log2.set('details', JSON.stringify(parsed.testEventResult || {}))
      log2.set('payload', JSON.stringify({ part: 2 }))
      app.saveNoValidate(log2)
    } catch (_) {}
  },
  (app) => {},
)
