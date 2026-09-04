routerAdd(
  'POST',
  '/backend/v1/instagram/test_connection',
  (e) => {
    const userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    const user = $app.findRecordById('users', userId)
    const businessId = user.getString('meta_instagram_business_id')
    const pageToken = user.getString('meta_instagram_page_token')

    if (!businessId && !pageToken) {
      return e.badRequestError('Instagram Business ID e Page Token não configurados')
    }
    if (businessId && !pageToken) {
      return e.badRequestError('Instagram Business ID configurado, aguardando Page Token')
    }
    if (!businessId && pageToken) {
      return e.badRequestError('Page Token informado, aguardando Instagram Business ID')
    }

    const res = $http.send({
      url: 'https://graph.facebook.com/v22.0/' + businessId + '?fields=id,name,username',
      method: 'GET',
      headers: { Authorization: 'Bearer ' + pageToken },
      timeout: 15,
    })

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return e.json(200, { status: 'connected', data: res.json })
    } else {
      var errMsg = 'Falha ao validar conexao Instagram'
      try {
        errMsg = (res.json && res.json.error && res.json.error.message) || errMsg
      } catch (_) {}
      return e.badRequestError(errMsg)
    }
  },
  $apis.requireAuth(),
)
