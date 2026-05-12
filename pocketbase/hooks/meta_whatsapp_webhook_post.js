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

              if (msg.type === 'audio' && msg.audio?.id) {
                try {
                  const usersToken = $app.findRecordsByFilter('users', "meta_whatsapp_access_token != ''", '-created', 1, 0)
                  const metaToken = usersToken.length > 0 ? usersToken[0].getString('meta_whatsapp_access_token') : null
                  if (metaToken) {
                    const mediaInfo = $http.send({
                      url: `https://graph.facebook.com/v19.0/${msg.audio.id}`,
                      method: 'GET',
                      headers: { 'Authorization': `Bearer ${metaToken}` }
                    })
                    if (mediaInfo.statusCode === 200 && mediaInfo.json?.url) {
                      const audioData = $http.send({
                        url: mediaInfo.json.url,
                        method: 'GET',
                        headers: { 'Authorization': `Bearer ${metaToken}` }
                      })
                      if (audioData.statusCode === 200 && audioData.body) {
                        const openAiKey = $secrets.get('OPENAI_API_KEY')
                        if (openAiKey) {
                          const boundary = '----Boundary' + $security.randomString(16)
                          const headerStr = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.ogg"\r\nContent-Type: audio/ogg\r\n\r\n`
                          const footerStr = `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n--${boundary}--\r\n`
                          
                          const headerBytes = new Uint8Array(headerStr.length)
                          for(let i=0; i<headerStr.length; i++) headerBytes[i] = headerStr.charCodeAt(i)
                          const footerBytes = new Uint8Array(footerStr.length)
                          for(let i=0; i<footerStr.length; i++) footerBytes[i] = footerStr.charCodeAt(i)
                          
                          const bodyBytes = new Uint8Array(headerBytes.length + audioData.body.length + footerBytes.length)
                          bodyBytes.set(headerBytes, 0)
                          bodyBytes.set(audioData.body, headerBytes.length)
                          bodyBytes.set(footerBytes, headerBytes.length + audioData.body.length)
                          
                          const whisperRes = $http.send({
                            url: 'https://api.openai.com/v1/audio/transcriptions',
                            method: 'POST',
                            headers: {
                              'Content-Type': `multipart/form-data; boundary=${boundary}`,
                              'Authorization': `Bearer ${openAiKey}`
                            },
                            body: bodyBytes.buffer
                          })
                          if (whisperRes.statusCode === 200 && whisperRes.json?.text) {
                            content = whisperRes.json.text
                          } else {
                            content = "[Áudio Recebido - Não foi possível transcrever]"
                          }
                        } else {
                          content = "[Áudio Recebido]"
                        }
                      }
                    }
                  }
                } catch (e) {
                  $app.logger().error('Audio processing failed', 'error', String(e))
                  content = "[Áudio Recebido]"
                }
              }

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
              } else {
                try {
                  const custToUpdate = $app.findRecordById('customers', customerId)
                  $app.save(custToUpdate)
                } catch(e) {}
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
