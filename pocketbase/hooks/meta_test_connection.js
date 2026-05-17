routerAdd(
  'POST',
  '/backend/v1/meta_test_connection',
  (e) => {
    const body = e.requestInfo().body || {}
    const { business_id, phone_number_id, access_token } = body

    if (!business_id || !phone_number_id || !access_token) {
      return e.badRequestError(
        'Os campos Business ID, Phone Number ID e Access Token são obrigatórios.',
      )
    }

    // Verify the credentials with a Graph API call
    // Added ?fields to correctly request the WhatsApp phone number node without "Unsupported get request"
    const res = $http.send({
      url:
        'https://graph.facebook.com/v21.0/' +
        phone_number_id +
        '?fields=display_phone_number,name,quality_rating',
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + access_token,
        'Content-Type': 'application/json',
      },
      timeout: 15,
    })

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return e.json(200, { status: 'connected', data: res.json })
    } else {
      const errorMsg = res.json?.error?.message || 'Erro ao validar credenciais na Meta API.'

      if (
        errorMsg.includes('Unsupported get request') ||
        errorMsg.includes('Object with ID does not exist')
      ) {
        return e.badRequestError(
          'O Phone Number ID pode estar incorreto ou o Access Token não possui as permissões whatsapp_business_management ou whatsapp_business_messaging.',
        )
      }

      return e.badRequestError(errorMsg)
    }
  },
  $apis.requireAuth(),
)
