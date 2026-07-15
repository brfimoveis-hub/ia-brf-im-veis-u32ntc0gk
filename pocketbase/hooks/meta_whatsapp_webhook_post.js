routerAdd('POST', '/backend/v1/meta_whatsapp_webhook', (e) => {
  const body = e.requestInfo().body || {}
  const query = e.requestInfo().query || {}
  const userId = query['user_id'] || query['uid'] || ''

  $app.logger().info('Meta WhatsApp Webhook received', 'user_id', userId, 'object', body.object)

  if (!userId) {
    return e.string(400, 'Missing user_id')
  }

  let user = null
  try {
    user = $app.findRecordById('users', userId)
  } catch (_) {}
  if (!user) {
    return e.string(403, 'Forbidden')
  }

  if (!body || body.object !== 'whatsapp_business_account') {
    return e.string(404, 'Not Found')
  }

  try {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value
        if (!value || !value.messages || value.messages.length === 0) continue

        const contacts = value.contacts || []
        const metadata = value.metadata || {}
        const displayPhone = (metadata.display_phone_number || '').replace(/\D/g, '')

        for (const msg of value.messages) {
          const phone = (msg.from || '').replace(/\D/g, '')
          if (!phone) continue

          let content = ''
          if (msg.type === 'text' && msg.text && msg.text.body) {
            content = msg.text.body
          } else if (msg.type === 'audio') {
            content = '[Áudio Recebido]'
          } else if (msg.type === 'image' && msg.image && msg.image.caption) {
            content = msg.image.caption
          } else if (msg.type === 'button' && msg.button && msg.button.text) {
            content = msg.button.text
          } else if (msg.type === 'interactive' && msg.interactive) {
            const it = msg.interactive
            content =
              (it.button_reply && it.button_reply.title) ||
              (it.list_reply && it.list_reply.title) ||
              '[Interação Recebida]'
          } else {
            content = '[' + (msg.type || 'Mensagem') + ' Recebida]'
          }
          if (!content) continue

          const contactInfo = contacts.find((c) => c.wa_id === msg.from)
          const contactName =
            (contactInfo && contactInfo.profile && contactInfo.profile.name) ||
            (contactInfo && contactInfo.wa_id) ||
            phone

          let customer = null
          try {
            customer = $app.findFirstRecordByFilter(
              'customers',
              `phone ~ '${phone}' || phone_1_value ~ '${phone}'`,
            )
          } catch (_) {}

          let isNewCustomer = false
          if (!customer) {
            try {
              const customersCol = $app.findCollectionByNameOrId('customers')
              customer = new Record(customersCol)
              customer.set('user_id', userId)
              customer.set('name', contactName)
              customer.set('phone', phone)
              customer.set('status', 'Novo')
              let source = 'Meta - WhatsApp Cloud API'
              if (displayPhone) source += ' (' + displayPhone + ')'
              customer.set('source', source)
              if (msg.referral) {
                customer.set(
                  'notes',
                  'Origem: Anúncio Meta\nHeadline: ' +
                    (msg.referral.headline || 'N/A') +
                    '\nAd ID: ' +
                    (msg.referral.source_id || 'N/A'),
                )
              }
              $app.save(customer)
              isNewCustomer = true
            } catch (err) {
              $app
                .logger()
                .error('Failed to create customer from WhatsApp webhook', 'error', String(err))
              continue
            }
          } else {
            try {
              const custToUpdate = $app.findRecordById('customers', customer.id)
              if (!custToUpdate.getString('user_id')) {
                custToUpdate.set('user_id', userId)
                $app.save(custToUpdate)
              }
            } catch (_) {}
          }

          if (isNewCustomer) {
            try {
              const leadsCol = $app.findCollectionByNameOrId('leads')
              const lead = new Record(leadsCol)
              lead.set('assigned_to', userId)
              lead.set('name', contactName)
              lead.set('phone', phone)
              lead.set('source', 'WhatsApp Cloud API')
              lead.set('status', 'Novo')
              let leadNotes = 'Capturado via Meta WhatsApp Cloud API'
              if (displayPhone) leadNotes += ' - ' + displayPhone
              leadNotes += '\nMensagem: ' + content
              lead.set('notes', leadNotes)
              $app.save(lead)
            } catch (err) {
              $app
                .logger()
                .error('Failed to create lead from WhatsApp webhook', 'error', String(err))
            }
          }

          let isDuplicate = false
          try {
            const recentMsgs = $app.findRecordsByFilter(
              'conversations',
              `customer_id = '${customer.id}' && sender = 'customer' && content = {:text}`,
              '-created',
              1,
              0,
              { text: content },
            )
            if (recentMsgs.length > 0) {
              const lastMsg = recentMsgs[0]
              const diffMins =
                (new Date().getTime() - new Date(lastMsg.getString('created')).getTime()) / 60000
              if (diffMins < 2) isDuplicate = true
            }
          } catch (_) {}

          if (!isDuplicate) {
            try {
              const convCol = $app.findCollectionByNameOrId('conversations')
              const newMsg = new Record(convCol)
              newMsg.set('customer_id', customer.id)
              newMsg.set('sender', 'customer')
              newMsg.set('content', content)
              $app.save(newMsg)
            } catch (err) {
              $app
                .logger()
                .error('Failed to save conversation from WhatsApp webhook', 'error', String(err))
            }
          }
        }
      }
    }
  } catch (err) {
    $app.logger().error('Error processing WhatsApp Webhook', 'error', String(err))
  }

  return e.string(200, 'EVENT_RECEIVED')
})
