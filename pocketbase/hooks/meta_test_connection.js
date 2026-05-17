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
    const res = $http.send({
      url: 'https://graph.facebook.com/v19.0/' + phone_number_id,
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
      return e.badRequestError(errorMsg)
    }
  },
  $apis.requireAuth(),
)
