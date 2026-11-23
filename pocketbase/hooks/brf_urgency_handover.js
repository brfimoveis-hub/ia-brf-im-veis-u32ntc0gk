onRecordAfterUpdateSuccess((e) => {
  const urgency = e.record.getInt('urgency')
  const originalUrgency = e.record.original().getInt('urgency')

  if (urgency >= 4 && originalUrgency < 4) {
    const customerName = e.record.getString('name')
    const customerPhone = e.record.getString('phone')

    // GUARDA: nunca agir sobre o próprio Mauro (contato 554899728050) — evita
    // notificação de si mesmo e loop de auto-atendimento.
    const isMauroSelf = (customerPhone || '').replace(/\D/g, '').endsWith('999728050')
    if (isMauroSelf) {
      console.log('[URGENCY_HANDOVER] Escalonamento ignorado: o contato é o próprio Mauro.')
      return e.next()
    }

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
      const brokerPhone = '554899728050'
      // CORREÇÃO VAZA-TELEFONES (estrutural 1): o texto ao cliente NUNCA
      // menciona o telefone pessoal do Mauro nem oferece contato direto.
      // O escalonamento continua: o Mauro é notificado (mensagem somente dele)
      // e o cliente recebe apenas um aviso neutro de que o corretor fará o contato.
      const offerText =
        'Vou pedir para o corretor Mauro entrar em contato com o senhor em breve. Enquanto isso, pode continuar falando comigo por aqui.'

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

        // APPSECRET_PROOF (v0.0.1425): "Require App Secret" ativo no app Meta
        // exige a assinatura em TODO POST de envio para a Cloud API.
        // Credenciais: meta_app_secret do usuário -> meta_instagram_app_secret
        // -> env META_APP_SECRET (mesmo rito de meta_messenger_save_and_subscribe).
        let waSecret = ''
        try {
          waSecret = (users[0].getString('meta_app_secret') || '').trim()
          if (!waSecret) waSecret = (users[0].getString('meta_instagram_app_secret') || '').trim()
        } catch (_) {}
        if (!waSecret) {
          try {
            waSecret = String($os.getenv('META_APP_SECRET') || '').trim()
          } catch (_) {}
        }
        const waProof = (accessToken) => {
          if (!waSecret || !accessToken) return ''
          try {
            return '?appsecret_proof=' + $security.hs256(String(accessToken), waSecret)
          } catch (_) {
            return ''
          }
        }

        $http.send({
          url: `https://graph.facebook.com/v21.0/${metaPhoneId}/messages${waProof(metaToken)}`,
          method: 'POST',
          headers: { Authorization: `Bearer ${metaToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: brokerPhone,
            type: 'text',
            text: { body: summaryText },
          }),
          timeout: 10,
        })
        sentToBroker = true

        if (customerPhone) {
          let customerPhoneClean = customerPhone.replace(/\D/g, '')
          if (customerPhoneClean.length === 10 || customerPhoneClean.length === 11) {
            customerPhoneClean = '55' + customerPhoneClean
          }
          $http.send({
            url: `https://graph.facebook.com/v21.0/${metaPhoneId}/messages${waProof(metaToken)}`,
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
    } catch (err) {}
  }

  return e.next()
}, 'customers')
