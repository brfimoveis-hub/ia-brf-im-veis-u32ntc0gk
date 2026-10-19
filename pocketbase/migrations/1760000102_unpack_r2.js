migrate(
  (app) => {
    let rec = null
    try {
      rec = app.findRecordById('system_logs', '9100jnlwurb78h9')
    } catch (_) {}
    if (!rec) return

    const raw = rec.getString('details') || ''
    const idx = raw.indexOf('"r2":')
    if (idx !== -1) {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const l = new Record(logsCol, {
        type: 'probe_slice_r2',
        message: 'R2 slice',
        details: raw.slice(idx, idx + 400),
      })
      app.save(l)
    }
  },
  (app) => {},
)
