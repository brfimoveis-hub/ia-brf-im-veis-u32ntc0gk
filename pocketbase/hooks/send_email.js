routerAdd(
  'POST',
  '/backend/v1/send-email',
  (e) => {
    const body = e.requestInfo().body || {}
    const user = e.auth

    if (!user) return e.unauthorizedError('Usuário não autenticado')

    const customerId = body.customer_id
    const subject = (body.subject || '').trim()
    const messageBody = (body.body || '').trim()

    if (!customerId) return e.badRequestError('customer_id é obrigatório')
    if (!subject) return e.badRequestError('O assunto é obrigatório')
    if (!messageBody) return e.badRequestError('O corpo da mensagem é obrigatório')

    let customer
    try {
      customer = $app.findRecordById('customers', customerId)
    } catch (_) {
      return e.notFoundError('Cliente não encontrado')
    }

    if (customer.getString('user_id') !== user.id) {
      return e.forbiddenError('Acesso negado a este cliente')
    }

    const email = customer.getString('email') || customer.getString('email_1_value')
    if (!email || !email.trim()) {
      return e.badRequestError('Este cliente não possui um endereço de email válido.')
    }

    const cleanEmail = email.trim()
    const customerName = customer.getString('name') || 'Cliente'
    const senderName = user.getString('name') || 'BRF Imóveis'
    const firstNameVal =
      customer.getString('first_name') || (customerName ? customerName.split(' ')[0] : '')
    const phoneVal = customer.getString('phone') || customer.getString('phone_1_value') || ''

    let personalizedBody = messageBody
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
      const mailClient = $app.newMailClient()
      const message = new MailMessage({
        from: { name: senderName, address: 'noreply@brfimoveis.com.br' },
        to: [{ name: customerName, address: cleanEmail }],
        subject: subject,
        html: htmlBody,
      })
      mailClient.send(message)
    } catch (err) {
      $app
        .logger()
        .error('Email send failed', 'error', err.message, 'customer', customerId, 'to', cleanEmail)
      return e.json(500, {
        success: false,
        error: 'Falha ao enviar email: ' + err.message,
      })
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
        .error('Failed to log email conversation', 'error', err.message, 'customer', customerId)
    }

    const pixelId = user.getString('meta_pixel_id') || user.getString('meta_dataset_id')
    const capiToken = user.getString('meta_capi_token')

    if (pixelId && capiToken) {
      try {
        const userData = {
          external_id: [$security.sha256(customer.id)],
          client_ip_address: '192.168.1.1',
          client_user_agent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SkipCloud/1.0',
        }

        userData.em = [$security.sha256(cleanEmail.toLowerCase())]

        const phone = customer.getString('phone') || customer.getString('phone_1_value')
        if (phone) {
          let cleanPhone = phone.replace(/\D/g, '')
          if (cleanPhone.length === 10 || cleanPhone.length === 11) {
            cleanPhone = '55' + cleanPhone
          }
          userData.ph = [$security.sha256(cleanPhone)]
        }

        const fnRaw =
          customer.getString('first_name') || (customerName ? customerName.split(' ')[0] : '')
        if (fnRaw) {
          const fn = fnRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          userData.fn = [$security.sha256(fn.trim().toLowerCase())]
        }

        const lnRaw = customerName ? customerName.split(' ').slice(1).join(' ') : ''
        if (lnRaw) {
          const ln = lnRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          userData.ln = [$security.sha256(ln.trim().toLowerCase())]
        }

        const capiPayload = {
          data: [
            {
              event_name: 'Contact',
              event_time: Math.floor(Date.now() / 1000),
              action_source: 'website',
              event_source_url: user.getString('website_url') || 'https://www.brfimoveis.com.br',
              event_id: customer.id + '_Contact_email_' + Math.floor(Date.now() / 1000),
              user_data: userData,
              custom_data: {
                contact_method: 'email',
                subject: subject,
              },
            },
          ],
        }

        const capiUrl = 'https://graph.facebook.com/v21.0/' + pixelId + '/events'
        const capiRes = $http.send({
          url: capiUrl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + capiToken,
          },
          body: JSON.stringify(capiPayload),
          timeout: 10,
        })

        if (capiRes.statusCode >= 400) {
          $app
            .logger()
            .warn(
              'CAPI Contact event from email failed',
              'status',
              capiRes.statusCode,
              'customer',
              customerId,
            )
        }
      } catch (capiErr) {
        $app.logger().error('CAPI Contact event error (email)', 'error', capiErr.message)
      }
    }

    return e.json(200, {
      success: true,
      message: 'Email enviado com sucesso',
      recipient: cleanEmail,
    })
  },
  $apis.requireAuth(),
)
