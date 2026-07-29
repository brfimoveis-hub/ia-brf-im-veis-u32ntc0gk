routerAdd('POST', '/backend/v1/instagram/webhook', (e) => {
  const body = e.requestInfo().body || {}
  const query = e.requestInfo().query || {}
  const userId = query['user_id'] || query['uid'] || ''

  if (!userId) return e.string(400, 'Missing user_id')

  let user = null
  try {
    user = $app.findRecordById('users', userId)
  } catch (_) {}
  if (!user) return e.string(403, 'Forbidden')

  if (!body || body.object !== 'instagram') return e.string(404, 'Not Found')

  try {
    for (const entry of body.entry || []) {
      for (const messaging of entry.messaging || []) {
        const senderId = messaging.sender ? messaging.sender.id : ''
        const recipientId = messaging.recipient ? messaging.recipient.id : ''
        if (!senderId) continue

        const text = messaging.message
          ? messaging.message.text || '[Mensagem Recebida]'
          : '[Mensagem Recebida]'
        if (!text) continue

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
            customer.set('user_id', userId)
            customer.set('name', 'Lead-Instagram-' + senderId.substring(0, 8))
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
          } catch (err) {
            $app
              .logger()
              .error('Failed to create customer from Instagram webhook', 'error', String(err))
            continue
          }
        }

        let isDuplicate = false
        try {
          const recentMsgs = $app.findRecordsByFilter(
            'conversations',
            "customer_id = '" + customer.id + "' && sender = 'customer' && content = {:text}",
            '-created',
            1,
            0,
            { text: text },
          )
          if (recentMsgs.length > 0) {
            const diffMins =
              (new Date().getTime() - new Date(recentMsgs[0].getString('created')).getTime()) /
              60000
            if (diffMins < 2) isDuplicate = true
          }
        } catch (_) {}

        if (!isDuplicate) {
          try {
            const convCol = $app.findCollectionByNameOrId('conversations')
            const newMsg = new Record(convCol)
            newMsg.set('customer_id', customer.id)
            newMsg.set('user_id', userId)
            newMsg.set('sender', 'customer')
            newMsg.set('content', text)
            newMsg.set('channel', 'instagram')
            $app.save(newMsg)
          } catch (err) {
            $app
              .logger()
              .error('Failed to save conversation from Instagram webhook', 'error', String(err))
          }
        }
      }
    }
  } catch (err) {
    $app.logger().error('Error processing Instagram Webhook', 'error', String(err))
  }

  return e.string(200, 'EVENT_RECEIVED')
})
