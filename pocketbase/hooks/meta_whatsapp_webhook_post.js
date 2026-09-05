// Hook para POST /backend/v1/meta_whatsapp_webhook
// Todas as funções e variáveis devem estar inline dentro do callback (regra de escopo do PocketBase JSVM)

routerAdd('POST', '/backend/v1/meta_whatsapp_webhook', (e) => {
  var body = {}
  try {
    body = e.requestInfo().body || {}
  } catch (_) {}

  var query = {}
  try {
    query = e.requestInfo().query || {}
  } catch (_) {}

  var userId = query['user_id'] || query['uid'] || ''

  $app
    .logger()
    .info('Meta WhatsApp Webhook received', 'user_id', userId, 'object', body ? body.object : '')

  var user = null
  if (userId) {
    try {
      user = $app.findRecordById('users', userId)
    } catch (_) {}
  }

  // Se user_id não veio na URL, tentar resolver o usuário por outros dados do webhook da Meta:
  // 1. Phone number ID recebido no metadata (entry.changes.value.metadata.phone_number_id)
  if (!user && body && body.entry) {
    try {
      var receivedPhoneId = ''
      var receivedWabaId = body.entry[0] && body.entry[0].id ? String(body.entry[0].id) : ''

      for (var entryItem of body.entry || []) {
        for (var ch of entryItem.changes || []) {
          if (ch.value && ch.value.metadata && ch.value.metadata.phone_number_id) {
            receivedPhoneId = String(ch.value.metadata.phone_number_id)
            break
          }
        }
        if (receivedPhoneId) break
      }

      if (receivedPhoneId) {
        var usersByPhone = $app.findRecordsByFilter(
          'users',
          'meta_whatsapp_phone_number_id = {:pid}',
          'created',
          2,
          0,
          { pid: receivedPhoneId },
        )
        if (usersByPhone && usersByPhone.length > 0) {
          user = usersByPhone[0]
          userId = user.id
        }
      }

      if (!user && receivedWabaId) {
        var usersByWaba = $app.findRecordsByFilter(
          'users',
          'meta_whatsapp_business_id = {:bid}',
          'created',
          2,
          0,
          { bid: receivedWabaId },
        )
        if (usersByWaba && usersByWaba.length > 0) {
          user = usersByWaba[0]
          userId = user.id
        }
      }
    } catch (_) {}
  }

  // 2. Se ainda não achou e temos exatamente um usuário configurado com WhatsApp
  if (!user) {
    try {
      var allActiveUsers = $app.findRecordsByFilter(
        'users',
        "meta_whatsapp_phone_number_id != '' || meta_whatsapp_verify_token != ''",
        'created',
        2,
        0,
      )
      if (allActiveUsers && allActiveUsers.length === 1) {
        user = allActiveUsers[0]
        userId = user.id
      }
    } catch (_) {}
  }

  if (!user) {
    return e.string(403, 'Forbidden: unable to resolve user for WhatsApp event')
  }

  if (!body || body.object !== 'whatsapp_business_account') {
    return e.string(404, 'Not Found')
  }

  try {
    for (var entry of body.entry || []) {
      for (var change of entry.changes || []) {
        var value = change.value
        if (!value || !value.messages || value.messages.length === 0) continue

        var contacts = value.contacts || []
        var metadata = value.metadata || {}
        var displayPhone = (metadata.display_phone_number || '').replace(/\D/g, '')

        for (var msg of value.messages) {
          var phone = (msg.from || '').replace(/\D/g, '')
          if (!phone) continue

          var content = ''
          if (msg.type === 'text' && msg.text && msg.text.body) {
            content = msg.text.body
          } else if (msg.type === 'audio') {
            content = '[Áudio Recebido]'
          } else if (msg.type === 'image' && msg.image && msg.image.caption) {
            content = msg.image.caption
          } else if (msg.type === 'button' && msg.button && msg.button.text) {
            content = msg.button.text
          } else if (msg.type === 'interactive' && msg.interactive) {
            var it = msg.interactive
            content =
              (it.button_reply && it.button_reply.title) ||
              (it.list_reply && it.list_reply.title) ||
              '[Interação Recebida]'
          } else {
            content = '[' + (msg.type || 'Mensagem') + ' Recebida]'
          }
          if (!content) continue

          var contactInfo = contacts.find(function (c) {
            return c.wa_id === msg.from
          })
          var contactName =
            (contactInfo && contactInfo.profile && contactInfo.profile.name) ||
            (contactInfo && contactInfo.wa_id) ||
            phone

          var customer = null
          try {
            customer = $app.findFirstRecordByFilter(
              'customers',
              'phone ~ {:ph} || phone_1_value ~ {:ph}',
              { ph: phone },
            )
          } catch (_) {}

          var isNewCustomer = false
          if (!customer) {
            try {
              var customersCol = $app.findCollectionByNameOrId('customers')
              customer = new Record(customersCol)
              customer.set('user_id', userId)
              customer.set('name', contactName)
              customer.set('phone', phone)
              customer.set('status', 'Novo')
              var source = 'Meta - WhatsApp Cloud API'
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
              var custToUpdate = $app.findRecordById('customers', customer.id)
              if (!custToUpdate.getString('user_id')) {
                custToUpdate.set('user_id', userId)
                $app.save(custToUpdate)
              }
            } catch (_) {}
          }

          if (isNewCustomer) {
            try {
              var leadsCol = $app.findCollectionByNameOrId('leads')
              var lead = new Record(leadsCol)
              lead.set('assigned_to', userId)
              lead.set('name', contactName)
              lead.set('phone', phone)
              lead.set('source', 'WhatsApp Cloud API')
              lead.set('status', 'Novo')
              var leadNotes = 'Capturado via Meta WhatsApp Cloud API'
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

          var isDuplicate = false
          try {
            var recentMsgs = $app.findRecordsByFilter(
              'conversations',
              "customer_id = {:cid} && sender = 'customer' && content = {:text}",
              '-created',
              1,
              0,
              { cid: customer.id, text: content },
            )
            if (recentMsgs.length > 0) {
              var lastMsg = recentMsgs[0]
              var diffMins =
                (new Date().getTime() - new Date(lastMsg.getString('created')).getTime()) / 60000
              if (diffMins < 2) isDuplicate = true
            }
          } catch (_) {}

          if (!isDuplicate) {
            try {
              var convCol = $app.findCollectionByNameOrId('conversations')
              var newMsg = new Record(convCol)
              newMsg.set('customer_id', customer.id)
              newMsg.set('user_id', userId)
              newMsg.set('sender', 'customer')
              newMsg.set('content', content)
              newMsg.set('channel', 'whatsapp')
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

// Rota complementar com userId no path: POST /backend/v1/meta_whatsapp_webhook/{userId}
routerAdd('POST', '/backend/v1/meta_whatsapp_webhook/{userId}', (e) => {
  var pathUserId = ''
  try {
    pathUserId = e.request.pathValue('userId') || ''
  } catch (_) {}

  var body = {}
  try {
    body = e.requestInfo().body || {}
  } catch (_) {}

  var query = {}
  try {
    query = e.requestInfo().query || {}
  } catch (_) {}

  var userId = pathUserId || query['user_id'] || query['uid'] || ''

  $app
    .logger()
    .info(
      'Meta WhatsApp Webhook received (path userId)',
      'user_id',
      userId,
      'object',
      body ? body.object : '',
    )

  var user = null
  if (userId) {
    try {
      user = $app.findRecordById('users', userId)
    } catch (_) {}
  }

  if (!user && body && body.entry) {
    try {
      var receivedPhoneId = ''
      var receivedWabaId = body.entry[0] && body.entry[0].id ? String(body.entry[0].id) : ''

      for (var entryItem of body.entry || []) {
        for (var ch of entryItem.changes || []) {
          if (ch.value && ch.value.metadata && ch.value.metadata.phone_number_id) {
            receivedPhoneId = String(ch.value.metadata.phone_number_id)
            break
          }
        }
        if (receivedPhoneId) break
      }

      if (receivedPhoneId) {
        var usersByPhone = $app.findRecordsByFilter(
          'users',
          'meta_whatsapp_phone_number_id = {:pid}',
          'created',
          2,
          0,
          { pid: receivedPhoneId },
        )
        if (usersByPhone && usersByPhone.length > 0) {
          user = usersByPhone[0]
          userId = user.id
        }
      }

      if (!user && receivedWabaId) {
        var usersByWaba = $app.findRecordsByFilter(
          'users',
          'meta_whatsapp_business_id = {:bid}',
          'created',
          2,
          0,
          { bid: receivedWabaId },
        )
        if (usersByWaba && usersByWaba.length > 0) {
          user = usersByWaba[0]
          userId = user.id
        }
      }
    } catch (_) {}
  }

  if (!user) {
    try {
      var allActiveUsers = $app.findRecordsByFilter(
        'users',
        "meta_whatsapp_phone_number_id != '' || meta_whatsapp_verify_token != ''",
        'created',
        2,
        0,
      )
      if (allActiveUsers && allActiveUsers.length === 1) {
        user = allActiveUsers[0]
        userId = user.id
      }
    } catch (_) {}
  }

  if (!user) {
    return e.string(403, 'Forbidden: unable to resolve user for WhatsApp event')
  }

  if (!body || body.object !== 'whatsapp_business_account') {
    return e.string(404, 'Not Found')
  }

  try {
    for (var entry of body.entry || []) {
      for (var change of entry.changes || []) {
        var value = change.value
        if (!value || !value.messages || value.messages.length === 0) continue

        var contacts = value.contacts || []
        var metadata = value.metadata || {}
        var displayPhone = (metadata.display_phone_number || '').replace(/\D/g, '')

        for (var msg of value.messages) {
          var phone = (msg.from || '').replace(/\D/g, '')
          if (!phone) continue

          var content = ''
          if (msg.type === 'text' && msg.text && msg.text.body) {
            content = msg.text.body
          } else if (msg.type === 'audio') {
            content = '[Áudio Recebido]'
          } else if (msg.type === 'image' && msg.image && msg.image.caption) {
            content = msg.image.caption
          } else if (msg.type === 'button' && msg.button && msg.button.text) {
            content = msg.button.text
          } else if (msg.type === 'interactive' && msg.interactive) {
            var it = msg.interactive
            content =
              (it.button_reply && it.button_reply.title) ||
              (it.list_reply && it.list_reply.title) ||
              '[Interação Recebida]'
          } else {
            content = '[' + (msg.type || 'Mensagem') + ' Recebida]'
          }
          if (!content) continue

          var contactInfo = contacts.find(function (c) {
            return c.wa_id === msg.from
          })
          var contactName =
            (contactInfo && contactInfo.profile && contactInfo.profile.name) ||
            (contactInfo && contactInfo.wa_id) ||
            phone

          var customer = null
          try {
            customer = $app.findFirstRecordByFilter(
              'customers',
              'phone ~ {:ph} || phone_1_value ~ {:ph}',
              { ph: phone },
            )
          } catch (_) {}

          var isNewCustomer = false
          if (!customer) {
            try {
              var customersCol = $app.findCollectionByNameOrId('customers')
              customer = new Record(customersCol)
              customer.set('user_id', userId)
              customer.set('name', contactName)
              customer.set('phone', phone)
              customer.set('status', 'Novo')
              var source = 'Meta - WhatsApp Cloud API'
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
              var custToUpdate = $app.findRecordById('customers', customer.id)
              if (!custToUpdate.getString('user_id')) {
                custToUpdate.set('user_id', userId)
                $app.save(custToUpdate)
              }
            } catch (_) {}
          }

          if (isNewCustomer) {
            try {
              var leadsCol = $app.findCollectionByNameOrId('leads')
              var lead = new Record(leadsCol)
              lead.set('assigned_to', userId)
              lead.set('name', contactName)
              lead.set('phone', phone)
              lead.set('source', 'WhatsApp Cloud API')
              lead.set('status', 'Novo')
              var leadNotes = 'Capturado via Meta WhatsApp Cloud API'
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

          var isDuplicate = false
          try {
            var recentMsgs = $app.findRecordsByFilter(
              'conversations',
              "customer_id = {:cid} && sender = 'customer' && content = {:text}",
              '-created',
              1,
              0,
              { cid: customer.id, text: content },
            )
            if (recentMsgs.length > 0) {
              var lastMsg = recentMsgs[0]
              var diffMins =
                (new Date().getTime() - new Date(lastMsg.getString('created')).getTime()) / 60000
              if (diffMins < 2) isDuplicate = true
            }
          } catch (_) {}

          if (!isDuplicate) {
            try {
              var convCol = $app.findCollectionByNameOrId('conversations')
              var newMsg = new Record(convCol)
              newMsg.set('customer_id', customer.id)
              newMsg.set('user_id', userId)
              newMsg.set('sender', 'customer')
              newMsg.set('content', content)
              newMsg.set('channel', 'whatsapp')
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
