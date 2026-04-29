routerAdd('GET', '/backend/v1/meta-webhook', (e) => {
  const query = e.requestInfo().query
  const mode = query['hub.mode']
  const token = query['hub.verify_token']
  const challenge = query['hub.challenge']

  if (mode === 'subscribe' && token) {
    return e.string(200, challenge || '')
  }
  return e.badRequestError('Invalid verify token')
})

routerAdd('POST', '/backend/v1/meta-webhook', (e) => {
  const body = e.requestInfo().body
  $app.logger().info('Meta Webhook Received', 'body', body)

  try {
    // AC: Every time the meta_webhook is triggered, a record must be created in system_logs with the type DIAGNOSTIC.
    let globalUserId = ''
    try {
      const fallbackUser = $app.findRecordsByFilter('users', '', 'created', 1, 0)
      if (fallbackUser.length > 0) globalUserId = fallbackUser[0].id
    } catch (_) {}

    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const rawLog = new Record(logsCol)
      rawLog.set('user_id', globalUserId)
      rawLog.set('type', 'diagnostic')
      rawLog.set('message', 'Raw Meta Webhook Payload Received')
      rawLog.set('details', 'Payload bruto recebido do Meta Webhook (Lead Form / WhatsApp).')
      rawLog.set('payload', body)
      $app.saveNoValidate(rawLog)
    } catch (err) {
      $app.logger().error('Failed to save raw webhook log', err)
    }

    if (body.object === 'page' && body.entry) {
      // Handle Meta Lead Form (leadgen)
      for (const entry of body.entry) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const value = change.value
            if (!value) continue

            const leadId = value.leadgen_id
            const formId = value.form_id
            const contactName = `Meta Lead Form - ${leadId || new Date().getTime()}`
            const phone = `+5500000000000` // Placeholder for generic page leadgen without auth token

            try {
              const customersCol = $app.findCollectionByNameOrId('customers')
              const customer = new Record(customersCol)
              customer.set('user_id', globalUserId)
              customer.set('name', contactName)
              customer.set('phone', phone)
              customer.set('status', 'Novo')
              customer.set('source', 'Meta Ads Lead Form')
              customer.set(
                'notes',
                `Form ID: ${formId}\nLead ID: ${leadId}\nNote: Raw leadgen event without token to fetch details.`,
              )
              $app.save(customer)
            } catch (err) {
              const logsCol = $app.findCollectionByNameOrId('system_logs')
              const logRecord = new Record(logsCol)
              logRecord.set('user_id', globalUserId)
              logRecord.set('type', 'diagnostic_error')
              logRecord.set('message', `Falha ao criar cliente via Meta Lead Form`)
              logRecord.set('details', `Erro do Banco de Dados: ${String(err)}`)
              logRecord.set('payload', { error: String(err), raw_body: body })
              $app.saveNoValidate(logRecord)
            }
          }
        }
      }
    } else if (body.object === 'whatsapp_business_account' && body.entry) {
      for (const entry of body.entry) {
        for (const change of entry.changes || []) {
          const value = change.value
          if (value && value.messages && value.messages.length > 0) {
            for (const msg of value.messages) {
              if (msg.type === 'text' && msg.text && msg.text.body) {
                const phone = msg.from
                const text = msg.text.body

                let receiverPhone = ''
                if (value.metadata && value.metadata.display_phone_number) {
                  receiverPhone = value.metadata.display_phone_number.replace(/\D/g, '')
                }

                let targetUserId = ''
                try {
                  if (receiverPhone) {
                    const users = $app.findRecordsByFilter(
                      'users',
                      `meta_campaign_phone ~ '${receiverPhone}'`,
                      '',
                      1,
                      0,
                    )
                    if (users.length > 0) targetUserId = users[0].id
                  }
                  if (!targetUserId) {
                    const fallbackUser = $app.findRecordsByFilter('users', '', 'created', 1, 0)
                    if (fallbackUser.length > 0) targetUserId = fallbackUser[0].id
                  }
                } catch (_) {}

                // AC: Fallback to phone number if name is missing to prevent constraint errors
                let contactName = `Meta Lead - ${phone}`
                if (value.contacts && value.contacts.length > 0) {
                  const contact = value.contacts.find((c) => c.wa_id === phone)
                  if (contact && contact.profile && contact.profile.name) {
                    contactName = contact.profile.name
                  }
                }

                let customer = null
                try {
                  const phoneNorm = phone.replace(/\D/g, '')
                  customer = $app.findFirstRecordByFilter(
                    'customers',
                    `phone ~ '${phoneNorm}' || phone_1_value ~ '${phoneNorm}'`,
                  )
                } catch (_) {}

                if (!customer && targetUserId) {
                  try {
                    const customersCol = $app.findCollectionByNameOrId('customers')
                    customer = new Record(customersCol)
                    customer.set('user_id', targetUserId)
                    customer.set('name', contactName)
                    customer.set('phone', phone.replace(/\D/g, ''))
                    customer.set('status', 'Novo')

                    let source = 'WhatsApp'
                    let notes = ''
                    if (msg.referral) {
                      source = 'Meta Ads'
                      notes = `Origem: Anúncio Meta\nHeadline: ${msg.referral.headline || 'N/A'}\nAd ID: ${msg.referral.source_id || 'N/A'}`
                    }
                    customer.set('source', source)
                    if (notes) customer.set('notes', notes)

                    $app.save(customer)

                    const logsCol = $app.findCollectionByNameOrId('system_logs')
                    const logRecord = new Record(logsCol)
                    logRecord.set('user_id', targetUserId)
                    logRecord.set('type', 'diagnostic')
                    logRecord.set('message', `Novo lead capturado via Webhook: ${contactName}`)
                    logRecord.set(
                      'details',
                      `Lead originado do telefone ${phone}. Origem: ${source}`,
                    )
                    logRecord.set('payload', {
                      customer_id: customer.id,
                      phone: phone,
                      source,
                      referral: msg.referral || null,
                    })
                    $app.save(logRecord)
                  } catch (err) {
                    $app.logger().error('Erro ao criar customer do webhook', err)
                    try {
                      const logsCol = $app.findCollectionByNameOrId('system_logs')
                      const logRecord = new Record(logsCol)
                      logRecord.set('user_id', targetUserId)
                      logRecord.set('type', 'diagnostic_error')
                      logRecord.set('message', `Falha ao criar lead do telefone ${phone}`)
                      // AC: Error Transparency - Record specific PocketBase error in details
                      logRecord.set('details', `Erro do Banco de Dados: ${String(err)}`)
                      logRecord.set('payload', { error: String(err), raw_body: body, phone, msg })
                      $app.saveNoValidate(logRecord)
                    } catch (_) {}
                  }
                }

                if (customer) {
                  let isDuplicate = false
                  try {
                    const recentMsgs = $app.findRecordsByFilter(
                      'conversations',
                      `customer_id = '${customer.id}' && sender = 'user' && content = {:text}`,
                      '-created',
                      1,
                      0,
                      { text },
                    )
                    if (recentMsgs.length > 0) {
                      const lastMsg = recentMsgs[0]
                      const diffMins =
                        (new Date().getTime() - new Date(lastMsg.getString('created')).getTime()) /
                        60000
                      if (diffMins < 5) isDuplicate = true
                    }
                  } catch (_) {}

                  if (!isDuplicate) {
                    const userId = customer.getString('user_id')
                    const conversation = new Record($app.findCollectionByNameOrId('conversations'))
                    conversation.set('customer_id', customer.id)
                    conversation.set('user_id', userId)
                    conversation.set('content', text)
                    conversation.set('sender', 'user')
                    $app.save(conversation)
                    $app
                      .logger()
                      .info('Inserted new message from Meta Webhook', 'customerId', customer.id)

                    // CAPI Event
                    try {
                      if (userId) {
                        const userRecord = $app.findRecordById('users', userId)
                        const capiToken = userRecord.getString('meta_capi_token')
                        const mainPixelId = userRecord.getString('meta_pixel_id')
                        const tagsList = userRecord.get('meta_tags_list') || []
                        const testCode = userRecord.getString('meta_test_event_code')

                        let targetPixels = []
                        if (mainPixelId) targetPixels.push(mainPixelId)
                        if (tagsList && Array.isArray(tagsList)) {
                          tagsList.forEach((t) => {
                            if (t.id && !targetPixels.includes(t.id)) targetPixels.push(t.id)
                          })
                        }

                        if (capiToken && targetPixels.length > 0) {
                          const timeUnix = Math.floor(new Date().getTime() / 1000)
                          const phoneNorm = phone.replace(/\D/g, '')
                          const hashPhone = $security.sha256(phoneNorm)

                          targetPixels.forEach((pixelId) => {
                            const payload = {
                              data: [
                                {
                                  event_name: 'Contact',
                                  event_time: timeUnix,
                                  action_source: 'system_generated',
                                  user_data: { ph: [hashPhone] },
                                  custom_data: { currency: 'BRL', value: 0.0 },
                                },
                              ],
                            }
                            if (testCode) payload.test_event_code = testCode

                            const res = $http.send({
                              url: `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${capiToken}`,
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(payload),
                              timeout: 5,
                            })

                            if (res.statusCode !== 200) {
                              const logsCol = $app.findCollectionByNameOrId('system_logs')
                              const logRecord = new Record(logsCol)
                              logRecord.set('user_id', userId)
                              logRecord.set('type', 'remarketing_error')
                              logRecord.set(
                                'message',
                                `Falha no CAPI via Webhook (Status ${res.statusCode})`,
                              )
                              logRecord.set(
                                'details',
                                typeof res.json === 'object'
                                  ? JSON.stringify(res.json)
                                  : String(res.raw),
                              )
                              logRecord.set('payload', {
                                statusCode: res.statusCode,
                                pixelId,
                                error: res.json,
                              })
                              $app.save(logRecord)
                            }
                          })
                        }
                      }
                    } catch (err) {
                      $app.logger().error('CAPI Error in Webhook', 'err', err)
                      try {
                        const logsCol = $app.findCollectionByNameOrId('system_logs')
                        const logRecord = new Record(logsCol)
                        logRecord.set('user_id', userId || '')
                        logRecord.set('type', 'remarketing_error')
                        logRecord.set('message', 'Erro interno no CAPI via Webhook')
                        logRecord.set('details', String(err))
                        $app.save(logRecord)
                      } catch (_) {}
                    }

                    try {
                      if (userId) {
                        const logCollection = $app.findCollectionByNameOrId('system_logs')
                        const logRecord = new Record(logCollection)
                        logRecord.set('user_id', userId)
                        logRecord.set('type', 'WEBHOOK')
                        logRecord.set('message', 'Mensagem recebida via Webhook do WhatsApp')
                        logRecord.set('details', 'Nova mensagem de cliente processada com sucesso.')
                        logRecord.set('payload', { customer_id: customer.id, phone: phone })
                        $app.save(logRecord)
                      }
                    } catch (_) {}
                  } else {
                    $app
                      .logger()
                      .info(
                        'Skipped duplicate incoming message from Meta Webhook',
                        'customerId',
                        customer.id,
                      )
                  }
                } else {
                  $app
                    .logger()
                    .warn(
                      'Customer not found and could not be created for incoming WhatsApp message',
                      'phone',
                      phone,
                    )
                  try {
                    if (targetUserId) {
                      const logsCol = $app.findCollectionByNameOrId('system_logs')
                      const logRecord = new Record(logsCol)
                      logRecord.set('user_id', targetUserId)
                      logRecord.set('type', 'diagnostic_error')
                      logRecord.set('message', `Lead ignorado: cliente não pôde ser criado.`)
                      logRecord.set('details', `Telefone: ${phone}`)
                      $app.save(logRecord)
                    }
                  } catch (_) {}
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    $app.logger().error('Error processing Meta Webhook', 'err', err)
  }

  return e.json(200, { status: 'ok', message: 'Event received successfully' })
})
