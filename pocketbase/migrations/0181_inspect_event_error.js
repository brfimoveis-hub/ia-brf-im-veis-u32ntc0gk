migrate(
  (app) => {
    try {
      const log = app.findFirstRecordByData('system_logs', 'id', '4a27p9l3qujzvvx')
      const details = log.getString('details')
      log.set('message', details.slice(0, 250))
      app.saveNoValidate(log)
    } catch (_) {}
  },
  (app) => {},
)
