routerAdd(
  'POST',
  '/backend/v1/messenger/test_connection',
  (e) => {
    const userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    const user = $app.findRecordById('users', userId)
    const pageToken = user.getString('meta_page_access_token')

    if (!pageToken) {
      return e.badRequestError('Page Access Token nao configurado. Conecte o Instagram primeiro.')
    }

    const res = $http.send({
      url: 'https://graph.facebook.com/v22.0/me?fields=id,name',
      method: 'GET',
      headers: { Authorization: 'Bearer ' + pageToken },
      timeout: 15,
    })

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return e.json(200, { status: 'connected', data: res.json })
    } else {
      var errMsg = 'Falha ao validar conexao Messenger'
      try {
        errMsg = (res.json && res.json.error && res.json.error.message) || errMsg
      } catch (_) {}
      return e.badRequestError(errMsg)
    }
  },
  $apis.requireAuth(),
)
