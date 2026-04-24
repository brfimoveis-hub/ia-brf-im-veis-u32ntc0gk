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
    if (body.object === 'whatsapp_business_account' && body.entry) {
      for (const entry of body.entry) {
        for (const change of entry.changes || []) {
          const value = change.value
          if (value && value.messages && value.messages.length > 0) {
            for (const msg of value.messages) {
              if (msg.type === 'text' && msg.text && msg.text.body) {
                const phone = msg.from
                const text = msg.text.body

                let customer = null
                try {
                  const phoneNorm = phone.replace(/\D/g, '')
                  customer = $app.findFirstRecordByFilter(
                    'customers',
                    `phone ~ '${phoneNorm}' || phone_1_value ~ '${phoneNorm}'`,
                  )
                } catch (_) {}

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
                    .warn('Customer not found for incoming WhatsApp message', 'phone', phone)
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
