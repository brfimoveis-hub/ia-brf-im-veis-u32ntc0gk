routerAdd('GET', '/backend/v1/meta-webhook', (e) => {
  const query = e.requestInfo().query
  const mode = query['hub.mode']
  const token = query['hub.verify_token']
  const challenge = query['hub.challenge']

  if (mode === 'subscribe' && token) {
    try {
      const users = $app.findRecordsByFilter(
        'users',
        "meta_whatsapp_verify_token != ''",
        'created',
        100,
        0,
      )
      for (const u of users) {
        if (u.getString('meta_whatsapp_verify_token') === token) {
          return e.string(200, challenge || '')
        }
      }
    } catch (_) {}
    return e.string(403, 'Forbidden: verify token mismatch')
  }
  return e.badRequestError('Invalid verify token')
})

routerAdd('POST', '/backend/v1/meta-webhook', (e) => {
  const body = e.requestInfo().body
  $app.logger().info('Meta Webhook Received', 'body', body)

  let globalUserId = ''
  try {
    const fbUsers = $app.findRecordsByFilter('users', "meta_pixel_id != ''", 'created', 1, 0)
    if (fbUsers.length > 0) {
      globalUserId = fbUsers[0].id
    } else {
      const anyUser = $app.findRecordsByFilter('users', '', 'created', 1, 0)
      if (anyUser.length > 0) globalUserId = anyUser[0].id
    }
  } catch (_) {}

  function saveLog(uid, type, message, details, payload) {
    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logsCol)
      logRecord.set('user_id', uid || globalUserId)
      logRecord.set('type', type)
      logRecord.set('message', message)
      if (details) {
        logRecord.set('details', typeof details === 'string' ? details : JSON.stringify(details))
      }
      if (payload) logRecord.set('payload', payload)
      $app.saveNoValidate(logRecord)
    } catch (err) {
      $app.logger().error('Failed to save webhook log', 'error', String(err))
    }
  }

  saveLog(
    globalUserId,
    'diagnostic_log',
    'Raw Meta Webhook Payload Received',
    'Payload bruto recebido do Meta Webhook.',
    body,
  )

  try {
    let capiToken = ''
    try {
      const capiUsers = $app.findRecordsByFilter('users', "meta_capi_token != ''", 'created', 1, 0)
      if (capiUsers.length > 0) capiToken = capiUsers[0].getString('meta_capi_token')
    } catch (_) {}

    if (body.object === 'page' && body.entry) {
      for (const entry of body.entry) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const value = change.value
            if (!value) continue

            const leadId = value.leadgen_id
            const formId = value.form_id
            let leadName = 'Lead-Meta-' + (leadId || new Date().getTime())
            let leadEmail = ''
            let leadPhone = ''

            if (capiToken && leadId) {
              try {
                const leadRes = $http.send({
                  url: 'https://graph.facebook.com/v21.0/' + leadId + '?access_token=' + capiToken,
                  method: 'GET',
                  timeout: 15,
                })
                if (leadRes.statusCode === 200 && leadRes.json) {
                  const fieldData = leadRes.json.field_data || []
                  for (const field of fieldData) {
                    if (field.name === 'full_name' || field.name === 'first_name') {
                      leadName = (field.values && field.values[0]) || leadName
                    } else if (field.name === 'email') {
                      leadEmail = (field.values && field.values[0]) || ''
                    } else if (field.name === 'phone_number') {
                      leadPhone = (field.values && field.values[0]) || ''
                    }
                  }
                } else {
                  saveLog(
                    globalUserId,
                    'meta_error',
                    'Falha ao buscar dados do lead form',
                    'HTTP ' + leadRes.statusCode,
                    { leadId: leadId, statusCode: leadRes.statusCode },
                  )
                }
              } catch (apiErr) {
                saveLog(
                  globalUserId,
                  'meta_error',
                  'Erro ao buscar dados do lead form via Graph API',
                  String(apiErr),
                  { leadId: leadId, error: String(apiErr) },
                )
              }
            }

            try {
              const customersCol = $app.findCollectionByNameOrId('customers')
              const customer = new Record(customersCol)
              customer.set('user_id', globalUserId)
              customer.set('name', leadName)
              customer.set('phone', leadPhone)
              customer.set('email', leadEmail)
              customer.set('email_1_value', leadEmail)
              customer.set('phone_1_value', leadPhone)
              customer.set('status', 'Novo')
              customer.set('source', 'Meta')
              customer.set(
                'notes',
                'Form ID: ' + formId + '\nLead ID: ' + leadId + '\nOriginado do Meta Lead Form.',
              )
              $app.save(customer)
            } catch (err) {
              saveLog(
                globalUserId,
                'meta_error',
                'Falha ao criar cliente via Website (Lead Form)',
                String(err),
                { error: String(err), raw_body: body },
              )
            }
          } else if (change.field === 'feed' || change.field === 'comments') {
            const value = change.value
            if (!value) continue
            const isComment = value.item === 'comment' || change.field === 'comments'
            if (!isComment) continue

            const commentText = value.message || value.text || ''
            const commenterName =
              (value.from && (value.from.name || value.from.username)) || 'Lead-Comentario'
            const commenterId = (value.from && value.from.id) || ''
            if (!commentText) continue

            try {
              const customersCol = $app.findCollectionByNameOrId('customers')
              const customer = new Record(customersCol)
              customer.set('user_id', globalUserId)
              customer.set('name', commenterName)
              customer.set('status', 'Novo')
              customer.set('source', 'Meta')
              customer.set(
                'notes',
                'Comentario: "' +
                  commentText +
                  '"\nCommenter ID: ' +
                  commenterId +
                  '\nOrigin: Meta Comment',
              )
              $app.save(customer)
              saveLog(
                globalUserId,
                'diagnostic_log',
                'Novo lead capturado via comentario: ' + commenterName,
                'Comentario: ' + commentText,
                { customer_id: customer.id, commenter_id: commenterId },
              )
            } catch (err) {
              saveLog(
                globalUserId,
                'meta_error',
                'Falha ao criar lead de comentario',
                String(err),
                { error: String(err) },
              )
            }
          }
        }

        for (const messaging of entry.messaging || []) {
          const senderId = messaging.sender ? messaging.sender.id : ''
          if (!senderId) continue

          if (messaging.postback) {
            const postbackText =
              messaging.postback.title || messaging.postback.payload || 'Postback'
            const contactName = 'Lead-Meta-' + senderId
            try {
              const customersCol = $app.findCollectionByNameOrId('customers')
              const customer = new Record(customersCol)
              customer.set('user_id', globalUserId)
              customer.set('name', contactName)
              customer.set('status', 'Novo')
              customer.set('source', 'Meta')
              customer.set(
                'notes',
                'Postback: "' +
                  postbackText +
                  '"\nSender ID: ' +
                  senderId +
                  '\nOrigin: Meta Postback',
              )
              $app.save(customer)
              saveLog(
                globalUserId,
                'diagnostic_log',
                'Novo lead capturado via postback: ' + contactName,
                'Postback: ' + postbackText,
                { customer_id: customer.id, sender_id: senderId },
              )
            } catch (err) {
              saveLog(globalUserId, 'meta_error', 'Falha ao criar lead de postback', String(err), {
                error: String(err),
              })
            }
            continue
          }

          const text = messaging.message
            ? messaging.message.text || 'Nova interacao'
            : 'Nova interacao'
          const contactName = 'Lead-Meta-' + senderId
          let customer = null
          try {
            customer = $app.findFirstRecordByFilter(
              'customers',
              "notes ~ '" + senderId + "' && source = 'Meta'",
            )
          } catch (_) {}

          if (!customer && globalUserId) {
            try {
              const customersCol = $app.findCollectionByNameOrId('customers')
              customer = new Record(customersCol)
              customer.set('user_id', globalUserId)
              customer.set('name', contactName)
              customer.set('status', 'Novo')
              customer.set('source', 'Meta')
              customer.set('notes', 'FB Sender ID: ' + senderId + '\nOrigin: Meta Facebook')
              $app.save(customer)
              saveLog(
                globalUserId,
                'diagnostic_log',
                'Novo lead capturado via Webhook: ' + contactName,
                'Lead originado do Facebook Messenger.',
                { customer_id: customer.id, source: 'Facebook', senderId: senderId },
              )
            } catch (err) {
              saveLog(
                globalUserId,
                'meta_error',
                'Falha ao criar lead do Facebook ID ' + senderId,
                String(err),
                { error: String(err) },
              )
            }
          }

          if (customer) {
            try {
              const conversation = new Record($app.findCollectionByNameOrId('conversations'))
              conversation.set('customer_id', customer.id)
              conversation.set('user_id', globalUserId)
              conversation.set('content', text)
              conversation.set('sender', 'customer')
              $app.save(conversation)
            } catch (err) {
              saveLog(
                globalUserId,
                'meta_error',
                'Erro ao salvar conversa do Facebook',
                String(err),
                { error: String(err) },
              )
            }
          }
        }

        for (const standbyMsg of entry.standby || []) {
          const senderId = standbyMsg.sender ? standbyMsg.sender.id : ''
          if (!senderId) continue
          const text = (standbyMsg.message && standbyMsg.message.text) || 'Mensagem no standby'
          const contactName = 'Lead-Meta-' + senderId
          let customer = null
          try {
            customer = $app.findFirstRecordByFilter(
              'customers',
              "notes ~ '" + senderId + "' && source = 'Meta'",
            )
          } catch (_) {}

          if (!customer) {
            try {
              const customersCol = $app.findCollectionByNameOrId('customers')
              customer = new Record(customersCol)
              customer.set('user_id', globalUserId)
              customer.set('name', contactName)
              customer.set('status', 'Novo')
              customer.set('source', 'Meta')
              customer.set(
                'notes',
                'Standby: "' + text + '"\nSender ID: ' + senderId + '\nOrigin: Meta Standby',
              )
              $app.save(customer)
            } catch (err) {
              saveLog(globalUserId, 'meta_error', 'Falha ao criar lead de standby', String(err), {
                error: String(err),
              })
            }
          }

          if (customer) {
            try {
              const conversation = new Record($app.findCollectionByNameOrId('conversations'))
              conversation.set('customer_id', customer.id)
              conversation.set('user_id', globalUserId)
              conversation.set('content', text)
              conversation.set('sender', 'customer')
              $app.save(conversation)
            } catch (err) {
              saveLog(globalUserId, 'meta_error', 'Erro ao salvar conversa standby', String(err), {
                error: String(err),
              })
            }
          }
        }
      }
    } else if (body.object === 'instagram' && body.entry) {
      for (const entry of body.entry) {
        for (const change of entry.changes || []) {
          if (change.field === 'comments') {
            const value = change.value
            if (!value) continue
            const commentText = value.text || ''
            const commenterName = (value.from && value.from.username) || 'Lead-IG-Comentario'
            const commenterId = (value.from && value.from.id) || ''
            if (!commentText) continue

            try {
              const customersCol = $app.findCollectionByNameOrId('customers')
              const customer = new Record(customersCol)
              customer.set('user_id', globalUserId)
              customer.set('name', commenterName)
              customer.set('status', 'Novo')
              customer.set('source', 'Meta')
              customer.set(
                'notes',
                'Comentario IG: "' +
                  commentText +
                  '"\nCommenter ID: ' +
                  commenterId +
                  '\nOrigin: Instagram Comment',
              )
              $app.save(customer)
              saveLog(
                globalUserId,
                'diagnostic_log',
                'Novo lead via comentario Instagram: ' + commenterName,
                'Comentario: ' + commentText,
                { customer_id: customer.id, commenter_id: commenterId },
              )
            } catch (err) {
              saveLog(
                globalUserId,
                'meta_error',
                'Falha ao criar lead de comentario IG',
                String(err),
                { error: String(err) },
              )
            }
          }
        }

        for (const messaging of entry.messaging || []) {
          const senderId = messaging.sender ? messaging.sender.id : ''
          const recipientId = messaging.recipient ? messaging.recipient.id : ''
          if (!senderId) continue

          const text = messaging.message
            ? messaging.message.text || 'Nova interacao no Instagram'
            : 'Nova interacao no Instagram'
          const contactName = 'Lead-Meta-' + senderId
          let customer = null
          try {
            customer = $app.findFirstRecordByFilter(
              'customers',
              "notes ~ '" + senderId + "' && source = 'Meta'",
            )
          } catch (_) {}

          if (!customer && globalUserId) {
            try {
              const customersCol = $app.findCollectionByNameOrId('customers')
              customer = new Record(customersCol)
              customer.set('user_id', globalUserId)
              customer.set('name', contactName)
              customer.set('status', 'Novo')
              customer.set('source', 'Meta')
              customer.set(
                'notes',
                'IG Sender ID: ' +
                  senderId +
                  '\nIG Recipient ID: ' +
                  (recipientId || '') +
                  '\nOrigin: Meta Instagram',
              )
              $app.save(customer)
              saveLog(
                globalUserId,
                'diagnostic_log',
                'Novo lead capturado via Webhook: ' + contactName,
                'Lead originado do Instagram.',
                { customer_id: customer.id, source: 'Instagram', senderId: senderId },
              )
            } catch (err) {
              saveLog(
                globalUserId,
                'meta_error',
                'Falha ao criar lead do Instagram ID ' + senderId,
                String(err),
                { error: String(err) },
              )
            }
          }

          if (customer) {
            try {
              const conversation = new Record($app.findCollectionByNameOrId('conversations'))
              conversation.set('customer_id', customer.id)
              conversation.set('user_id', globalUserId)
              conversation.set('content', text)
              conversation.set('sender', 'customer')
              $app.save(conversation)
            } catch (err) {
              saveLog(
                globalUserId,
                'meta_error',
                'Erro ao salvar conversa do Instagram',
                String(err),
                { error: String(err) },
              )
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

                let targetUserId = globalUserId
                try {
                  const allUsers = $app.findRecordsByFilter(
                    'users',
                    "meta_pixel_id != ''",
                    '',
                    100,
                    0,
                  )
                  if (receiverPhone) {
                    for (const u of allUsers) {
                      const wpid = u.getString('meta_whatsapp_phone_number_id') || ''
                      if (wpid && receiverPhone.includes(wpid)) {
                        targetUserId = u.id
                        break
                      }
                    }
                  }
                } catch (_) {}

                let contactName = 'Lead-Meta-' + phone
                if (value.contacts && value.contacts.length > 0) {
                  const contact = value.contacts.find(function (c) {
                    return c.wa_id === phone
                  })
                  if (contact && contact.profile && contact.profile.name) {
                    contactName = contact.profile.name
                  }
                }

                let customer = null
                try {
                  const phoneNorm = phone.replace(/\D/g, '')
                  customer = $app.findFirstRecordByFilter(
                    'customers',
                    "phone ~ '" + phoneNorm + "' || phone_1_value ~ '" + phoneNorm + "'",
                  )
                } catch (_) {}

                if (!customer && targetUserId) {
                  try {
                    const customersCol = $app.findCollectionByNameOrId('customers')
                    customer = new Record(customersCol)
                    customer.set('user_id', targetUserId)
                    customer.set('name', contactName)
                    customer.set('phone', phone.replace(/\D/g, ''))

                    let initialStatus = 'Novo'
                    try {
                      const activeCadences = $app.findRecordsByFilter(
                        'cadences',
                        "user_id = '" + targetUserId + "' && is_active = true",
                        'order',
                        1,
                        0,
                      )
                      if (activeCadences.length > 0) {
                        initialStatus = activeCadences[0].getString('title') || 'Novo'
                      }
                    } catch (_) {}
                    customer.set('status', initialStatus)

                    let source = 'Meta'
                    let notes = ''
                    if (msg.referral) {
                      notes =
                        'Origem: Anuncio Meta\nHeadline: ' +
                        (msg.referral.headline || 'N/A') +
                        '\nAd ID: ' +
                        (msg.referral.source_id || 'N/A')
                    }
                    customer.set('source', source)
                    if (notes) customer.set('notes', notes)
                    $app.save(customer)

                    saveLog(
                      targetUserId,
                      'diagnostic',
                      'Novo lead capturado via Webhook: ' + contactName,
                      'Lead originado do telefone ' + phone + '. Origem: ' + source,
                      {
                        customer_id: customer.id,
                        phone: phone,
                        source: source,
                        referral: msg.referral || null,
                      },
                    )
                  } catch (err) {
                    saveLog(
                      targetUserId,
                      'meta_error',
                      'Falha ao criar lead do telefone ' + phone,
                      String(err),
                      { error: String(err), raw_body: body, phone: phone },
                    )
                  }
                }

                if (customer) {
                  let isDuplicate = false
                  try {
                    const recentMsgs = $app.findRecordsByFilter(
                      'conversations',
                      "customer_id = '" +
                        customer.id +
                        "' && sender = 'customer' && content = {:text}",
                      '-created',
                      1,
                      0,
                      { text: text },
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
                    conversation.set('sender', 'customer')
                    $app.save(conversation)

                    saveLog(
                      userId,
                      'WEBHOOK',
                      'Mensagem recebida via Webhook do WhatsApp',
                      'Nova mensagem de cliente processada com sucesso.',
                      { customer_id: customer.id, phone: phone },
                    )
                  }
                } else {
                  saveLog(
                    targetUserId,
                    'meta_error',
                    'Lead ignorado: cliente nao pôde ser criado.',
                    'Telefone: ' + phone,
                  )
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    $app.logger().error('Error processing Meta Webhook', 'err', err)
    saveLog(globalUserId, 'meta_error', 'Falha Critica no Webhook (Catch Global)', String(err), {
      error: String(err),
      raw_body: body,
    })
  }

  return e.json(200, { status: 'ok', message: 'Event received successfully' })
})
