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

                            $http.send({
                              url: `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${capiToken}`,
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(payload),
                              timeout: 5,
                            })
                          })
                        }
                      }
                    } catch (err) {
                      $app.logger().error('CAPI Error in Webhook', 'err', err)
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
