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
    // Prioriza o App Meta dedicado ao Instagram; se não estiver preenchido, usa o App Meta principal
    const appId = (
      user.getString('meta_instagram_app_id') ||
      user.getString('meta_app_id') ||
      ''
    ).trim()
    const appSecret = (
      user.getString('meta_instagram_app_secret') ||
      user.getString('meta_app_secret') ||
      ''
    ).trim()

    if (!appId || !appSecret) {
      return e.badRequestError(
        'Meta App ID e App Secret do Instagram devem ser configurados primeiro',
      )
    }

    const redirectUri = body.redirect_uri || ''
    if (!redirectUri) return e.badRequestError('Redirect URI is required')

    // Tenta trocar o código via endpoint OAuth da Meta Graph API (v22.0)
    let tokenRes = $http.send({
      url:
        'https://graph.facebook.com/v22.0/oauth/access_token?client_id=' +
        encodeURIComponent(appId) +
        '&client_secret=' +
        encodeURIComponent(appSecret) +
        '&code=' +
        encodeURIComponent(code) +
        '&redirect_uri=' +
        encodeURIComponent(redirectUri),
      method: 'GET',
      timeout: 15,
    })

    // Fallback: se api.instagram.com for necessário para Instagram Login standalone
    if (tokenRes.statusCode !== 200 || !tokenRes.json || !tokenRes.json.access_token) {
      try {
        const igPostRes = $http.send({
          url: 'https://api.instagram.com/oauth/access_token',
          method: 'POST',
          body:
            'client_id=' +
            encodeURIComponent(appId) +
            '&client_secret=' +
            encodeURIComponent(appSecret) +
            '&grant_type=authorization_code&redirect_uri=' +
            encodeURIComponent(redirectUri) +
            '&code=' +
            encodeURIComponent(code),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15,
        })
        if (igPostRes.statusCode === 200 && igPostRes.json && igPostRes.json.access_token) {
          tokenRes = igPostRes
        }
      } catch (_) {}
    }

    if (tokenRes.statusCode !== 200 || !tokenRes.json || !tokenRes.json.access_token) {
      const errDetail =
        (tokenRes.json &&
          tokenRes.json.error &&
          (tokenRes.json.error.message || tokenRes.json.error.error_user_msg)) ||
        (tokenRes.json && tokenRes.json.error_message) ||
        'HTTP ' + tokenRes.statusCode
      return e.badRequestError('Falha ao trocar codigo por token de acesso: ' + errDetail)
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

    // Tenta obter páginas via /me/accounts
    let pageToken = ''
    let pageId = ''
    let igBusinessId = ''

    const pagesRes = $http.send({
      url: 'https://graph.facebook.com/v22.0/me/accounts?access_token=' + longLivedToken,
      method: 'GET',
      timeout: 15,
    })

    if (
      pagesRes.statusCode === 200 &&
      pagesRes.json &&
      pagesRes.json.data &&
      pagesRes.json.data.length > 0
    ) {
      const page = pagesRes.json.data[0]
      pageToken = page.access_token
      pageId = page.id

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
    }

    // Se /me/accounts não retornou páginas ou não encontrou igBusinessId,
    // tenta diretamente no Graph com o próprio token (comum com Instagram Business Login)
    if (!igBusinessId) {
      try {
        const directMeRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/me?fields=id,name,user_id,username&access_token=' +
            longLivedToken,
          method: 'GET',
          timeout: 15,
        })
        if (directMeRes.statusCode === 200 && directMeRes.json) {
          igBusinessId = directMeRes.json.user_id || directMeRes.json.id || ''
        }
      } catch (_) {}
    }

    // Se ainda não temos igBusinessId, mantém o que já estava configurado no user
    if (!igBusinessId) {
      igBusinessId = user.getString('meta_instagram_business_id') || ''
    }

    // Salva SEMPRE o user token retornado pelo OAuth
    user.set('meta_instagram_user_token', longLivedToken)

    // Percorre todas as páginas para identificar qual possui instagram_business_account
    let targetPageToken = ''
    let targetPageId = ''
    let foundUsername = ''

    if (
      pagesRes.statusCode === 200 &&
      pagesRes.json &&
      pagesRes.json.data &&
      pagesRes.json.data.length > 0
    ) {
      const allPages = pagesRes.json.data
      console.log(
        '[INSTAGRAM_OAUTH] /me/accounts retornou ' +
          allPages.length +
          ' páginas para o usuário OAuth.',
      )

      for (let i = 0; i < allPages.length; i++) {
        const p = allPages[i]
        const pTok = p.access_token || ''
        const pId = p.id || ''
        const pName = p.name || ''

        try {
          const chkRes = $http.send({
            url:
              'https://graph.facebook.com/v22.0/' +
              encodeURIComponent(pId) +
              '?fields=instagram_business_account{id,username,name}&access_token=' +
              encodeURIComponent(pTok || longLivedToken),
            method: 'GET',
            timeout: 10,
          })

          if (
            chkRes.statusCode === 200 &&
            chkRes.json &&
            chkRes.json.instagram_business_account &&
            chkRes.json.instagram_business_account.id
          ) {
            const igObj = chkRes.json.instagram_business_account
            igBusinessId = igObj.id
            targetPageToken = pTok
            targetPageId = pId
            foundUsername = igObj.username || igObj.name || ''
            console.log(
              '[INSTAGRAM_OAUTH] Encontrado Instagram vinculado na página ' +
                pName +
                ' (' +
                pId +
                '): IG ID=' +
                igBusinessId +
                ' @' +
                foundUsername,
            )
            break
          }
        } catch (chkErr) {
          console.log(
            '[INSTAGRAM_OAUTH] Erro ao checar IG na página ' + pId + ': ' + String(chkErr),
          )
        }
      }

      // Se nenhuma página tinha instagram_business_account explicitamente vinculado no Graph,
      // usa os dados da primeira página como fallback para tokens de página
      if (!targetPageToken && allPages.length > 0) {
        targetPageToken = allPages[0].access_token || ''
        targetPageId = allPages[0].id || ''
      }
    }

    if (targetPageToken) {
      user.set('meta_instagram_page_token', targetPageToken)
      user.set('meta_page_access_token', targetPageToken)
    } else {
      user.set('meta_instagram_page_token', longLivedToken)
      if (!user.getString('meta_page_access_token')) {
        user.set('meta_page_access_token', longLivedToken)
      }
    }

    if (igBusinessId) {
      user.set('meta_instagram_business_id', igBusinessId)
    }
    if (foundUsername) {
      user.set('instagram_username', foundUsername)
    }

    $app.save(user)

    return e.json(200, {
      success: true,
      instagram_business_id: igBusinessId,
      page_id: targetPageId || pageId,
      instagram_username: foundUsername,
    })
  },
  $apis.requireAuth(),
)
