routerAdd(
  'POST',
  '/backend/v1/meta-remarketing-sync',
  (e) => {
    const body = e.requestInfo().body || {}
    const payloads = body.payloads || []
    const eventName = body.eventName || 'Lead'
    const keyword = body.keyword || ''

    // Backward compatibility for older clients sending customerIds
    const customerIds = body.customerIds || []

    if (!payloads.length && !customerIds.length) {
      return e.json(200, {
        success: true,
        synced: 0,
        message: 'Nenhum cliente fornecido para sincronização.',
      })
    }

    const user = e.auth
    if (!user) return e.unauthorizedError('Not authenticated')

    const pixelId = (user.getString('meta_pixel_id') || '')
      .replace(/[\s\uFEFF\xA0\u200B-\u200D\u2028\u2029]+/g, '')
      .trim()
    const capiToken = (user.getString('meta_capi_token') || '')
      .replace(/^Bearer\s+/i, '')
      .replace(/[\s\uFEFF\xA0\u200B-\u200D\u2028\u2029]+/g, '')
      .replace(/^(EA)+/i, 'EA')
      .trim()
    const testCode = (user.getString('meta_test_event_code') || '').trim()
    const campaignPhone = (user.getString('meta_campaign_phone') || '').replace(/\D/g, '')

    if (!pixelId || !capiToken) {
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', user.id)
        logRecord.set('type', 'remarketing')
        logRecord.set('message', 'Falha na sincronização: credenciais do Meta ausentes.')
        logRecord.set(
          'details',
          'O ID do Pixel ou o Token da API de Conversões não estão configurados.',
        )
        logRecord.set('payload', { count: payloads.length || customerIds.length, eventName })
        $app.save(logRecord)
      } catch (logErr) {}
      return e.badRequestError(
        'O ID do Pixel ou o Token da API de Conversões não estão configurados corretamente. Vá para Configurações para preenchê-los.',
      )
    }

    if (!/^\d+$/.test(pixelId)) {
      return e.badRequestError(
        'O ID do Pixel é inválido. Ele deve conter apenas números sem espaços.',
      )
    }

    const finalEventName = eventName
    const data = []
    const currentTimestamp = Math.floor(Date.now() / 1000)

    let metaTagsList = user.get('meta_tags_list')
    if (!metaTagsList) metaTagsList = []
    if (typeof metaTagsList === 'string') {
      try {
        metaTagsList = JSON.parse(metaTagsList)
      } catch (err) {
        metaTagsList = []
      }
    }
    if (!Array.isArray(metaTagsList)) metaTagsList = []

    const allIds = payloads.length > 0 ? payloads.map((p) => p.id) : customerIds
    const validCustomers = new Set()

    for (const id of allIds) {
      try {
        const c = $app.findRecordById('customers', id)
        if (c.getString('user_id') === user.id) {
          validCustomers.add(id)
        }
      } catch (err) {}
    }

    if (validCustomers.size === 0) {
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', user.id)
        logRecord.set('type', 'remarketing')
        logRecord.set('message', 'Sincronização ignorada: nenhum cliente válido.')
        logRecord.set(
          'details',
          'O usuário tentou sincronizar, mas não possui clientes cadastrados.',
        )
        logRecord.set('payload', { count: payloads.length || customerIds.length, eventName })
        $app.save(logRecord)
      } catch (logErr) {}
      return e.json(200, {
        success: true,
        synced: 0,
        message: 'Nenhum cliente válido encontrado para o usuário logado.',
      })
    }

    if (payloads.length > 0) {
      for (const p of payloads) {
        if (!validCustomers.has(p.id)) continue

        const userData = {}
        if (p.em) {
          const emStr = String(p.em).trim().toLowerCase()
          userData.em = [emStr.length === 64 ? emStr : $security.sha256(emStr)]
        }
        if (p.ph) {
          const phStr = String(p.ph).replace(/[^0-9]/g, '')
          userData.ph = [phStr.length === 64 ? phStr : $security.sha256(phStr)]
        }

        if (userData.em || userData.ph) {
          let cTags = p.tags || []
          const validTags = cTags.filter((t) => metaTagsList.includes(t))
          const finalKeyword = validTags.length > 0 ? validTags.join(', ') : keyword

          data.push({
            event_name: finalEventName,
            event_time: currentTimestamp,
            action_source: 'other',
            user_data: userData,
            custom_data: {
              currency: 'BRL',
              value: 0,
              search_keyword: finalKeyword,
              campaign_phone: campaignPhone ? $security.sha256(campaignPhone) : undefined,
            },
          })
        }
      }
    } else {
      for (const id of customerIds) {
        if (!validCustomers.has(id)) continue
        const c = $app.findRecordById('customers', id)
        let email = c.getString('email_1_value') || c.getString('email') || ''
        let phone = c.getString('phone_1_value') || c.getString('phone') || ''

        email = email.trim().toLowerCase()
        phone = phone.replace(/[^0-9]/g, '')

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
          } catch (err) {
            cTags = []
          }
        }
        if (!Array.isArray(cTags)) cTags = []

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
              campaign_phone: campaignPhone ? $security.sha256(campaignPhone) : undefined,
            },
          })
        }
      }
    }

    if (!data.length) {
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', user.id)
        logRecord.set('type', 'remarketing')
        logRecord.set('message', 'Sincronização ignorada: nenhum contato com dados válidos.')
        logRecord.set('details', 'Os clientes selecionados não possuem email ou telefone válido.')
        logRecord.set('payload', { count: payloads.length || customerIds.length, eventName })
        $app.save(logRecord)
      } catch (logErr) {}
      return e.json(200, {
        success: true,
        synced: 0,
        message: 'Nenhum cliente possui email ou telefone válido para ser enviado ao Meta.',
      })
    }

    const batchSize = Math.max(1, body.batchSize || 1000)
    const intervalMinutes = Math.max(0, body.intervalMinutes || 0)
    const intervalMs = intervalMinutes * 60 * 1000

    const batches = []
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize))
    }

    let totalSynced = 0
    let lastError = null

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]

      // Anti-ban throttling in the backend
      if (i > 0 && intervalMs > 0) {
        const start = Date.now()
        while (Date.now() - start < intervalMs) {
          // busy wait to simulate sleep since there is no setTimeout in goja
        }
      }

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
          logRecord.set('type', 'remarketing')
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
      if (lastError && lastError.error) {
        const metaErrorMsg = (
          lastError.error.error_user_msg ||
          lastError.error.message ||
          ''
        ).toLowerCase()
        if (
          metaErrorMsg.includes('oauth') ||
          metaErrorMsg.includes('access token') ||
          metaErrorMsg.includes('token') ||
          metaErrorMsg.includes('auth') ||
          metaErrorMsg.includes('invalid')
        ) {
          errMsg = `Erro de autenticação com o Meta. Meta retornou: ${lastError.error.message}. Dica: Certifique-se de que o token CAPI é válido e tem permissão de acesso ao pixel. Verifique espaços em branco no seu token e tente novamente.`
        } else {
          errMsg = `Erro do Meta: ${lastError.error.error_user_msg || lastError.error.message}`
        }
      } else if (typeof lastError === 'string') {
        errMsg = `Erro de comunicação: ${lastError}`
      } else if (typeof lastError === 'object') {
        errMsg = `Erro estrutural: ${JSON.stringify(lastError)}`
      }

      return e.json(400, { message: errMsg, error: lastError })
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
          count: payloads.length || customerIds.length,
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
