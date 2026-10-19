migrate(
  (app) => {
    let rec = null
    try {
      rec = app.findRecordById('system_logs', '5x34n6nnhwfp0ml')
    } catch (_) {}
    if (!rec) return

    const rawPayload = rec.getString('payload') || ''
    const logsCol = app.findCollectionByNameOrId('system_logs')

    // Quebra a string em pedaços de 400 caracteres para vermos tudo
    const chunkSize = 400
    for (let i = 0; i < rawPayload.length; i += chunkSize) {
      const slice = rawPayload.slice(i, i + chunkSize)
      const chunkLog = new Record(logsCol, {
        type: 'probe_chunk_' + Math.floor(i / chunkSize),
        message: 'Chunk ' + Math.floor(i / chunkSize),
        details: slice,
      })
      app.save(chunkLog)
    }
  },
  (app) => {},
)
