migrate(
  (app) => {
    let rec = null
    try {
      rec = app.findRecordById('system_logs', 'tlrycuz92pzcri9')
    } catch (_) {}
    if (!rec) return

    const raw = rec.getString('details') || ''
    const logsCol = app.findCollectionByNameOrId('system_logs')

    const p0 = raw.slice(0, 300)
    const p1 = raw.slice(250, 550)
    const p2 = raw.slice(500, 800)

    const l1 = new Record(logsCol, { type: 'probe_slice_sum1', message: 'S1', details: p0 })
    app.save(l1)
    const l2 = new Record(logsCol, { type: 'probe_slice_sum2', message: 'S2', details: p1 })
    app.save(l2)
    const l3 = new Record(logsCol, { type: 'probe_slice_sum3', message: 'S3', details: p2 })
    app.save(l3)
  },
  (app) => {},
)
