migrate(
  (app) => {
    let rec = null
    try {
      rec = app.findRecordById('system_logs', '5x34n6nnhwfp0ml')
    } catch (_) {}
    if (!rec) return

    const rawPayload = rec.getString('payload') || ''
    const logsCol = app.findCollectionByNameOrId('system_logs')

    const p0 = rawPayload.slice(0, 300)
    const p1 = rawPayload.slice(250, 550)

    const log1 = new Record(logsCol, {
      type: 'probe_slice_focus',
      message: 'Focus 0',
      details: p0,
    })
    app.save(log1)

    const log2 = new Record(logsCol, {
      type: 'probe_slice_focus',
      message: 'Focus 1',
      details: p1,
    })
    app.save(log2)
  },
  (app) => {},
)
