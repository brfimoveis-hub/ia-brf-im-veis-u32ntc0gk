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

    if (!messageTemplate && !templateName) {
      return e.badRequestError('Mensagem ou nome do modelo (template) é obrigatório')
    }

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return e.badRequestError('Selecione pelo menos um cliente para a campanha')
    }

    if (customerIds.length > 1000) {
      return e.badRequestError('Limite máximo de 1000 clientes por envio')
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
    $app.save(campaign)

    let sentCount = 0
    let failedCount = 0
    let requiresTemplateCount = 0
    const results = []

    const brokerName = user.getString('name') || 'BRF Imóveis'
    const nowMs = Date.now()
    const twentyFourHoursAgoMs = nowMs - 24 * 60 * 60 * 1000
    const twentyFourHoursAgoIso = new Date(twentyFourHoursAgoMs)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19)

    for (let i = 0; i < customerIds.length; i++) {
      const cId = customerIds[i]
      let customer = null
      try {
        customer = $app.findRecordById('customers', cId)
      } catch (_) {
        results.push({
          customer_id: cId,
          status: 'failed',
          error: 'Cliente não encontrado',
        })
        failedCount++
        continue
      }

      if (customer.getString('user_id') && customer.getString('user_id') !== user.id) {
        results.push({
          customer_id: cId,
          customer_name: customer.getString('name'),
          status: 'failed',
          error: 'Acesso negado a este contato',
        })
        failedCount++
        continue
      }

      let rawPhone = customer.getString('phone') || customer.getString('phone_1_value') || ''
      let cleanPhone = rawPhone.replace(/\D/g, '')
      if (cleanPhone.length === 10 || cleanPhone.length === 11) {
        cleanPhone = '55' + cleanPhone
      }

      const custName = customer.getString('name') || customer.getString('first_name') || 'Cliente'
      const firstName =
        customer.getString('first_name') || (custName ? custName.split(' ')[0] : 'Cliente')
      const imovelInteresse =
        customer.getString('notes') ||
        customer.getString('neighborhood') ||
        customer.getString('price_range') ||
        'imóvel de seu interesse'

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
      // Mapeamento automático de variáveis numéricas padrão Meta {{1}}, {{2}}, {{3}}
      personalizedMessage = personalizedMessage.replace(/\{\{1\}\}/g, firstName)
      personalizedMessage = personalizedMessage.replace(/\{\{2\}\}/g, imovelInteresse)
      personalizedMessage = personalizedMessage.replace(/\{\{3\}\}/g, brokerName)

      const recipient = new Record(recipientsCol)
      recipient.set('campaign_id', campaign.id)
      recipient.set('customer_id', customer.id)
      recipient.set('phone', cleanPhone || rawPhone)
      recipient.set('customer_name', custName)
      recipient.set('resolved_message', personalizedMessage || '(Template: ' + templateName + ')')
      recipient.set('status', 'queued')

      if (!cleanPhone || cleanPhone.length < 10) {
        recipient.set('status', 'failed')
        recipient.set('error_message', 'Telefone inválido ou não informado')
        $app.save(recipient)
        results.push({
          id: recipient.id,
          customer_id: customer.id,
          phone: rawPhone,
          customer_name: custName,
          status: 'failed',
          error: 'Telefone inválido',
        })
        failedCount++
        continue
      }

      let in24hWindow = false
      try {
        const recentConvs = $app.findRecordsByFilter(
          'conversations',
          "customer_id = '" +
            customer.id +
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

      recipient.set('in_24h_window', in24hWindow)

      if (!in24hWindow && !templateName) {
        const reason = 'Contato fora da janela de 24h (Meta exige mensagem via template cadastrado)'
        recipient.set('status', 'requires_template')
        recipient.set('error_message', reason)
        $app.save(recipient)
        results.push({
          id: recipient.id,
          customer_id: customer.id,
          phone: cleanPhone,
          customer_name: custName,
          status: 'requires_template',
          error: reason,
        })
        requiresTemplateCount++
        continue
      }

      let payloadBody = {}
      if (templateName) {
        // Envio via template oficial Meta
        // Mapeia parâmetros na ordem das variáveis numéricas {{1}}, {{2}}...
        const templateParameters = [{ type: 'text', text: firstName || custName }]
        if (messageTemplate.includes('{{2}}')) {
          templateParameters.push({ type: 'text', text: imovelInteresse })
        }
        if (messageTemplate.includes('{{3}}')) {
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
          recipient.set('sent_at', new Date().toISOString().replace('T', ' ').slice(0, 19))
          $app.save(recipient)

          sentCount++
          results.push({
            id: recipient.id,
            customer_id: customer.id,
            phone: cleanPhone,
            customer_name: custName,
            status: 'sent',
            wamid: wamid,
          })

          try {
            const conv = new Record(convCol)
            conv.set('customer_id', customer.id)
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

          try {
            customer.set('last_sent_at', new Date().toISOString().slice(0, 10))
            $app.saveNoValidate(customer)
          } catch (_) {}
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
            } else {
              recipient.set('status', 'failed')
            }
          } else {
            recipient.set('status', 'failed')
          }

          recipient.set('error_message', errMsg)
          $app.save(recipient)

          if (recipient.getString('status') === 'requires_template') {
            requiresTemplateCount++
          } else {
            failedCount++
          }

          results.push({
            id: recipient.id,
            customer_id: customer.id,
            phone: cleanPhone,
            customer_name: custName,
            status: recipient.getString('status'),
            error: errMsg,
          })
        }
      } catch (sendErr) {
        const errText = String(sendErr && sendErr.message ? sendErr.message : sendErr)
        recipient.set('status', 'failed')
        recipient.set('error_message', 'Erro de rede: ' + errText)
        $app.save(recipient)
        failedCount++
        results.push({
          id: recipient.id,
          customer_id: customer.id,
          phone: cleanPhone,
          customer_name: custName,
          status: 'failed',
          error: 'Falha de conexão com a Meta: ' + errText,
        })
      }

      if ((i + 1) % 5 === 0 || i === customerIds.length - 1) {
        try {
          campaign.set('sent_count', sentCount)
          campaign.set('failed_count', failedCount)
          campaign.set('requires_template_count', requiresTemplateCount)
          $app.saveNoValidate(campaign)
        } catch (_) {}
      }

      if (i + 1 < customerIds.length) {
        $os.sleep(80)
      }
    }

    let capiSyncedCount = 0
    if (syncMetaCapi) {
      const pixelId = user.getString('meta_pixel_id') || user.getString('meta_dataset_id')
      const capiToken = user.getString('meta_capi_token')

      if (pixelId && capiToken) {
        const capiPayloads = []
        for (let j = 0; j < customerIds.length; j++) {
          try {
            const cust = $app.findRecordById('customers', customerIds[j])
            let em = cust.getString('email') || cust.getString('email_1_value') || ''
            let ph = cust.getString('phone') || cust.getString('phone_1_value') || ''
            em = em.trim().toLowerCase()
            ph = ph.replace(/\D/g, '')
            if (ph.length === 10 || ph.length === 11) ph = '55' + ph

            const userData = {
              client_ip_address: e.request.remoteAddr.split(':')[0] || '192.168.1.1',
              client_user_agent:
                e.request.header.get('User-Agent') ||
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SkipCloud/1.0',
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
          } catch (_) {}
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
            $app.logger().error('CAPI Conjunctive Sync Error', 'error', String(capiErr))
          }
        }
      }
    }

    campaign.set('sent_count', sentCount)
    campaign.set('failed_count', failedCount)
    campaign.set('requires_template_count', requiresTemplateCount)
    campaign.set('capi_synced_count', capiSyncedCount)
    campaign.set('status', 'completed')
    $app.save(campaign)

    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logsCol)
      logRecord.set('type', 'whatsapp_remarketing_campaign')
      logRecord.set(
        'message',
        'Campanha "' +
          campaignName +
          '": ' +
          sentCount +
          ' enviados, ' +
          requiresTemplateCount +
          ' requer template, ' +
          failedCount +
          ' falhas',
      )
      logRecord.set('payload', {
        campaign_id: campaign.id,
        total: customerIds.length,
        sent: sentCount,
        requires_template: requiresTemplateCount,
        failed: failedCount,
        capi_synced: capiSyncedCount,
      })
      logRecord.set('user_id', user.id)
      $app.saveNoValidate(logRecord)
    } catch (_) {}

    return e.json(200, {
      success: true,
      campaign_id: campaign.id,
      total: customerIds.length,
      sent: sentCount,
      requires_template: requiresTemplateCount,
      failed: failedCount,
      capi_synced: capiSyncedCount,
      results: results,
    })
  },
  $apis.requireAuth(),
)
