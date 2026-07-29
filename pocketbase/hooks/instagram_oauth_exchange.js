routerAdd(
  'POST',
  '/backend/v1/instagram/oauth/exchange',
  (e) => {
    const body = e.requestInfo().body || {}
    const userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    const code = body.code
    if (!code) return e.badRequestError('Authorization code is required')

    const user = $app.findRecordById('users', userId)
    const appId = user.getString('meta_app_id') || ''
    const appSecret = user.getString('meta_app_secret') || ''

    if (!appId || !appSecret) {
      return e.badRequestError('Meta App ID e App Secret devem ser configurados primeiro')
    }

    const redirectUri = body.redirect_uri || ''
    if (!redirectUri) return e.badRequestError('Redirect URI is required')

    const tokenRes = $http.send({
      url:
        'https://graph.facebook.com/v22.0/oauth/access_token?client_id=' +
        appId +
        '&client_secret=' +
        appSecret +
        '&code=' +
        encodeURIComponent(code) +
        '&redirect_uri=' +
        encodeURIComponent(redirectUri),
      method: 'GET',
      timeout: 15,
    })

    if (tokenRes.statusCode !== 200 || !tokenRes.json || !tokenRes.json.access_token) {
      return e.badRequestError('Falha ao trocar codigo por token de acesso')
    }

    const shortLivedToken = tokenRes.json.access_token

    const longLivedRes = $http.send({
      url:
        'https://graph.facebook.com/v22.0/oauth/access_token?grant_type=fb_exchange_token&client_id=' +
        appId +
        '&client_secret=' +
        appSecret +
        '&fb_exchange_token=' +
        shortLivedToken,
      method: 'GET',
      timeout: 15,
    })

    const longLivedToken = (longLivedRes.json && longLivedRes.json.access_token) || shortLivedToken

    const pagesRes = $http.send({
      url: 'https://graph.facebook.com/v22.0/me/accounts?access_token=' + longLivedToken,
      method: 'GET',
      timeout: 15,
    })

    if (
      pagesRes.statusCode !== 200 ||
      !pagesRes.json ||
      !pagesRes.json.data ||
      pagesRes.json.data.length === 0
    ) {
      return e.badRequestError(
        'Nenhuma pagina encontrada. Verifique as permissoes do Facebook Login.',
      )
    }

    const page = pagesRes.json.data[0]
    const pageToken = page.access_token
    const pageId = page.id

    let igBusinessId = ''
    const igRes = $http.send({
      url:
        'https://graph.facebook.com/v22.0/' +
        pageId +
        '?fields=instagram_business_account&access_token=' +
        pageToken,
      method: 'GET',
      timeout: 15,
    })

    if (
      igRes.statusCode === 200 &&
      igRes.json &&
      igRes.json.instagram_business_account &&
      igRes.json.instagram_business_account.id
    ) {
      igBusinessId = igRes.json.instagram_business_account.id
    }

    user.set('meta_instagram_page_token', pageToken)
    user.set('meta_instagram_business_id', igBusinessId)
    user.set('meta_page_access_token', pageToken)
    $app.save(user)

    return e.json(200, {
      success: true,
      instagram_business_id: igBusinessId,
      page_id: pageId,
    })
  },
  $apis.requireAuth(),
)
