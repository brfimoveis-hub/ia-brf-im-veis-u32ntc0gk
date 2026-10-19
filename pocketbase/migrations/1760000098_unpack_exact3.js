migrate(
  (app) => {
    let rec = null
    try {
      rec = app.findRecordById('system_logs', '62w00kc72ik9o1q')
    } catch (_) {}
    if (!rec) return

    const rawPayload = rec.getString('payload') || ''
    const logsCol = app.findCollectionByNameOrId('system_logs')

    const p3 = rawPayload.slice(750, 1100)

    const log4 = new Record(logsCol, {
      type: 'probe_slice_exact3',
      message: 'Slice 3',
      details: p3,
    })
    app.save(log4)
  },
  (app) => {},
)
