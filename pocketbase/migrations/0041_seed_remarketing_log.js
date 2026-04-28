migrate(
  (app) => {
    let user
    try {
      user = app.findFirstRecordByFilter('users', "email != ''")
    } catch (_) {
      return
    }

    const logsCol = app.findCollectionByNameOrId('system_logs')

    try {
      app.findFirstRecordByFilter(
        'system_logs',
        "message = 'Sincronizou 18 leads para o Meta CAPI.'",
      )
      return // already exists
    } catch (_) {
      const logRecord = new Record(logsCol)
      logRecord.set('user_id', user.id)
      logRecord.set('type', 'meta_sync')
      logRecord.set('message', 'Sincronizou 18 leads para o Meta CAPI.')
      logRecord.set('details', 'Palavra-chave: Remarketing_Q3, Evento: Lead')
      logRecord.set('payload', {
        count: 18,
        successCount: 18,
        metaResponse: 'Success',
      })
      app.save(logRecord)
    }
  },
  (app) => {
    try {
      const record = app.findFirstRecordByFilter(
        'system_logs',
        "message = 'Sincronizou 18 leads para o Meta CAPI.'",
      )
      app.delete(record)
    } catch (_) {}
  },
)
