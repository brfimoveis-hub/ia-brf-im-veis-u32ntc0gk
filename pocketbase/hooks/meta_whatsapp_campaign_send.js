// 1. ROTA DE ENVIO / CRIAÇÃO DE CAMPANHA (com suporte a lotes sequenciados)
routerAdd(
  'POST',
  '/backend/v1/remarketing-campaigns/send',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Autenticação necessária')

    const body = e.requestInfo().body || {}
    const campaignName = (body.name || '').trim() || 'Campanha Remarketing WhatsApp'
    const segment = (body.segment || '').trim()
    const messageTemplate = (body.message || '').trim()
    const templateName = (body.template_name || '').trim()
    const templateLanguage = (body.template_language || 'pt_BR').trim()
    const customerIds = body.customer_ids || []
    const syncMetaCapi = Boolean(body.sync_meta_capi)

    // Configurações de lote / cadência
    const batchSize = Math.max(1, Math.min(200, parseInt(body.batch_size, 10) || 50))
    const batchIntervalMinutes = Math.max(
      0,
      Math.min(120, parseInt(body.batch_interval_minutes, 10) || 5),
    )

    if (!messageTemplate && !templateName) {
      return e.badRequestError('Mensagem ou nome do modelo (template) é obrigatório')
    }

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return e.badRequestError('Selecione pelo menos um cliente para a campanha')
    }

    if (customerIds.length > 2000) {
      return e.badRequestError('Limite máximo de 2000 clientes por campanha')
    }

    const phoneNumberId = user.getString('meta_whatsapp_phone_number_id')
    const accessToken = user.getString('meta_whatsapp_access_token')

    if (!phoneNumberId || !accessToken) {
      return e.badRequestError(
        'Credenciais do WhatsApp Cloud API não configuradas no seu perfil (Phone Number ID ou Access Token ausentes)',
      )
    }

    const campaignsCol = $app.findCollectionByNameOrId('remarketing_campaigns')
    const recipientsCol = $app.findCollectionByNameOrId('remarketing_recipients')
    const convCol = $app.findCollectionByNameOrId('conversations')

    const totalBatches = Math.ceil(customerIds.length / batchSize)

    const campaign = new Record(campaignsCol)
    campaign.set('user_id', user.id)
    campaign.set('name', campaignName)
    campaign.set('segment', segment)
    campaign.set('message_text', messageTemplate || '(Template: ' + templateName + ')')
    campaign.set('template_name', templateName)
    campaign.set('template_language', templateLanguage)
    campaign.set('status', 'sending')
    campaign.set('total_recipients', customerIds.length)
    campaign.set('sent_count', 0)
    campaign.set('delivered_count', 0)
    campaign.set('failed_count', 0)
    campaign.set('requires_template_count', 0)
    campaign.set('sync_meta_capi', syncMetaCapi)
    campaign.set('capi_synced_count', 0)
    campaign.set('batch_size', batchSize)
    campaign.set('batch_interval_minutes', batchIntervalMinutes)
    campaign.set('current_batch', 0)
    campaign.set('total_batches', totalBatches)
    campaign.set('last_error', '')
    $app.save(campaign)

    // Criar todos os destinatários com status 'queued'
    for (let i = 0; i < customerIds.length; i++) {
      const cId = customerIds[i]
      let cust = null
      try {
        cust = $app.findRecordById('customers', cId)
      } catch (_) {}

      const custName = cust
        ? cust.getString('name') || cust.getString('first_name') || 'Cliente'
        : 'Cliente'
      let rawPhone = cust ? cust.getString('phone') || cust.getString('phone_1_value') || '' : ''

      const recipient = new Record(recipientsCol)
      recipient.set('campaign_id', campaign.id)
      if (cust) recipient.set('customer_id', cust.id)
      recipient.set('phone', rawPhone)
      recipient.set('customer_name', custName)
      recipient.set('resolved_message', messageTemplate || '(Template: ' + templateName + ')')
      recipient.set('status', 'queued')
      $app.save(recipient)
    }

    // Processar o PRIMEIRO lote imediatamente
    const brokerName = user.getString('name') || 'BRF Imóveis'
    const nowMs = Date.now()
    const twentyFourHoursAgoMs = nowMs - 24 * 60 * 60 * 1000
    const twentyFourHoursAgoIso = new Date(twentyFourHoursAgoMs)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19)

    const pendingRecipients = $app.findRecordsByFilter(
      'remarketing_recipients',
      "campaign_id = '" + campaign.id + "' && status = 'queued'",
      'created',
      batchSize,
      0,
    )

    let batchSent = 0
    let batchFailed = 0
    let batchRequiresTemplate = 0
    const results = []
    const customersForCapi = []

    for (let i = 0; i < pendingRecipients.length; i++) {
      const recipient = pendingRecipients[i]
      const customerId = recipient.getString('customer_id')
      let customer = null

      if (customerId) {
        try {
          customer = $app.findRecordById('customers', customerId)
        } catch (_) {}
      }

      const custName =
        recipient.getString('customer_name') || (customer ? customer.getString('name') : 'Cliente')
      const firstName = customer
        ? customer.getString('first_name') || custName.split(' ')[0]
        : custName.split(' ')[0]
      const imovelInteresse = customer
        ? customer.getString('notes') ||
          customer.getString('neighborhood') ||
          customer.getString('price_range') ||
          'imóvel de seu interesse'
        : 'imóvel de seu interesse'

      let personalizedMessage = messageTemplate
      personalizedMessage = personalizedMessage.replace(/\{\{nome\}\}/gi, custName)
      personalizedMessage = personalizedMessage.replace(/\{\{primeiro_nome\}\}/gi, firstName)
      personalizedMessage = personalizedMessage.replace(/\{\{first_name\}\}/gi, firstName)
      personalizedMessage = personalizedMessage.replace(/\{\{name\}\}/gi, custName)
      personalizedMessage = personalizedMessage.replace(
        /\{\{imovel_interesse\}\}/gi,
        imovelInteresse,
      )
      personalizedMessage = personalizedMessage.replace(/\{\{corretor\}\}/gi, brokerName)
      personalizedMessage = personalizedMessage.replace(/\{\{1\}\}/g, firstName)
      personalizedMessage = personalizedMessage.replace(/\{\{2\}\}/g, imovelInteresse)
      personalizedMessage = personalizedMessage.replace(/\{\{3\}\}/g, brokerName)

      recipient.set('resolved_message', personalizedMessage || '(Template: ' + templateName + ')')

      let cleanPhone = (recipient.getString('phone') || '').replace(/\D/g, '')
      if (cleanPhone.length === 10 || cleanPhone.length === 11) {
        cleanPhone = '55' + cleanPhone
      }

      if (!cleanPhone || cleanPhone.length < 10) {
        recipient.set('status', 'failed')
        recipient.set('error_message', 'Telefone inválido ou não informado')
        $app.save(recipient)
        batchFailed++
        results.push({
          id: recipient.id,
          customer_id: customerId,
          phone: recipient.getString('phone'),
          customer_name: custName,
          status: 'failed',
          error: 'Telefone inválido',
        })
        continue
      }

      let in24hWindow = false
      if (customerId) {
        try {
          const recentConvs = $app.findRecordsByFilter(
            'conversations',
            "customer_id = '" +
              customerId +
              "' && sender = 'customer' && created >= '" +
              twentyFourHoursAgoIso +
              "'",
            '-created',
            1,
            0,
          )
          if (recentConvs && recentConvs.length > 0) {
            in24hWindow = true
          }
        } catch (_) {}
      }
      recipient.set('in_24h_window', in24hWindow)

      if (!in24hWindow && !templateName) {
        const reason = 'Contato fora da janela de 24h (Meta exige mensagem via template cadastrado)'
        recipient.set('status', 'requires_template')
        recipient.set('error_message', reason)
        $app.save(recipient)
        batchRequiresTemplate++
        results.push({
          id: recipient.id,
          customer_id: customerId,
          phone: cleanPhone,
          customer_name: custName,
          status: 'requires_template',
          error: reason,
        })
        continue
      }

      let payloadBody = {}
      if (templateName) {
        const templateParameters = [{ type: 'text', text: firstName || custName }]
        if (messageTemplate.includes('{{2}}') || personalizedMessage.includes(imovelInteresse)) {
          templateParameters.push({ type: 'text', text: imovelInteresse })
        }
        if (messageTemplate.includes('{{3}}') || personalizedMessage.includes(brokerName)) {
          templateParameters.push({ type: 'text', text: brokerName })
        }

        payloadBody = {
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: templateLanguage || 'pt_BR' },
            components: [
              {
                type: 'body',
                parameters: templateParameters,
              },
            ],
          },
        }
      } else {
        payloadBody = {
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: personalizedMessage,
          },
        }
      }

      try {
        const res = $http.send({
          url: 'https://graph.facebook.com/v21.0/' + phoneNumberId + '/messages',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + accessToken,
          },
          body: JSON.stringify(payloadBody),
          timeout: 30,
        })

        let resData = null
        try {
          resData = res.json
        } catch (_) {}

        if (res.statusCode >= 200 && res.statusCode < 300) {
          const wamid =
            resData && resData.messages && resData.messages[0] ? resData.messages[0].id : ''
          recipient.set('status', 'sent')
          recipient.set('whatsapp_message_id', wamid)
          recipient.set('error_message', '')
          recipient.set('sent_at', new Date().toISOString().replace('T', ' ').slice(0, 19))
          $app.save(recipient)

          batchSent++
          results.push({
            id: recipient.id,
            customer_id: customerId,
            phone: cleanPhone,
            customer_name: custName,
            status: 'sent',
            wamid: wamid,
          })

          if (customer) {
            customersForCapi.push(customer)
          }

          if (customerId) {
            try {
              const conv = new Record(convCol)
              conv.set('customer_id', customerId)
              conv.set('user_id', user.id)
              conv.set('channel', 'whatsapp')
              conv.set('sender', 'ai')
              conv.set(
                'content',
                '📢 [Remarketing WhatsApp - ' +
                  campaignName +
                  ']:\n' +
                  (personalizedMessage || '(Template: ' + templateName + ')'),
              )
              $app.save(conv)
            } catch (_) {}

            if (customer) {
              try {
                customer.set('last_sent_at', new Date().toISOString().slice(0, 10))
                $app.saveNoValidate(customer)
              } catch (_) {}
            }
          }
        } else {
          let errMsg = 'Erro na API do Meta (Status ' + res.statusCode + ')'
          if (resData && resData.error && resData.error.message) {
            errMsg = resData.error.message
            if (
              resData.error.code === 131047 ||
              errMsg.includes('24 hour') ||
              errMsg.includes('outside the allowed window')
            ) {
              errMsg = 'Janela de 24h expirada: Meta exige mensagem modelo (template)'
              recipient.set('status', 'requires_template')
            } else if (resData.error.code === 132001 || errMsg.includes('does not exist')) {
              errMsg = 'Modelo não encontrado ou ainda não aprovado na Meta: ' + templateName
              recipient.set('status', 'failed')
            } else {
              recipient.set('status', 'failed')
            }
          } else {
            recipient.set('status', 'failed')
          }

          recipient.set('error_message', errMsg)
          $app.save(recipient)

          if (recipient.getString('status') === 'requires_template') {
            batchRequiresTemplate++
          } else {
            batchFailed++
          }

          results.push({
            id: recipient.id,
            customer_id: customerId,
            phone: cleanPhone,
            customer_name: custName,
            status: recipient.getString('status'),
            error: errMsg,
          })
        }
      } catch (sendErr) {
        const errText = String(sendErr && sendErr.message ? sendErr.message : sendErr)
        recipient.set('status', 'failed')
        recipient.set('error_message', 'Erro de conexão com Meta: ' + errText)
        $app.save(recipient)
        batchFailed++
        results.push({
          id: recipient.id,
          customer_id: customerId,
          phone: cleanPhone,
          customer_name: custName,
          status: 'failed',
          error: 'Falha de conexão com a Meta: ' + errText,
        })
      }

      // Intervalo anti-rajada dentro do lote
      if (i + 1 < pendingRecipients.length) {
        const sleepStart = Date.now()
        while (Date.now() - sleepStart < 80) {}
      }
    }

    // Sincronizar CAPI se selecionado
    let capiSyncedCount = 0
    if (syncMetaCapi && customersForCapi.length > 0) {
      const pixelId = user.getString('meta_pixel_id') || user.getString('meta_dataset_id')
      const capiToken = user.getString('meta_capi_token')

      if (pixelId && capiToken) {
        const capiPayloads = []
        for (let j = 0; j < customersForCapi.length; j++) {
          const cust = customersForCapi[j]
          let em = cust.getString('email') || cust.getString('email_1_value') || ''
          let ph = cust.getString('phone') || cust.getString('phone_1_value') || ''
          em = em.trim().toLowerCase()
          ph = ph.replace(/\D/g, '')
          if (ph.length === 10 || ph.length === 11) ph = '55' + ph

          const userData = {
            client_ip_address: '192.168.1.1',
            client_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SkipCloud/1.0',
          }
          if (em) userData.em = [$security.sha256(em)]
          if (ph) userData.ph = [$security.sha256(ph)]

          capiPayloads.push({
            event_name: 'Lead',
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'system',
            user_data: userData,
            custom_data: {
              campaign_name: campaignName,
              lead_name: cust.getString('name') || 'Cliente',
              lead_id: cust.id,
            },
          })
        }

        if (capiPayloads.length > 0) {
          try {
            const capiRes = $http.send({
              url: 'https://graph.facebook.com/v21.0/' + pixelId + '/events',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + capiToken,
              },
              body: JSON.stringify({ data: capiPayloads }),
              timeout: 30,
            })
            if (capiRes.statusCode >= 200 && capiRes.statusCode < 300) {
              capiSyncedCount = capiPayloads.length
            }
          } catch (capiErr) {
            $app.logger().error('CAPI Batch Sync Error', 'error', String(capiErr))
          }
        }
      }
    }

    // Atualizar registro da campanha
    campaign.set('sent_count', batchSent)
    campaign.set('failed_count', batchFailed)
    campaign.set('requires_template_count', batchRequiresTemplate)
    campaign.set('capi_synced_count', capiSyncedCount)
    campaign.set('current_batch', 1)

    const remainingCount = $app.countRecords(
      'remarketing_recipients',
      "campaign_id = '" + campaign.id + "' && status = 'queued'",
    )

    if (remainingCount === 0) {
      campaign.set('status', 'completed')
      campaign.set('next_batch_at', '')
    } else {
      campaign.set('status', 'sending')
      const nextMs = Date.now() + batchIntervalMinutes * 60 * 1000
      campaign.set('next_batch_at', new Date(nextMs).toISOString().replace('T', ' ').slice(0, 19))
    }
    $app.save(campaign)

    // Log no sistema
    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logsCol)
      logRecord.set('type', 'whatsapp_remarketing_batch')
      logRecord.set(
        'message',
        'Campanha "' +
          campaignName +
          '" (Lote 1/' +
          totalBatches +
          '): ' +
          batchSent +
          ' enviados, ' +
          batchRequiresTemplate +
          ' requer template, ' +
          batchFailed +
          ' falhas. Restantes: ' +
          remainingCount,
      )
      logRecord.set('payload', {
        campaign_id: campaign.id,
        batch_number: 1,
        total_batches: totalBatches,
        sent: batchSent,
        requires_template: batchRequiresTemplate,
        failed: batchFailed,
        remaining: remainingCount,
        next_batch_at: campaign.getString('next_batch_at'),
      })
      logRecord.set('user_id', user.id)
      $app.saveNoValidate(logRecord)
    } catch (_) {}

    return e.json(200, {
      success: true,
      campaign_id: campaign.id,
      campaign: {
        id: campaign.id,
        name: campaign.getString('name'),
        status: campaign.getString('status'),
        total_recipients: campaign.getInt('total_recipients'),
        sent_count: campaign.getInt('sent_count'),
        failed_count: campaign.getInt('failed_count'),
        requires_template_count: campaign.getInt('requires_template_count'),
        batch_size: campaign.getInt('batch_size'),
        batch_interval_minutes: campaign.getInt('batch_interval_minutes'),
        current_batch: campaign.getInt('current_batch'),
        total_batches: campaign.getInt('total_batches'),
        next_batch_at: campaign.getString('next_batch_at'),
      },
      batch: {
        batch_number: 1,
        total_batches: totalBatches,
        processed: pendingRecipients.length,
        sent: batchSent,
        requires_template: batchRequiresTemplate,
        failed: batchFailed,
        remaining: remainingCount,
        next_batch_at: campaign.getString('next_batch_at'),
        is_finished: remainingCount === 0,
        results: results,
      },
    })
  },
  $apis.requireAuth(),
)

// 2. ROTA PARA DISPARAR PRÓXIMO LOTE IMEDIATAMENTE (Passo a passo manual ou acionado pela UI)
routerAdd(
  'POST',
  '/backend/v1/remarketing-campaigns/{id}/next-batch',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Autenticação necessária')

    const campaignId = e.request.pathValue('id')
    let campaign = null
    try {
      campaign = $app.findRecordById('remarketing_campaigns', campaignId)
    } catch (_) {
      return e.notFoundError('Campanha não encontrada')
    }

    if (campaign.getString('user_id') !== user.id) {
      return e.forbiddenError('Acesso negado a esta campanha')
    }

    const currentStatus = campaign.getString('status')
    if (currentStatus === 'completed' || currentStatus === 'stopped') {
      return e.json(200, {
        success: true,
        message: 'Campanha já finalizada (' + currentStatus + ')',
        status: currentStatus,
        is_finished: true,
      })
    }

    const phoneNumberId = user.getString('meta_whatsapp_phone_number_id')
    const accessToken = user.getString('meta_whatsapp_access_token')
    if (!phoneNumberId || !accessToken) {
      return e.badRequestError('Credenciais do WhatsApp Cloud API não configuradas no seu perfil')
    }

    const templateName = campaign.getString('template_name')
    const templateLanguage = campaign.getString('template_language') || 'pt_BR'
    const messageTemplate = campaign.getString('message_text') || ''
    const campaignName = campaign.getString('name') || 'Campanha Remarketing WhatsApp'
    const brokerName = user.getString('name') || 'BRF Imóveis'

    const limit = campaign.getInt('batch_size') || 50
    const pendingRecipients = $app.findRecordsByFilter(
      'remarketing_recipients',
      "campaign_id = '" + campaign.id + "' && status = 'queued'",
      'created',
      limit,
      0,
    )

    if (!pendingRecipients || pendingRecipients.length === 0) {
      campaign.set('status', 'completed')
      campaign.set('next_batch_at', '')
      $app.save(campaign)
      return e.json(200, {
        success: true,
        campaign_id: campaign.id,
        is_finished: true,
        remaining: 0,
        message: 'Todos os destinatários já foram processados.',
      })
    }

    const convCol = $app.findCollectionByNameOrId('conversations')
    const nowMs = Date.now()
    const twentyFourHoursAgoMs = nowMs - 24 * 60 * 60 * 1000
    const twentyFourHoursAgoIso = new Date(twentyFourHoursAgoMs)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19)

    let batchSent = 0
    let batchFailed = 0
    let batchRequiresTemplate = 0
    const results = []
    const customersForCapi = []

    for (let i = 0; i < pendingRecipients.length; i++) {
      const recipient = pendingRecipients[i]
      const customerId = recipient.getString('customer_id')
      let customer = null

      if (customerId) {
        try {
          customer = $app.findRecordById('customers', customerId)
        } catch (_) {}
      }

      const custName =
        recipient.getString('customer_name') || (customer ? customer.getString('name') : 'Cliente')
      const firstName = customer
        ? customer.getString('first_name') || custName.split(' ')[0]
        : custName.split(' ')[0]
      const imovelInteresse = customer
        ? customer.getString('notes') ||
          customer.getString('neighborhood') ||
          customer.getString('price_range') ||
          'imóvel de seu interesse'
        : 'imóvel de seu interesse'

      let personalizedMessage = messageTemplate
      personalizedMessage = personalizedMessage.replace(/\{\{nome\}\}/gi, custName)
      personalizedMessage = personalizedMessage.replace(/\{\{primeiro_nome\}\}/gi, firstName)
      personalizedMessage = personalizedMessage.replace(/\{\{first_name\}\}/gi, firstName)
      personalizedMessage = personalizedMessage.replace(/\{\{name\}\}/gi, custName)
      personalizedMessage = personalizedMessage.replace(
        /\{\{imovel_interesse\}\}/gi,
        imovelInteresse,
      )
      personalizedMessage = personalizedMessage.replace(/\{\{corretor\}\}/gi, brokerName)
      personalizedMessage = personalizedMessage.replace(/\{\{1\}\}/g, firstName)
      personalizedMessage = personalizedMessage.replace(/\{\{2\}\}/g, imovelInteresse)
      personalizedMessage = personalizedMessage.replace(/\{\{3\}\}/g, brokerName)

      recipient.set('resolved_message', personalizedMessage || '(Template: ' + templateName + ')')

      let cleanPhone = (recipient.getString('phone') || '').replace(/\D/g, '')
      if (cleanPhone.length === 10 || cleanPhone.length === 11) {
        cleanPhone = '55' + cleanPhone
      }

      if (!cleanPhone || cleanPhone.length < 10) {
        recipient.set('status', 'failed')
        recipient.set('error_message', 'Telefone inválido ou não informado')
        $app.save(recipient)
        batchFailed++
        results.push({
          id: recipient.id,
          customer_id: customerId,
          phone: recipient.getString('phone'),
          customer_name: custName,
          status: 'failed',
          error: 'Telefone inválido',
        })
        continue
      }

      let in24hWindow = false
      if (customerId) {
        try {
          const recentConvs = $app.findRecordsByFilter(
            'conversations',
            "customer_id = '" +
              customerId +
              "' && sender = 'customer' && created >= '" +
              twentyFourHoursAgoIso +
              "'",
            '-created',
            1,
            0,
          )
          if (recentConvs && recentConvs.length > 0) {
            in24hWindow = true
          }
        } catch (_) {}
      }
      recipient.set('in_24h_window', in24hWindow)

      if (!in24hWindow && !templateName) {
        const reason = 'Contato fora da janela de 24h (Meta exige mensagem via template cadastrado)'
        recipient.set('status', 'requires_template')
        recipient.set('error_message', reason)
        $app.save(recipient)
        batchRequiresTemplate++
        results.push({
          id: recipient.id,
          customer_id: customerId,
          phone: cleanPhone,
          customer_name: custName,
          status: 'requires_template',
          error: reason,
        })
        continue
      }

      let payloadBody = {}
      if (templateName) {
        const templateParameters = [{ type: 'text', text: firstName || custName }]
        if (messageTemplate.includes('{{2}}') || personalizedMessage.includes(imovelInteresse)) {
          templateParameters.push({ type: 'text', text: imovelInteresse })
        }
        if (messageTemplate.includes('{{3}}') || personalizedMessage.includes(brokerName)) {
          templateParameters.push({ type: 'text', text: brokerName })
        }

        payloadBody = {
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: templateLanguage || 'pt_BR' },
            components: [
              {
                type: 'body',
                parameters: templateParameters,
              },
            ],
          },
        }
      } else {
        payloadBody = {
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: personalizedMessage,
          },
        }
      }

      try {
        const res = $http.send({
          url: 'https://graph.facebook.com/v21.0/' + phoneNumberId + '/messages',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + accessToken,
          },
          body: JSON.stringify(payloadBody),
          timeout: 30,
        })

        let resData = null
        try {
          resData = res.json
        } catch (_) {}

        if (res.statusCode >= 200 && res.statusCode < 300) {
          const wamid =
            resData && resData.messages && resData.messages[0] ? resData.messages[0].id : ''
          recipient.set('status', 'sent')
          recipient.set('whatsapp_message_id', wamid)
          recipient.set('error_message', '')
          recipient.set('sent_at', new Date().toISOString().replace('T', ' ').slice(0, 19))
          $app.save(recipient)

          batchSent++
          results.push({
            id: recipient.id,
            customer_id: customerId,
            phone: cleanPhone,
            customer_name: custName,
            status: 'sent',
            wamid: wamid,
          })

          if (customer) {
            customersForCapi.push(customer)
          }

          if (customerId) {
            try {
              const conv = new Record(convCol)
              conv.set('customer_id', customerId)
              conv.set('user_id', user.id)
              conv.set('channel', 'whatsapp')
              conv.set('sender', 'ai')
              conv.set(
                'content',
                '📢 [Remarketing WhatsApp - ' +
                  campaignName +
                  ']:\n' +
                  (personalizedMessage || '(Template: ' + templateName + ')'),
              )
              $app.save(conv)
            } catch (_) {}

            if (customer) {
              try {
                customer.set('last_sent_at', new Date().toISOString().slice(0, 10))
                $app.saveNoValidate(customer)
              } catch (_) {}
            }
          }
        } else {
          let errMsg = 'Erro na API do Meta (Status ' + res.statusCode + ')'
          if (resData && resData.error && resData.error.message) {
            errMsg = resData.error.message
            if (
              resData.error.code === 131047 ||
              errMsg.includes('24 hour') ||
              errMsg.includes('outside the allowed window')
            ) {
              errMsg = 'Janela de 24h expirada: Meta exige mensagem modelo (template)'
              recipient.set('status', 'requires_template')
            } else if (resData.error.code === 132001 || errMsg.includes('does not exist')) {
              errMsg = 'Modelo não encontrado ou ainda não aprovado na Meta: ' + templateName
              recipient.set('status', 'failed')
            } else {
              recipient.set('status', 'failed')
            }
          } else {
            recipient.set('status', 'failed')
          }

          recipient.set('error_message', errMsg)
          $app.save(recipient)

          if (recipient.getString('status') === 'requires_template') {
            batchRequiresTemplate++
          } else {
            batchFailed++
          }

          results.push({
            id: recipient.id,
            customer_id: customerId,
            phone: cleanPhone,
            customer_name: custName,
            status: recipient.getString('status'),
            error: errMsg,
          })
        }
      } catch (sendErr) {
        const errText = String(sendErr && sendErr.message ? sendErr.message : sendErr)
        recipient.set('status', 'failed')
        recipient.set('error_message', 'Erro de conexão com Meta: ' + errText)
        $app.save(recipient)
        batchFailed++
        results.push({
          id: recipient.id,
          customer_id: customerId,
          phone: cleanPhone,
          customer_name: custName,
          status: 'failed',
          error: 'Falha de conexão com a Meta: ' + errText,
        })
      }

      // Intervalo anti-rajada
      if (i + 1 < pendingRecipients.length) {
        const sleepStart = Date.now()
        while (Date.now() - sleepStart < 80) {}
      }
    }

    const currentBatchNum = (campaign.getInt('current_batch') || 0) + 1
    const newSent = (campaign.getInt('sent_count') || 0) + batchSent
    const newFailed = (campaign.getInt('failed_count') || 0) + batchFailed
    const newRequiresTemplate =
      (campaign.getInt('requires_template_count') || 0) + batchRequiresTemplate

    campaign.set('sent_count', newSent)
    campaign.set('failed_count', newFailed)
    campaign.set('requires_template_count', newRequiresTemplate)
    campaign.set('current_batch', currentBatchNum)

    const remainingCount = $app.countRecords(
      'remarketing_recipients',
      "campaign_id = '" + campaign.id + "' && status = 'queued'",
    )

    const intervalMin = campaign.getInt('batch_interval_minutes') || 5

    if (remainingCount === 0) {
      campaign.set('status', 'completed')
      campaign.set('next_batch_at', '')
    } else {
      campaign.set('status', 'sending')
      const nextMs = Date.now() + intervalMin * 60 * 1000
      campaign.set('next_batch_at', new Date(nextMs).toISOString().replace('T', ' ').slice(0, 19))
    }
    $app.save(campaign)

    return e.json(200, {
      success: true,
      campaign_id: campaign.id,
      batch_result: {
        current_batch: currentBatchNum,
        total_batches: campaign.getInt('total_batches'),
        processed: pendingRecipients.length,
        remaining: remainingCount,
        sent: batchSent,
        failed: batchFailed,
        requires_template: batchRequiresTemplate,
        total_sent: newSent,
        total_failed: newFailed,
        total_requires_template: newRequiresTemplate,
        next_batch_at: campaign.getString('next_batch_at'),
        is_finished: remainingCount === 0,
        results: results,
      },
    })
  },
  $apis.requireAuth(),
)

// 3. ROTA PARA CONTROLAR STATUS DA CAMPANHA (pausar, retomar, parar)
routerAdd(
  'POST',
  '/backend/v1/remarketing-campaigns/{id}/status',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Autenticação necessária')

    const campaignId = e.request.pathValue('id')
    let campaign = null
    try {
      campaign = $app.findRecordById('remarketing_campaigns', campaignId)
    } catch (_) {
      return e.notFoundError('Campanha não encontrada')
    }

    if (campaign.getString('user_id') !== user.id) {
      return e.forbiddenError('Acesso negado a esta campanha')
    }

    const body = e.requestInfo().body || {}
    const newStatus = (body.status || '').trim() // 'paused' | 'sending' | 'stopped'

    if (!['paused', 'sending', 'stopped'].includes(newStatus)) {
      return e.badRequestError('Status inválido. Use "paused", "sending" ou "stopped"')
    }

    const oldStatus = campaign.getString('status')
    campaign.set('status', newStatus)

    if (newStatus === 'stopped') {
      campaign.set('next_batch_at', '')
      const pending = $app.findRecordsByFilter(
        'remarketing_recipients',
        "campaign_id = '" + campaign.id + "' && status = 'queued'",
        'created',
        1000,
        0,
      )
      for (let p = 0; p < pending.length; p++) {
        pending[p].set('status', 'failed')
        pending[p].set('error_message', 'Campanha cancelada pelo usuário')
        $app.save(pending[p])
      }
    } else if (newStatus === 'paused') {
      campaign.set('next_batch_at', '')
    } else if (newStatus === 'sending') {
      const nextMs = Date.now() + 10 * 1000 // 10s após retomar
      campaign.set('next_batch_at', new Date(nextMs).toISOString().replace('T', ' ').slice(0, 19))
    }

    $app.save(campaign)

    return e.json(200, {
      success: true,
      campaign_id: campaign.id,
      old_status: oldStatus,
      new_status: newStatus,
    })
  },
  $apis.requireAuth(),
)

// 4. CRON AGENDADOR: A cada 1 minuto, checa se há campanhas 'sending' cujo next_batch_at já passou
cronAdd('process_remarketing_batches_cron', '* * * * *', () => {
  const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19)

  let activeCampaigns = []
  try {
    activeCampaigns = $app.findRecordsByFilter(
      'remarketing_campaigns',
      "status = 'sending' && next_batch_at != '' && next_batch_at <= '" + nowIso + "'",
      'next_batch_at',
      5,
      0,
    )
  } catch (err) {
    $app.logger().error('Erro ao buscar campanhas para processamento cron', 'error', String(err))
    return
  }

  for (let c = 0; c < activeCampaigns.length; c++) {
    const campaign = activeCampaigns[c]
    try {
      // Limpar next_batch_at temporariamente
      campaign.set('next_batch_at', '')
      $app.save(campaign)

      const userId = campaign.getString('user_id')
      let user = null
      try {
        user = $app.findRecordById('users', userId)
      } catch (_) {}

      if (!user) continue

      const phoneNumberId = user.getString('meta_whatsapp_phone_number_id')
      const accessToken = user.getString('meta_whatsapp_access_token')
      if (!phoneNumberId || !accessToken) {
        campaign.set('status', 'failed')
        campaign.set('last_error', 'Credenciais Meta ausentes')
        $app.save(campaign)
        continue
      }

      const templateName = campaign.getString('template_name')
      const templateLanguage = campaign.getString('template_language') || 'pt_BR'
      const messageTemplate = campaign.getString('message_text') || ''
      const campaignName = campaign.getString('name') || 'Campanha Remarketing WhatsApp'
      const brokerName = user.getString('name') || 'BRF Imóveis'

      const limit = campaign.getInt('batch_size') || 50
      const pendingRecipients = $app.findRecordsByFilter(
        'remarketing_recipients',
        "campaign_id = '" + campaign.id + "' && status = 'queued'",
        'created',
        limit,
        0,
      )

      if (!pendingRecipients || pendingRecipients.length === 0) {
        campaign.set('status', 'completed')
        campaign.set('next_batch_at', '')
        $app.save(campaign)
        continue
      }

      const convCol = $app.findCollectionByNameOrId('conversations')
      const nowMs = Date.now()
      const twentyFourHoursAgoMs = nowMs - 24 * 60 * 60 * 1000
      const twentyFourHoursAgoIso = new Date(twentyFourHoursAgoMs)
        .toISOString()
        .replace('T', ' ')
        .slice(0, 19)

      let batchSent = 0
      let batchFailed = 0
      let batchRequiresTemplate = 0

      for (let i = 0; i < pendingRecipients.length; i++) {
        // Verificar se foi pausada
        try {
          const liveC = $app.findRecordById('remarketing_campaigns', campaign.id)
          if (liveC.getString('status') === 'paused' || liveC.getString('status') === 'stopped') {
            break
          }
        } catch (_) {}

        const recipient = pendingRecipients[i]
        const customerId = recipient.getString('customer_id')
        let customer = null
        if (customerId) {
          try {
            customer = $app.findRecordById('customers', customerId)
          } catch (_) {}
        }

        const custName =
          recipient.getString('customer_name') ||
          (customer ? customer.getString('name') : 'Cliente')
        const firstName = customer
          ? customer.getString('first_name') || custName.split(' ')[0]
          : custName.split(' ')[0]
        const imovelInteresse = customer
          ? customer.getString('notes') ||
            customer.getString('neighborhood') ||
            customer.getString('price_range') ||
            'imóvel de seu interesse'
          : 'imóvel de seu interesse'

        let personalizedMessage = messageTemplate
        personalizedMessage = personalizedMessage.replace(/\{\{nome\}\}/gi, custName)
        personalizedMessage = personalizedMessage.replace(/\{\{primeiro_nome\}\}/gi, firstName)
        personalizedMessage = personalizedMessage.replace(/\{\{first_name\}\}/gi, firstName)
        personalizedMessage = personalizedMessage.replace(/\{\{name\}\}/gi, custName)
        personalizedMessage = personalizedMessage.replace(
          /\{\{imovel_interesse\}\}/gi,
          imovelInteresse,
        )
        personalizedMessage = personalizedMessage.replace(/\{\{corretor\}\}/gi, brokerName)
        personalizedMessage = personalizedMessage.replace(/\{\{1\}\}/g, firstName)
        personalizedMessage = personalizedMessage.replace(/\{\{2\}\}/g, imovelInteresse)
        personalizedMessage = personalizedMessage.replace(/\{\{3\}\}/g, brokerName)

        recipient.set('resolved_message', personalizedMessage || '(Template: ' + templateName + ')')

        let cleanPhone = (recipient.getString('phone') || '').replace(/\D/g, '')
        if (cleanPhone.length === 10 || cleanPhone.length === 11) {
          cleanPhone = '55' + cleanPhone
        }

        if (!cleanPhone || cleanPhone.length < 10) {
          recipient.set('status', 'failed')
          recipient.set('error_message', 'Telefone inválido ou não informado')
          $app.save(recipient)
          batchFailed++
          continue
        }

        let in24hWindow = false
        if (customerId) {
          try {
            const recentConvs = $app.findRecordsByFilter(
              'conversations',
              "customer_id = '" +
                customerId +
                "' && sender = 'customer' && created >= '" +
                twentyFourHoursAgoIso +
                "'",
              '-created',
              1,
              0,
            )
            if (recentConvs && recentConvs.length > 0) {
              in24hWindow = true
            }
          } catch (_) {}
        }
        recipient.set('in_24h_window', in24hWindow)

        if (!in24hWindow && !templateName) {
          recipient.set('status', 'requires_template')
          recipient.set(
            'error_message',
            'Contato fora da janela de 24h (Meta exige template cadastrado)',
          )
          $app.save(recipient)
          batchRequiresTemplate++
          continue
        }

        let payloadBody = {}
        if (templateName) {
          const templateParameters = [{ type: 'text', text: firstName || custName }]
          if (messageTemplate.includes('{{2}}') || personalizedMessage.includes(imovelInteresse)) {
            templateParameters.push({ type: 'text', text: imovelInteresse })
          }
          if (messageTemplate.includes('{{3}}') || personalizedMessage.includes(brokerName)) {
            templateParameters.push({ type: 'text', text: brokerName })
          }

          payloadBody = {
            messaging_product: 'whatsapp',
            to: cleanPhone,
            type: 'template',
            template: {
              name: templateName,
              language: { code: templateLanguage || 'pt_BR' },
              components: [
                {
                  type: 'body',
                  parameters: templateParameters,
                },
              ],
            },
          }
        } else {
          payloadBody = {
            messaging_product: 'whatsapp',
            to: cleanPhone,
            type: 'text',
            text: {
              preview_url: false,
              body: personalizedMessage,
            },
          }
        }

        try {
          const res = $http.send({
            url: 'https://graph.facebook.com/v21.0/' + phoneNumberId + '/messages',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + accessToken,
            },
            body: JSON.stringify(payloadBody),
            timeout: 30,
          })

          let resData = null
          try {
            resData = res.json
          } catch (_) {}

          if (res.statusCode >= 200 && res.statusCode < 300) {
            const wamid =
              resData && resData.messages && resData.messages[0] ? resData.messages[0].id : ''
            recipient.set('status', 'sent')
            recipient.set('whatsapp_message_id', wamid)
            recipient.set('error_message', '')
            recipient.set('sent_at', new Date().toISOString().replace('T', ' ').slice(0, 19))
            $app.save(recipient)

            batchSent++

            if (customerId) {
              try {
                const conv = new Record(convCol)
                conv.set('customer_id', customerId)
                conv.set('user_id', user.id)
                conv.set('channel', 'whatsapp')
                conv.set('sender', 'ai')
                conv.set(
                  'content',
                  '📢 [Remarketing WhatsApp - ' +
                    campaignName +
                    ']:\n' +
                    (personalizedMessage || '(Template: ' + templateName + ')'),
                )
                $app.save(conv)
              } catch (_) {}

              if (customer) {
                try {
                  customer.set('last_sent_at', new Date().toISOString().slice(0, 10))
                  $app.saveNoValidate(customer)
                } catch (_) {}
              }
            }
          } else {
            let errMsg = 'Erro na API do Meta (Status ' + res.statusCode + ')'
            if (resData && resData.error && resData.error.message) {
              errMsg = resData.error.message
              if (
                resData.error.code === 131047 ||
                errMsg.includes('24 hour') ||
                errMsg.includes('outside the allowed window')
              ) {
                errMsg = 'Janela de 24h expirada: Meta exige mensagem modelo (template)'
                recipient.set('status', 'requires_template')
              } else if (resData.error.code === 132001 || errMsg.includes('does not exist')) {
                errMsg = 'Modelo não encontrado ou ainda não aprovado na Meta: ' + templateName
                recipient.set('status', 'failed')
              } else {
                recipient.set('status', 'failed')
              }
            } else {
              recipient.set('status', 'failed')
            }

            recipient.set('error_message', errMsg)
            $app.save(recipient)

            if (recipient.getString('status') === 'requires_template') {
              batchRequiresTemplate++
            } else {
              batchFailed++
            }
          }
        } catch (sendErr) {
          const errText = String(sendErr && sendErr.message ? sendErr.message : sendErr)
          recipient.set('status', 'failed')
          recipient.set('error_message', 'Erro de rede: ' + errText)
          $app.save(recipient)
          batchFailed++
        }

        if (i + 1 < pendingRecipients.length) {
          const sleepStart = Date.now()
          while (Date.now() - sleepStart < 80) {}
        }
      }

      const currentBatchNum = (campaign.getInt('current_batch') || 0) + 1
      const newSent = (campaign.getInt('sent_count') || 0) + batchSent
      const newFailed = (campaign.getInt('failed_count') || 0) + batchFailed
      const newRequiresTemplate =
        (campaign.getInt('requires_template_count') || 0) + batchRequiresTemplate

      campaign.set('sent_count', newSent)
      campaign.set('failed_count', newFailed)
      campaign.set('requires_template_count', newRequiresTemplate)
      campaign.set('current_batch', currentBatchNum)

      const remainingCount = $app.countRecords(
        'remarketing_recipients',
        "campaign_id = '" + campaign.id + "' && status = 'queued'",
      )

      const intervalMin = campaign.getInt('batch_interval_minutes') || 5

      if (remainingCount === 0) {
        campaign.set('status', 'completed')
        campaign.set('next_batch_at', '')
      } else {
        campaign.set('status', 'sending')
        const nextMs = Date.now() + intervalMin * 60 * 1000
        campaign.set('next_batch_at', new Date(nextMs).toISOString().replace('T', ' ').slice(0, 19))
      }
      $app.save(campaign)
    } catch (batchErr) {
      $app
        .logger()
        .error('Falha no lote cron da campanha ' + campaign.id, 'error', String(batchErr))
    }
  }
})
