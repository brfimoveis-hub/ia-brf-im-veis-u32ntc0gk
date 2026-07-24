migrate(
  (app) => {
    try {
      const customers = app.findRecordsByFilter(
        'customers',
        "source ~ 'uazapi' || source ~ 'Uazapi' || source ~ 'UAZAPI' || notes ~ 'uazapi' || notes ~ 'Uazapi'",
        '',
        1000,
        0,
      )
      for (const customer of customers) {
        let changed = false
        const source = customer.getString('source')
        if (source && source.toLowerCase().includes('uazapi')) {
          customer.set('source', source.replace(/uazapi/gi, 'Meta'))
          changed = true
        }
        const notes = customer.getString('notes')
        if (notes && notes.toLowerCase().includes('uazapi')) {
          customer.set('notes', notes.replace(/uazapi/gi, 'Meta'))
          changed = true
        }
        if (changed) {
          app.saveNoValidate(customer)
        }
      }
    } catch (_) {}

    try {
      const logs = app.findRecordsByFilter(
        'system_logs',
        "type ~ 'uazapi' || type ~ 'Uazapi' || message ~ 'uazapi' || message ~ 'Uazapi' || details ~ 'uazapi' || details ~ 'Uazapi'",
        '',
        1000,
        0,
      )
      for (const log of logs) {
        app.delete(log)
      }
    } catch (_) {}

    try {
      const leads = app.findRecordsByFilter(
        'leads',
        "source ~ 'uazapi' || source ~ 'Uazapi' || notes ~ 'uazapi' || notes ~ 'Uazapi'",
        '',
        1000,
        0,
      )
      for (const lead of leads) {
        let changed = false
        const source = lead.getString('source')
        if (source && source.toLowerCase().includes('uazapi')) {
          lead.set('source', source.replace(/uazapi/gi, 'Meta'))
          changed = true
        }
        const notes = lead.getString('notes')
        if (notes && notes.toLowerCase().includes('uazapi')) {
          lead.set('notes', notes.replace(/uazapi/gi, 'Meta'))
          changed = true
        }
        if (changed) {
          app.saveNoValidate(lead)
        }
      }
    } catch (_) {}

    try {
      const log = new Record(app.findCollectionByNameOrId('system_logs'))
      log.set('type', 'system_cleanup')
      log.set(
        'message',
        'Uazapi references purged from database — Meta WhatsApp Cloud API is now the sole messaging provider',
      )
      log.set('details', { cleanup: 'uazapi_purge', timestamp: new Date().toISOString() })
      app.save(log)
    } catch (_) {}
  },
  (app) => {
    // Irreversible data cleanup — no meaningful down migration
  },
)
