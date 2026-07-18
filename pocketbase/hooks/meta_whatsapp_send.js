routerAdd(
  'POST',
  '/backend/v1/meta-whatsapp/send',
  (e) => {
    const body = e.requestInfo().body || {}
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const user = $app.findRecordById('users', userId)
    const phoneNumberId = user.getString('meta_whatsapp_phone_number_id')
    const accessToken = user.getString('meta_whatsapp_access_token')

    if (!phoneNumberId || !accessToken) {
      return e.badRequestError('Credenciais do Meta WhatsApp nao configuradas')
    }

    const recipients = body.recipients || []
    const message = (body.message || '').trim()

    if (!message) return e.badRequestError('Mensagem e obrigatoria')
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return e.badRequestError('Selecione ao menos um destinatario')
    }
    if (recipients.length > 1000) {
      return e.badRequestError('Maximo de 1000 destinatarios por envio')
    }

    const results = []
    let success = 0
    let failed = 0

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i]
      let phone = (r.phone || '').replace(/[^0-9]/g, '')
      if (phone.length === 10 || phone.length === 11) phone = '55' + phone
      if (!phone) {
        results.push({
          phone: r.phone || '',
          name: r.name || '',
          status: 'failed',
          error: 'Numero invalido',
        })
        failed++
        continue
      }

      try {
        const res = $http.send({
          url: 'https://graph.facebook.com/v18.0/' + phoneNumberId + '/messages',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + accessToken,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone,
            type: 'text',
            text: { body: message },
          }),
          timeout: 30,
        })

        if (res.statusCode === 200) {
          results.push({ phone: phone, name: r.name || '', status: 'sent' })
          success++
        } else {
          let errMsg = 'Erro desconhecido'
          try {
            errMsg = res.json.error.message || errMsg
          } catch (_) {}
          results.push({ phone: phone, name: r.name || '', status: 'failed', error: errMsg })
          failed++
        }
      } catch (err) {
        results.push({ phone: phone, name: r.name || '', status: 'failed', error: 'Erro de rede' })
        failed++
      }
    }

    try {
      const col = $app.findCollectionByNameOrId('system_logs')
      const log = new Record(col)
      log.set('type', 'whatsapp_send')
      log.set('message', 'WhatsApp: ' + success + ' enviadas, ' + failed + ' falharam')
      log.set('payload', { total: recipients.length, success: success, failed: failed })
      $app.save(log)
    } catch (_) {}

    return e.json(200, {
      success: success,
      failed: failed,
      total: recipients.length,
      results: results,
    })
  },
  $apis.requireAuth(),
)
