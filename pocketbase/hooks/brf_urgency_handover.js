onRecordAfterUpdateSuccess((e) => {
  const urgency = e.record.getInt('urgency')
  const originalUrgency = e.record.original().getInt('urgency')

  if (urgency >= 4 && originalUrgency < 4) {
    const customerName = e.record.getString('name')
    const customerPhone = e.record.getString('phone')

    const summaryText = `*🚨 Lead Quente! (Urgência ${urgency}) 🚨*\n*Nome:* ${customerName}\n*Telefone:* ${customerPhone}\nSugestão: Realizar handover imediato e priorizar contato.`

    const slackWebhook = $secrets.get('SLACK_WEBHOOK_URL')
    if (slackWebhook) {
      try {
        $http.send({
          url: slackWebhook,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: summaryText, channel: '#leads-sc' }),
          timeout: 10,
        })
      } catch (err) {}
    }

    try {
      const agentPhone = '5548992098050'
      const offerText =
        'Notei que você tem bastante urgência ou uma necessidade específica! Se preferir falar diretamente com um corretor humano, pode chamar o Mauro neste link: wa.me/5548992098050'

      const users = $app.findRecordsByFilter(
        'users',
        "meta_whatsapp_access_token != '' && meta_whatsapp_phone_number_id != ''",
        '',
        1,
        0,
      )

      let sentToBroker = false
      if (users.length > 0) {
        const metaToken = users[0].getString('meta_whatsapp_access_token')
        const metaPhoneId = users[0].getString('meta_whatsapp_phone_number_id')

        $http.send({
          url: `https://graph.facebook.com/v19.0/${metaPhoneId}/messages`,
          method: 'POST',
          headers: { Authorization: `Bearer ${metaToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: agentPhone,
            type: 'text',
            text: { body: summaryText },
          }),
          timeout: 10,
        })
        sentToBroker = true

        if (customerPhone) {
          const customerPhoneClean = customerPhone.replace(/\D/g, '')
          $http.send({
            url: `https://graph.facebook.com/v19.0/${metaPhoneId}/messages`,
            method: 'POST',
            headers: { Authorization: `Bearer ${metaToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: customerPhoneClean,
              type: 'text',
              text: { body: offerText },
            }),
            timeout: 10,
          })

          const reply = new Record($app.findCollectionByNameOrId('conversations'))
          reply.set('user_id', e.record.getString('user_id'))
          reply.set('customer_id', e.record.id)
          reply.set('sender', 'ai')
          reply.set('content', offerText)
          $app.save(reply)
        }
      }

      if (!sentToBroker) {
        const uazapiUrl = $secrets.get('UAZAPI_URL') || ''
        const uazapiKey = $secrets.get('UAZAPI_API_KEY') || ''
        if (uazapiUrl && uazapiKey) {
          const cleanUrl = uazapiUrl.endsWith('/') ? uazapiUrl.slice(0, -1) : uazapiUrl
          let instanceName = '48992098050'
          const source = e.record.getString('source') || ''
          if (source.includes('Uazapi - ')) {
            instanceName = source.replace('Uazapi - ', '').trim()
          }

          $http.send({
            url: `${cleanUrl}/message/sendText/${instanceName}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: uazapiKey },
            body: JSON.stringify({
              number: agentPhone,
              options: { delay: 1000 },
              textMessage: { text: summaryText },
            }),
            timeout: 15,
          })

          if (customerPhone) {
            $http.send({
              url: `${cleanUrl}/message/sendText/${instanceName}`,
              method: 'POST',
              headers: { 'Content-Type': 'application/json', apikey: uazapiKey },
              body: JSON.stringify({
                number: customerPhone,
                options: { delay: 1200 },
                textMessage: { text: offerText },
              }),
              timeout: 15,
            })

            const reply = new Record($app.findCollectionByNameOrId('conversations'))
            reply.set('user_id', e.record.getString('user_id'))
            reply.set('customer_id', e.record.id)
            reply.set('sender', 'ai')
            reply.set('content', offerText)
            $app.save(reply)
          }
        }
      }
    } catch (err) {}
  }

  return e.next()
}, 'customers')
