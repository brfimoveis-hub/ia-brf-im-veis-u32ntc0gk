routerAdd('POST', '/backend/v1/uazapi/webhook', (e) => {
  const body = e.requestInfo().body || {}

  if (body.event === 'connection.update' || body.event === 'status.update') {
    const state = body.data?.state || body.state || 'unknown'
    const instance = body.instance || body.instanceName || 'unknown'

    const logsCol = $app.findCollectionByNameOrId('system_logs')
    const log = new Record(logsCol)
    log.set('type', state === 'open' ? 'uazapi_success' : 'uazapi_error')
    log.set('message', `Instância ${instance}: Status atualizado para ${state}`)
    log.set('payload', body)
    $app.save(log)

    try {
      const user = $app.findFirstRecordByData('users', 'uazapi_instance_number', instance)
      user.set('uazapi_status', state === 'open' ? 'online' : 'offline')
      if (state !== 'open') {
        user.set('uazapi_error', `Status update received: ${state}`)
      } else {
        user.set('uazapi_error', '')
      }
      $app.saveNoValidate(user)
    } catch (_) {}
  } else if (body.event === 'messages.upsert') {
    const instance = body.instance || body.instanceName || 'unknown'
    const logsCol = $app.findCollectionByNameOrId('system_logs')
    const log = new Record(logsCol)
    log.set('type', 'webhook')
    log.set('message', `Instância ${instance}: Nova mensagem recebida`)
    log.set('payload', body)
    $app.save(log)
  }

  return e.json(200, { received: true })
})
