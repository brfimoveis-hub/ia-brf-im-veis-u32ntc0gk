migrate(
  (app) => {
    let rec = null
    try {
      rec = app.findRecordById('system_logs', '62w00kc72ik9o1q')
    } catch (_) {}
    if (!rec) return

    const rawPayload = rec.getString('payload') || ''
    const logsCol = app.findCollectionByNameOrId('system_logs')

    const p0 = rawPayload.slice(0, 300)
    const p1 = rawPayload.slice(250, 550)
    const p2 = rawPayload.slice(500, 800)

    const log1 = new Record(logsCol, {
      type: 'probe_slice_exact2',
      message: 'Slice 0',
      details: p0,
    })
    app.save(log1)

    const log2 = new Record(logsCol, {
      type: 'probe_slice_exact2',
      message: 'Slice 1',
      details: p1,
    })
    app.save(log2)

    const log3 = new Record(logsCol, {
      type: 'probe_slice_exact2',
      message: 'Slice 2',
      details: p2,
    })
    app.save(log3)
  },
  (app) => {},
)
