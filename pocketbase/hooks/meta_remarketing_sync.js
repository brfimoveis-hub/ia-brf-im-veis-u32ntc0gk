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

    const pixelId = (user.getString('meta_pixel_id') || '').trim()
    const capiToken = (user.getString('meta_capi_token') || '').replace(/^Bearer\s+/i, '').trim()
    const testCode = (user.getString('meta_test_event_code') || '').trim()

    if (!pixelId || !capiToken) {
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', user.id)
        logRecord.set('type', 'error')
        logRecord.set('message', 'Falha na sincronização: credenciais do Meta ausentes.')
        logRecord.set(
          'details',
          'O ID do Pixel ou o Token da API de Conversões não estão configurados.',
        )
        logRecord.set('payload', { customerIds, eventName })
        $app.save(logRecord)
      } catch (logErr) {}
      return e.badRequestError(
        'O ID do Pixel ou o Token da API de Conversões não estão configurados. Vá para Configurações para preenchê-los.',
      )
    }

    if (!/^\d+$/.test(pixelId)) {
      return e.badRequestError('O ID do Pixel é inválido. Ele deve conter apenas números.')
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

    let metaTagsList = user.get('meta_tags_list')
    if (!metaTagsList) metaTagsList = []
    if (typeof metaTagsList === 'string') {
      try {
        metaTagsList = JSON.parse(metaTagsList)
      } catch (e) {
        metaTagsList = []
      }
    }
    if (!Array.isArray(metaTagsList)) metaTagsList = []

    if (!customers.length) {
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', user.id)
        logRecord.set('type', 'error')
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

      // Normalize Brazilian phone numbers to include country code for Meta CAPI
      if (phone.length === 10 || phone.length === 11) {
        phone = '55' + phone
      }

      const userData = {}
      if (email) userData.em = [$security.sha256(email)]
      if (phone) userData.ph = [$security.sha256(phone)]

      let cTags = c.get('tags')
      if (!cTags) cTags = []
      if (typeof cTags === 'string') {
        try {
          cTags = JSON.parse(cTags)
        } catch (e) {
          cTags = []
        }
      }
      if (!Array.isArray(cTags)) cTags = []

      // verify if the tags associated with the filtered leads are included in the user's meta_tags_list configuration.
      const validTags = cTags.filter((t) => metaTagsList.includes(t))
      const finalKeyword = validTags.length > 0 ? validTags.join(', ') : keyword

      if (userData.em || userData.ph) {
        data.push({
          event_name: finalEventName,
          event_time: currentTimestamp,
          action_source: 'other',
          user_data: userData,
          custom_data: {
            currency: 'BRL',
            value: 0,
            search_keyword: finalKeyword,
          },
        })
      }
    }

    if (!data.length) {
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', user.id)
        logRecord.set('type', 'error')
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

      let retries = 3
      let res
      let success = false

      while (retries > 0) {
        res = $http.send({
          url: `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${capiToken}`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          timeout: 15,
        })

        if (res.statusCode === 200) {
          success = true
          break
        } else if (res.statusCode === 0 || res.statusCode >= 500) {
          retries--
          // brief block for retry
          const start = Date.now()
          while (Date.now() - start < 500) {}
        } else {
          break
        }
      }

      if (success) {
        totalSynced += batch.length
      } else {
        lastError = res.json || res.raw || 'Unknown error'
        $app
          .logger()
          .error('Meta CAPI Batch Error', 'status', res.statusCode, 'response', lastError)

        try {
          const logsCol = $app.findCollectionByNameOrId('system_logs')
          const logRecord = new Record(logsCol)
          logRecord.set('user_id', user.id)
          logRecord.set('type', 'error')
          logRecord.set('message', `Erro na API do Meta (Status ${res.statusCode})`)
          logRecord.set(
            'details',
            typeof lastError === 'object' ? JSON.stringify(lastError) : String(lastError),
          )
          logRecord.set('payload', {
            eventName,
            batchSize: batch.length,
            statusCode: res.statusCode,
            metaResponse: lastError,
          })
          $app.save(logRecord)
        } catch (logErr) {}
      }
    }

    if (totalSynced === 0 && lastError) {
      $app.logger().error('Meta CAPI Complete Failure', 'error', JSON.stringify(lastError))

      let errMsg = 'Falha ao enviar eventos para o Meta.'
      if (lastError && lastError.error && lastError.error.message) {
        const metaErrorMsg = lastError.error.message.toLowerCase()
        if (
          metaErrorMsg.includes('oauth') ||
          metaErrorMsg.includes('access token') ||
          metaErrorMsg.includes('token') ||
          metaErrorMsg.includes('auth')
        ) {
          errMsg =
            'Erro de autenticação com o Meta: Token de acesso inválido ou expirado. Verifique suas configurações.'
        } else {
          errMsg = `Erro do Meta: ${lastError.error.message}`
        }
      } else if (typeof lastError === 'string') {
        errMsg = `Erro: ${lastError}`
      }

      return e.badRequestError(errMsg)
    }

    if (totalSynced > 0) {
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', user.id)
        logRecord.set('type', 'remarketing')
        logRecord.set('message', `Sincronizou ${totalSynced} leads para o Meta CAPI.`)
        logRecord.set('details', `Palavra-chave: ${keyword}, Evento: ${finalEventName}`)
        logRecord.set('payload', {
          customerIds,
          successCount: totalSynced,
          metaResponse: 'Success',
        })
        $app.save(logRecord)
      } catch (logErr) {
        $app.logger().error('Failed to write system_logs', 'error', String(logErr))
      }
    }

    return e.json(200, { success: true, synced: totalSynced })
  },
  $apis.requireAuth(),
)
