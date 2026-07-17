routerAdd(
  'POST',
  '/backend/v1/bulk-send-email',
  (e) => {
    const body = e.requestInfo().body || {}
    const user = e.auth

    if (!user) return e.unauthorizedError('Usuário não autenticado')

    const customerIds = body.customer_ids || []
    const subject = (body.subject || '').trim()
    const emailBody = (body.body || '').trim()

    if (!customerIds.length) return e.badRequestError('Nenhum cliente selecionado')
    if (!subject) return e.badRequestError('O assunto é obrigatório')
    if (!emailBody) return e.badRequestError('O corpo da mensagem é obrigatório')

    const senderName = user.getString('name') || 'BRF Imóveis'
    const pixelId = user.getString('meta_pixel_id') || user.getString('meta_dataset_id')
    const capiToken = user.getString('meta_capi_token')
    const websiteUrl = user.getString('website_url') || 'https://www.brfimoveis.com.br'

    let sent = 0
    let failed = 0
    const errors = []
    const capiEvents = []
    const mailClient = $app.newMailClient()
    const nowSec = Math.floor(Date.now() / 1000)

    for (let i = 0; i < customerIds.length; i++) {
      const customerId = customerIds[i]

      let customer
      try {
        customer = $app.findRecordById('customers', customerId)
      } catch (_) {
        failed++
        errors.push({ id: customerId, error: 'Cliente não encontrado' })
        continue
      }

      if (customer.getString('user_id') !== user.id) {
        failed++
        errors.push({ id: customerId, error: 'Acesso negado a este cliente' })
        continue
      }

      const email = customer.getString('email') || customer.getString('email_1_value')
      if (!email || !email.trim()) {
        failed++
        errors.push({ id: customerId, error: 'Cliente sem endereço de email' })
        continue
      }

      const cleanEmail = email.trim()
      const customerName = customer.getString('name') || 'Cliente'
      const firstNameVal =
        customer.getString('first_name') || (customerName ? customerName.split(' ')[0] : '')
      const phoneVal = customer.getString('phone') || customer.getString('phone_1_value') || ''

      let personalizedBody = emailBody
      personalizedBody = personalizedBody.replace(/\{\{name\}\}/g, customerName)
      personalizedBody = personalizedBody.replace(/\{\{first_name\}\}/g, firstNameVal)
      personalizedBody = personalizedBody.replace(/\{\{email\}\}/g, cleanEmail)
      personalizedBody = personalizedBody.replace(/\{\{phone\}\}/g, phoneVal)

      const htmlBody =
        '<div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">' +
        '<p>Olá ' +
        customerName +
        ',</p>' +
        "<div style='white-space: pre-wrap; line-height: 1.6;'>" +
        personalizedBody +
        '</div>' +
        "<br><p style='color: #888; font-size: 12px;'>Enviado via BRF Imóveis CRM</p>" +
        '</div>'

      try {
        const message = new MailMessage({
          from: { name: senderName, address: 'noreply@brfimoveis.com.br' },
          to: [{ name: customerName, address: cleanEmail }],
          subject: subject,
          html: htmlBody,
        })
        mailClient.send(message)
        sent++
      } catch (err) {
        failed++
        errors.push({ id: customerId, error: err.message })
        continue
      }

      try {
        const convCol = $app.findCollectionByNameOrId('conversations')
        const conv = new Record(convCol)
        conv.set('customer_id', customerId)
        conv.set(
          'content',
          '📧 ' +
            subject +
            '\n\n' +
            personalizedBody
              .replace(/<[^>]*>/g, '')
              .replace(/&nbsp;/g, ' ')
              .trim(),
        )
        conv.set('sender', 'agent')
        $app.save(conv)
      } catch (err) {
        $app
          .logger()
          .error(
            'Failed to log bulk email conversation',
            'error',
            err.message,
            'customer',
            customerId,
          )
      }

      if (pixelId && capiToken) {
        const userData = {
          external_id: [$security.sha256(customerId)],
          client_ip_address: '192.168.1.1',
          client_user_agent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 SkipCloud/1.0',
        }
        userData.em = [$security.sha256(cleanEmail.toLowerCase())]
        if (phoneVal) {
          let cleanPhone = phoneVal.replace(/\D/g, '')
          if (cleanPhone.length === 10 || cleanPhone.length === 11) cleanPhone = '55' + cleanPhone
          userData.ph = [$security.sha256(cleanPhone)]
        }
        if (firstNameVal) {
          const fnNorm = firstNameVal.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          userData.fn = [$security.sha256(fnNorm.trim().toLowerCase())]
        }
        const lnRaw = customerName ? customerName.split(' ').slice(1).join(' ') : ''
        if (lnRaw) {
          const lnNorm = lnRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          userData.ln = [$security.sha256(lnNorm.trim().toLowerCase())]
        }

        capiEvents.push({
          event_name: 'Contact',
          event_time: nowSec,
          action_source: 'website',
          event_source_url: websiteUrl,
          event_id: customerId + '_Contact_email_' + nowSec + '_' + i,
          user_data: userData,
          custom_data: { contact_method: 'email', subject: subject },
        })
      }
    }

    if (capiEvents.length > 0 && pixelId && capiToken) {
      try {
        const capiUrl = 'https://graph.facebook.com/v21.0/' + pixelId + '/events'
        const capiRes = $http.send({
          url: capiUrl,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + capiToken },
          body: JSON.stringify({ data: capiEvents }),
          timeout: 15,
        })
        if (capiRes.statusCode >= 400) {
          $app
            .logger()
            .warn(
              'CAPI bulk email events failed',
              'status',
              capiRes.statusCode,
              'count',
              capiEvents.length,
            )
        }
      } catch (capiErr) {
        $app.logger().error('CAPI bulk email request failed', 'error', capiErr.message)
      }
    }

    return e.json(200, {
      success: true,
      sent: sent,
      failed: failed,
      errors: errors,
      message:
        sent + ' email(s) enviado(s) com sucesso' + (failed > 0 ? ', ' + failed + ' falha(s)' : ''),
    })
  },
  $apis.requireAuth(),
)
