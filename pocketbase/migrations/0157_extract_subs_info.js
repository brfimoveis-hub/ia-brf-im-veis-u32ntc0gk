// Migration 0157: Extrai subscribed_apps completo
migrate(
  (app) => {
    let rec = null
    try {
      rec = app.findFirstRecordByData('system_logs', 'id', 'zrn25dvejmc65o6')
    } catch (_) {
      return
    }

    const details = JSON.parse(rec.getString('details') || '{}')
    const initial = details.initial || {}
    const body = initial.body || {}
    const dataList = body.data || []

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const log = new Record(logsCol)
    log.set('type', 'whatsapp_subs_extracted')
    log.set(
      'message',
      'SUBSCRIBED_APPS: count=' + dataList.length + ' statusCode=' + initial.statusCode,
    )
    log.set('user_id', 'g5jto8bhulw01bz')
    log.set(
      'payload',
      JSON.stringify({
        statusCode: initial.statusCode,
        apps: dataList.map((a) => {
          const wb = a.whatsapp_business_api_data || {}
          return {
            id: wb.id || a.id,
            name: wb.name || a.name,
            link: wb.link || a.link,
          }
        }),
      }),
    )
    log.set('details', JSON.stringify(dataList))
    app.save(log)
  },
  (app) => {},
)
