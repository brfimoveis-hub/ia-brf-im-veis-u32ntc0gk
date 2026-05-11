routerAdd('POST', '/backend/v1/uazapi/webhook', (e) => {
  const body = e.requestInfo().body || {}

  if (body.event === 'connection.update' || body.event === 'status.update') {
    const state = body.data?.state || body.state || 'unknown'
    const instance = body.instance || 'unknown'

    const logsCol = $app.findCollectionByNameOrId('system_logs')
    const log = new Record(logsCol)
    log.set('type', state === 'open' ? 'uazapi_success' : 'uazapi_error')
    log.set('message', `Instância ${instance}: Status atualizado para ${state}`)
    log.set('payload', body)
    $app.save(log)
  }

  return e.json(200, { received: true })
})
