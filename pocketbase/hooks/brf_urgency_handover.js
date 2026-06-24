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
      const users = $app.findRecordsByFilter(
        'users',
        "meta_whatsapp_access_token != '' && meta_whatsapp_phone_number_id != ''",
        '',
        1,
        0,
      )
      if (users.length > 0) {
        const metaToken = users[0].getString('meta_whatsapp_access_token')
        const metaPhoneId = users[0].getString('meta_whatsapp_phone_number_id')
        const agentPhone = '5548992098050'

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
      }
    } catch (err) {}
  }

  return e.next()
}, 'customers')
