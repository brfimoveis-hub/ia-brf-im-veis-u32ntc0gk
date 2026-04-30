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
      rawLog.set(
        'details',
        'Payload bruto recebido do Meta Webhook (Lead Form / WhatsApp / Instagram).',
      )
      rawLog.set('payload', body)
      $app.saveNoValidate(rawLog)
    } catch (err) {
      $app.logger().error('Failed to save raw webhook log', err)
    }

    // --- Uazapi / Evolution API Fallback ---
    if ((body.event === 'messages.upsert' || body.event === 'message.upsert') && body.data) {
      try {
        const msgData = body.data
        const messageInfo = msgData.message || {}
        const keyInfo = msgData.key || {}

        if (!keyInfo.fromMe && keyInfo.remoteJid) {
          const phone = keyInfo.remoteJid.split('@')[0]
          const text =
            messageInfo.conversation ||
            (messageInfo.extendedTextMessage && messageInfo.extendedTextMessage.text) ||
            ''

          if (text) {
            let targetUserId = globalUserId
            let receiverPhone = body.instance || '48992098050'

            try {
              const allUsers = $app.findRecordsByFilter(
                'users',
                "meta_campaign_phone != ''",
                '',
                100,
                0,
              )
              for (const u of allUsers) {
                const cp = u.getString('meta_campaign_phone').replace(/\D/g, '')
                if (cp && (receiverPhone.includes(cp) || cp.includes(receiverPhone))) {
                  targetUserId = u.id
                  break
                }
              }
            } catch (_) {}

            let customer = null
            try {
              const phoneNorm = phone.replace(/\D/g, '')
              customer = $app.findFirstRecordByFilter(
                'customers',
                `phone ~ '${phoneNorm}' || phone_1_value ~ '${phoneNorm}'`,
              )
            } catch (_) {}

            if (!customer && targetUserId) {
              const customersCol = $app.findCollectionByNameOrId('customers')
              customer = new Record(customersCol)
              customer.set('user_id', targetUserId)
              customer.set('name', msgData.pushName || `Lead-Uazapi-${phone}`)
              customer.set('phone', phone.replace(/\D/g, ''))

              let initialStatus = 'Base de Clientes/Novo LYD'
              try {
                const activeCadences = $app.findRecordsByFilter(
                  'cadences',
                  `user_id = '${targetUserId}' && is_active = true`,
                  'order',
                  1,
                  0,
                )
                if (activeCadences.length > 0) {
                  initialStatus =
                    activeCadences[0].getString('title') || 'Base de Clientes/Novo LYD'
                }
              } catch (_) {}
              customer.set('status', initialStatus)

              customer.set('source', `Uazapi - ${receiverPhone}`)
              $app.save(customer)

              const logsCol = $app.findCollectionByNameOrId('system_logs')
              const logRecord = new Record(logsCol)
              logRecord.set('user_id', targetUserId)
              logRecord.set('type', 'diagnostic')
              logRecord.set(
                'message',
                `Novo lead capturado via Uazapi: ${customer.getString('name')}`,
              )
              logRecord.set('details', `Telefone: ${phone}. Origem Uazapi - ${receiverPhone}`)
              logRecord.set('payload', {
                customer_id: customer.id,
                phone,
                source: customer.getString('source'),
              })
              $app.save(logRecord)
            }

            if (customer) {
              const userId = customer.getString('user_id')
              const conversation = new Record($app.findCollectionByNameOrId('conversations'))
              conversation.set('customer_id', customer.id)
              conversation.set('user_id', userId)
              conversation.set('content', text)
              conversation.set('sender', 'user')
              $app.save(conversation)
            }
          }
        }
      } catch (err) {
        $app.logger().error('Uazapi payload error', err)
      }
    }
    // --- Meta Ads / Instagram / FB Forms ---
    else if (body.object === 'page' && body.entry) {
      // Handle Meta Lead Form (leadgen) mapping to Website
      for (const entry of body.entry) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const value = change.value
            if (!value) continue

            const leadId = value.leadgen_id
            const formId = value.form_id
            const contactName = `Lead-Meta-${leadId || new Date().getTime()}`
            const phone = `+5500000000000` // Placeholder for generic page leadgen without auth token

            try {
              const customersCol = $app.findCollectionByNameOrId('customers')
              const customer = new Record(customersCol)
              customer.set('user_id', globalUserId)
              customer.set('name', contactName)
              customer.set('phone', phone)
              customer.set('status', 'Base de Clientes/Novo LYD')
              customer.set('source', 'Website')
              customer.set(
                'notes',
                `Form ID: ${formId}\nLead ID: ${leadId}\nNote: Raw leadgen event sem token para buscar detalhes.\nOriginado do Website (mapped).`,
              )
              $app.save(customer)
            } catch (err) {
              const logsCol = $app.findCollectionByNameOrId('system_logs')
              const logRecord = new Record(logsCol)
              logRecord.set('user_id', globalUserId)
              logRecord.set('type', 'diagnostic_error')
              logRecord.set('message', `Falha ao criar cliente via Website (Lead Form)`)
              logRecord.set('details', `Erro do Banco de Dados: ${String(err)}`)
              logRecord.set('payload', { error: String(err), raw_body: body })
              $app.saveNoValidate(logRecord)
            }
          }
        }
      }
    } else if (body.object === 'instagram' && body.entry) {
      // Handle Instagram Messages
      for (const entry of body.entry) {
        for (const messaging of entry.messaging || []) {
          const senderId = messaging.sender?.id
          if (!senderId) continue

          const text = messaging.message?.text || 'Nova interação no Instagram'
          const contactName = `Lead-Meta-${senderId}`
          let targetUserId = globalUserId

          let customer = null
          try {
            customer = $app.findFirstRecordByFilter(
              'customers',
              `notes ~ '${senderId}' && source = 'Instagram'`,
            )
          } catch (_) {}

          if (!customer && targetUserId) {
            try {
              const customersCol = $app.findCollectionByNameOrId('customers')
              customer = new Record(customersCol)
              customer.set('user_id', targetUserId)
              customer.set('name', contactName)
              customer.set('status', 'Lead Novo')
              customer.set('source', 'Instagram')
              customer.set('notes', `IG Sender ID: ${senderId}\nOrigin: Instagram`)
              $app.save(customer)

              const logsCol = $app.findCollectionByNameOrId('system_logs')
              const logRecord = new Record(logsCol)
              logRecord.set('user_id', targetUserId)
              logRecord.set('type', 'diagnostic')
              logRecord.set('message', `Novo lead capturado via Webhook: ${contactName}`)
              logRecord.set('details', `Lead originado do Instagram.`)
              logRecord.set('payload', {
                customer_id: customer.id,
                source: 'Instagram',
                senderId,
              })
              $app.save(logRecord)
            } catch (err) {
              const logsCol = $app.findCollectionByNameOrId('system_logs')
              const logRecord = new Record(logsCol)
              logRecord.set('user_id', targetUserId)
              logRecord.set('type', 'diagnostic_error')
              logRecord.set('message', `Falha ao criar lead do Instagram ID ${senderId}`)
              logRecord.set('details', `Erro do Banco de Dados: ${String(err)}`)
              logRecord.set('payload', { error: String(err), raw_body: body })
              $app.saveNoValidate(logRecord)
            }
          }

          if (customer) {
            try {
              const conversation = new Record($app.findCollectionByNameOrId('conversations'))
              conversation.set('customer_id', customer.id)
              conversation.set('user_id', targetUserId)
              conversation.set('content', text)
              conversation.set('sender', 'user')
              $app.save(conversation)
            } catch (err) {
              $app.logger().error('Erro ao salvar conversa do Instagram', err)
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
                  const allUsers = $app.findRecordsByFilter(
                    'users',
                    "meta_campaign_phone != ''",
                    '',
                    100,
                    0,
                  )
                  if (receiverPhone) {
                    for (const u of allUsers) {
                      const cp = u.getString('meta_campaign_phone').replace(/\D/g, '')
                      if (cp && (receiverPhone.includes(cp) || cp.includes(receiverPhone))) {
                        targetUserId = u.id
                        break
                      }
                    }
                  }
                  if (
                    !targetUserId &&
                    (receiverPhone.includes('48992098050') ||
                      receiverPhone.includes('5548992098050') ||
                      receiverPhone.includes('48991828050') ||
                      receiverPhone.includes('5548991828050'))
                  ) {
                    for (const u of allUsers) {
                      const cp = u.getString('meta_campaign_phone').replace(/\D/g, '')
                      if (cp.includes('48992098050') || cp.includes('48991828050')) {
                        targetUserId = u.id
                        break
                      }
                    }
                  }
                  if (!targetUserId) {
                    targetUserId = globalUserId
                  }
                } catch (_) {}

                // AC: Fallback to phone number if name is missing to prevent constraint errors
                let contactName = `Lead-Meta-${phone}`
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

                    let initialStatus = 'Base de Clientes/Novo LYD'
                    try {
                      const activeCadences = $app.findRecordsByFilter(
                        'cadences',
                        `user_id = '${targetUserId}' && is_active = true`,
                        'order',
                        1,
                        0,
                      )
                      if (activeCadences.length > 0) {
                        initialStatus =
                          activeCadences[0].getString('title') || 'Base de Clientes/Novo LYD'
                      }
                    } catch (_) {}
                    customer.set('status', initialStatus)

                    let source = receiverPhone ? `Meta - ${receiverPhone}` : 'WhatsApp'
                    if (receiverPhone.includes('48992098050')) {
                      source = `Meta - 48992098050`
                    } else if (receiverPhone.includes('48991828050')) {
                      source = `Meta - 48991828050`
                    }
                    if (!receiverPhone && targetUserId) {
                      try {
                        const u = $app.findRecordById('users', targetUserId)
                        const uPhone = u.getString('meta_campaign_phone')
                        if (uPhone && uPhone.includes('48992098050')) {
                          source = `Meta - 48992098050`
                        }
                      } catch (_) {}
                    }

                    let notes = ''
                    if (msg.referral) {
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
                  }
                } else {
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
    try {
      let globalUserId = ''
      try {
        const fallbackUser = $app.findRecordsByFilter('users', '', 'created', 1, 0)
        if (fallbackUser.length > 0) globalUserId = fallbackUser[0].id
      } catch (_) {}

      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logsCol)
      logRecord.set('user_id', globalUserId)
      logRecord.set('type', 'diagnostic_error')
      logRecord.set('message', 'Falha Crítica no Webhook (Catch Global)')
      logRecord.set('details', String(err))
      logRecord.set('payload', { error: String(err), raw_body: body })
      $app.saveNoValidate(logRecord)
    } catch (_) {}
  }

  return e.json(200, { status: 'ok', message: 'Event received successfully' })
})
