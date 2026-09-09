migrate(
  (app) => {
    try {
      const log = app.findFirstRecordByData('system_logs', 'id', '6rfyr8sia2pqx57')
      const details = log.getString('details')
      // Save details into message or payload so we can read it easily
      log.set('message', details.slice(0, 200))
      log.set('type', 'api_integration')
      app.saveNoValidate(log)
    } catch (_) {}
  },
  (app) => {},
)
