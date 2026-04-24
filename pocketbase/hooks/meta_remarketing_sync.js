routerAdd(
  'POST',
  '/backend/v1/meta-remarketing-sync',
  (e) => {
    const body = e.requestInfo().body || {}
    const customerIds = body.customerIds || []
    const eventName = body.eventName || 'Lead'
    const keyword = body.keyword || ''

    if (!customerIds.length) return e.badRequestError('No customers provided')

    const user = e.auth
    if (!user) return e.unauthorizedError('Not authenticated')

    const pixelId = user.getString('meta_pixel_id')
    const capiToken = user.getString('meta_capi_token')
    const testCode = user.getString('meta_test_event_code')

    if (!pixelId || !capiToken) {
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', user.id)
        logRecord.set('type', 'REMARKETING_SYNC')
        logRecord.set('message', 'Falha na sincronização: credenciais do Meta ausentes.')
        logRecord.set(
          'details',
          'O ID do Pixel ou o Token da API de Conversões não estão configurados.',
        )
        logRecord.set('payload', { customerIds, eventName })
        $app.save(logRecord)
      } catch (logErr) {}
      return e.badRequestError(
        'Erro de sincronização - o ID do Pixel ou o Token da API de Conversões não estão configurados. Vá para Configurações para preenchê-los.',
      )
    }

    const finalEventName = eventName
    const customers = []

    for (const id of customerIds) {
      try {
        const c = $app.findRecordById('customers', id)
        if (c.getString('user_id') === user.id) {
          customers.push(c)
        }
      } catch (err) {}
    }

    if (!customers.length) {
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', user.id)
        logRecord.set('type', 'REMARKETING_SYNC')
        logRecord.set('message', 'Falha na sincronização: clientes não encontrados.')
        logRecord.set('details', 'Nenhum dos clientes fornecidos pertence a este usuário.')
        logRecord.set('payload', { customerIds, eventName })
        $app.save(logRecord)
      } catch (logErr) {}
      return e.badRequestError('Nenhum cliente válido encontrado')
    }

    const data = []
    const currentTimestamp = Math.floor(Date.now() / 1000)

    for (const c of customers) {
      let email = c.getString('email_1_value') || c.getString('email') || ''
      let phone = c.getString('phone_1_value') || c.getString('phone') || ''

      email = email.trim().toLowerCase()
      phone = phone.replace(/[^0-9]/g, '')

      const userData = {}
      if (email) userData.em = [$security.sha256(email)]
      if (phone) userData.ph = [$security.sha256(phone)]

      if (userData.em || userData.ph) {
        data.push({
          event_name: finalEventName,
          event_time: currentTimestamp,
          action_source: 'system_generated',
          user_data: userData,
          custom_data: {
            currency: 'BRL',
            value: 0,
            search_keyword: keyword,
          },
        })
      }
    }

    if (!data.length) {
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', user.id)
        logRecord.set('type', 'REMARKETING_SYNC')
        logRecord.set('message', 'Falha na sincronização: nenhum contato com dados válidos.')
        logRecord.set('details', 'Os clientes selecionados não possuem email ou telefone.')
        logRecord.set('payload', { customerIds, eventName })
        $app.save(logRecord)
      } catch (logErr) {}
      return e.badRequestError('Nenhum cliente com email ou telefone válido para enviar ao Meta.')
    }

    const batches = []
    for (let i = 0; i < data.length; i += 1000) {
      batches.push(data.slice(i, i + 1000))
    }

    let totalSynced = 0
    let lastError = null

    for (const batch of batches) {
      const payload = { data: batch }
      if (testCode) payload.test_event_code = testCode

      const res = $http.send({
        url: `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${capiToken}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeout: 15,
      })

      if (res.statusCode === 200) {
        totalSynced += batch.length
      } else {
        lastError = res.json || res.raw || 'Unknown error'
        $app
          .logger()
          .error('Meta CAPI Batch Error', 'status', res.statusCode, 'response', lastError)
      }
    }

    if (totalSynced === 0 && lastError) {
      $app.logger().error('Meta CAPI Complete Failure', 'error', JSON.stringify(lastError))
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', user.id)
        logRecord.set('type', 'REMARKETING_SYNC')
        logRecord.set('message', 'Falha ao enviar eventos para o Meta.')
        logRecord.set('details', JSON.stringify(lastError))
        logRecord.set('payload', { customerIds, eventName })
        $app.save(logRecord)
      } catch (logErr) {}
      return e.internalServerError('Falha ao enviar eventos para o Meta.')
    }

    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logsCol)
      logRecord.set('user_id', user.id)
      logRecord.set('type', 'REMARKETING_SYNC')
      logRecord.set('message', `Sincronizou ${totalSynced} leads para o Meta CAPI.`)
      logRecord.set('details', `Palavra-chave: ${keyword}, Evento: ${finalEventName}`)
      logRecord.set('payload', { customerIds, successCount: totalSynced })
      $app.save(logRecord)
    } catch (logErr) {
      $app.logger().error('Failed to write system_logs', 'error', String(logErr))
    }

    return e.json(200, { success: true, synced: totalSynced })
  },
  $apis.requireAuth(),
)
