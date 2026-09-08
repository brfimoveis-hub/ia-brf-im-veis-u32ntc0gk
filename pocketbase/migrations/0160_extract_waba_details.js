// Migration 0160: Extrai os dados completos de ambos os telefones
migrate(
  (app) => {
    let recOfficial = null
    let recDup = null
    try {
      recOfficial = app.findFirstRecordByData('system_logs', 'id', '266u1i9765sy8zd')
      recDup = app.findFirstRecordByData('system_logs', 'id', '9vpx7tx4vgo85br')
    } catch (_) {
      return
    }

    const officialPayload = recOfficial.getString('payload')
    const dupPayload = recDup.getString('payload')

    const logsCol = app.findCollectionByNameOrId('system_logs')

    const log1 = new Record(logsCol)
    log1.set('type', 'waba_details_official')
    log1.set('message', 'Official payload details')
    log1.set('user_id', 'g5jto8bhulw01bz')
    log1.set('details', officialPayload)
    app.save(log1)

    const log2 = new Record(logsCol)
    log2.set('type', 'waba_details_duplicate')
    log2.set('message', 'Duplicate payload details')
    log2.set('user_id', 'g5jto8bhulw01bz')
    log2.set('details', dupPayload)
    app.save(log2)
  },
  (app) => {},
)
