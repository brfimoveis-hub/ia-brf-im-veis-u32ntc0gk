routerAdd(
  'POST',
  '/backend/v1/diagnostic_whatsapp_webhook',
  (e) => {
    let userRecord = null
    try {
      userRecord = $app.findRecordById('users', e.auth.id)
    } catch (_) {}

    if (!userRecord) {
      return e.json(200, { success: false, error: 'Usuário não encontrado.' })
    }

    const verifyToken = userRecord.getString('meta_whatsapp_verify_token')
    const businessId = userRecord.getString('meta_whatsapp_business_id')
    const accessToken = userRecord.getString('meta_whatsapp_access_token')

    if (!verifyToken) {
      return e.json(200, {
        success: false,
        error: 'Verify Token do webhook não configurado.',
      })
    }

    if (businessId && accessToken) {
      try {
        const res = $http.send({
          url: 'https://graph.facebook.com/v21.0/' + businessId + '/subscribed_apps',
          method: 'GET',
          headers: { Authorization: 'Bearer ' + accessToken },
          timeout: 15,
        })

        if (res.statusCode >= 200 && res.statusCode < 300) {
          var data = (res.json && res.json.data) || []
          return e.json(200, {
            success: true,
            subscriptions: data.length,
            message:
              data.length > 0
                ? 'Webhook ativo — ' + data.length + ' inscrição(ões) registrada(s).'
                : 'Verify Token configurado, mas nenhuma inscrição de webhook encontrada na Meta.',
            partial: data.length === 0,
          })
        }
      } catch (_) {}
    }

    return e.json(200, {
      success: true,
      message: 'Verify Token configurado. Não foi possível verificar a inscrição via Graph API.',
      partial: true,
    })
  },
  $apis.requireAuth(),
)
