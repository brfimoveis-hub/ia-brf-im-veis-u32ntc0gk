migrate(
  (app) => {
    try {
      const logRec = app.findRecordById('system_logs', '445albu1cpv45wy')
      const details = JSON.parse(logRec.getString('details') || '{}')
      logRec.set('message', 'Validação CAPI: ' + JSON.stringify(details.grantedPermissions))
      app.saveNoValidate(logRec)
    } catch (_) {}
  },
  (app) => {},
)
