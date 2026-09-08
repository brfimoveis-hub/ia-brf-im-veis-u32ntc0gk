// Migration 0156: Extrai phone_info completo
migrate(
  (app) => {
    let rec = null
    try {
      rec = app.findFirstRecordByData('system_logs', 'id', 's2vamva51oqy7hd')
    } catch (_) {
      return
    }

    const details = JSON.parse(rec.getString('details') || '{}')
    const body = details.body || {}

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const log = new Record(logsCol)
    log.set('type', 'whatsapp_phone_extracted')
    log.set(
      'message',
      'PHONE: status=' +
        body.status +
        ' code_verification=' +
        body.code_verification_status +
        ' quality=' +
        body.quality_rating +
        ' account_mode=' +
        body.account_mode,
    )
    log.set('user_id', 'g5jto8bhulw01bz')
    log.set(
      'payload',
      JSON.stringify({
        id: body.id,
        display_phone_number: body.display_phone_number,
        verified_name: body.verified_name,
        code_verification_status: body.code_verification_status,
        status: body.status,
        quality_rating: body.quality_rating,
        account_mode: body.account_mode,
      }),
    )
    log.set('details', JSON.stringify(body))
    app.save(log)
  },
  (app) => {},
)
