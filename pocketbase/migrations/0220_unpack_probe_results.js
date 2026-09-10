migrate(
  (app) => {
    let log = null
    try {
      log = app.findFirstRecordByData('system_logs', 'id', 'zwskjyil0oy0jwf')
    } catch (_) {
      return
    }
    if (!log) return

    const fullDetails = JSON.parse(log.getString('details') || '{}')
    const waResult = fullDetails.waTest ? fullDetails.waTest.result : {}
    const capiResult = fullDetails.capiTest ? fullDetails.capiTest.result : {}

    const logsCol = app.findCollectionByNameOrId('system_logs')

    const rec1 = new Record(logsCol)
    rec1.set('user_id', log.getString('user_id'))
    rec1.set('type', 'api_integration')
    rec1.set('message', 'Probe Results WA Token')
    rec1.set(
      'details',
      JSON.stringify({
        me: waResult.me,
        accounts: waResult.accounts,
        ig: waResult.ig,
      }),
    )
    rec1.set('payload', JSON.stringify({ probe_part: 'wa' }))
    app.saveNoValidate(rec1)

    const rec2 = new Record(logsCol)
    rec2.set('user_id', log.getString('user_id'))
    rec2.set('type', 'api_integration')
    rec2.set('message', 'Probe Results CAPI Token')
    rec2.set(
      'details',
      JSON.stringify({
        me: capiResult.me,
        accounts: capiResult.accounts,
        ig: capiResult.ig,
      }),
    )
    rec2.set('payload', JSON.stringify({ probe_part: 'capi' }))
    app.saveNoValidate(rec2)
  },
  (app) => {},
)
