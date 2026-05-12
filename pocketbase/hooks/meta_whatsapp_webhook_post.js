routerAdd('POST', '/backend/v1/webhook/whatsapp', (e) => {
  const body = e.requestInfo().body

  $app.logger().info('Meta WhatsApp Webhook received', 'body', JSON.stringify(body))

  if (body && body.object === 'whatsapp_business_account') {
    try {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.value && change.value.messages) {
            for (const msg of change.value.messages) {
              const phone = change.value.contacts?.[0]?.wa_id || msg.from
              let content = msg.text?.body || ''

              if (!content) continue

              let customerId = ''
              let userId = ''
              try {
                const customer = $app.findFirstRecordByData('customers', 'phone', phone)
                customerId = customer.id
                const users = $app.findRecordsByFilter('users', "id != ''", '-created', 1, 0)
                if (users.length > 0) userId = users[0].id
              } catch (err) {
                const customersCol = $app.findCollectionByNameOrId('customers')
                const newCustomer = new Record(customersCol)
                newCustomer.set('phone', phone)
                newCustomer.set('name', change.value.contacts?.[0]?.profile?.name || phone)
                newCustomer.set('status', 'Lead Novo')
                newCustomer.set('source', 'Meta - WhatsApp')
                $app.save(newCustomer)
                customerId = newCustomer.id
                const users = $app.findRecordsByFilter('users', "id != ''", '-created', 1, 0)
                if (users.length > 0) userId = users[0].id
              }

              if (customerId) {
                const convCol = $app.findCollectionByNameOrId('conversations')
                const newMsg = new Record(convCol)
                newMsg.set('customer_id', customerId)
                if (userId) newMsg.set('user_id', userId)
                newMsg.set('sender', 'customer')
                newMsg.set('content', content)
                $app.save(newMsg)
              }
            }
          }
        }
      }
    } catch (err) {
      $app.logger().error('Error processing WhatsApp Webhook', 'error', String(err))
    }
    return e.string(200, 'EVENT_RECEIVED')
  }

  return e.string(404, 'Not Found')
})
