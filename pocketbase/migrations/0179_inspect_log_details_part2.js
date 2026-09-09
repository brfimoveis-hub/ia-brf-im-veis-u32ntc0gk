migrate(
  (app) => {
    try {
      const log = app.findFirstRecordByData('system_logs', 'id', '6rfyr8sia2pqx57')
      const details = log.getString('details')
      // Slice from index 180 to 400
      log.set('message', details.slice(180, 380))
      app.saveNoValidate(log)
    } catch (_) {}
  },
  (app) => {},
)
