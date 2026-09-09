migrate(
  (app) => {
    try {
      const lastLog = app.findFirstRecordByData('system_logs', 'id', 'ofc954z33mvaqhn')
      if (!lastLog) return

      const parsedDetails = JSON.parse(lastLog.getString('details') || '{}')

      const debugLogRec = new Record(app.findCollectionByNameOrId('system_logs'))
      debugLogRec.set('user_id', 'g5jto8bhulw01bz')
      debugLogRec.set('type', 'api_integration')
      debugLogRec.set('message', 'Auditoria Permissões Concedidas vs Ausentes (Token BIA CRM)')
      debugLogRec.set(
        'details',
        JSON.stringify({
          granted: parsedDetails.grantedPermissions || [],
          missing: parsedDetails.missingPermissions || [],
          datasetCheck: parsedDetails.datasetCheck || null,
          testEventResult: parsedDetails.testEventResult || null,
          me: parsedDetails.me || null,
        }),
      )
      debugLogRec.set('payload', JSON.stringify({ audit: 'permissions_inspection' }))
      app.saveNoValidate(debugLogRec)
    } catch (_) {}
  },
  (app) => {},
)
