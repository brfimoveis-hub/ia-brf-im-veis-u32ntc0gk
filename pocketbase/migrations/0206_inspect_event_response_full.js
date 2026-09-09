migrate(
  (app) => {
    try {
      const logRec = app.findFirstRecordByData('system_logs', 'id', '5qtwrsbmgo0n3is')
      if (!logRec) return

      const parsed = JSON.parse(logRec.getString('details') || '{}')
      const logCol = app.findCollectionByNameOrId('system_logs')

      const logEvent = new Record(logCol)
      logEvent.set('user_id', 'g5jto8bhulw01bz')
      logEvent.set('type', 'api_integration')
      logEvent.set('message', 'Auditoria Event Result Detalhado')
      logEvent.set('details', JSON.stringify(parsed.testEventResult || {}))
      logEvent.set('payload', JSON.stringify({ part: 'event_response_full' }))
      app.saveNoValidate(logEvent)
    } catch (_) {}
  },
  (app) => {},
)
