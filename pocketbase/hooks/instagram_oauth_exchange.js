routerAdd('POST', '/backend/v1/instagram/oauth/exchange', (e) => {
  const body = e.requestInfo().body || {}
  let userId = e.auth ? e.auth.id : ''

  // Se o usuário não estiver autenticado na requisição (ex: cookie/sessão expirada no callback mobile),
  // tenta recuperar o usuário pelo header x-user-id ou pelo usuário padrão brfimoveis@gmail.com
  let user = null
  if (userId) {
    try {
      user = $app.findRecordById('users', userId)
    } catch (_) {}
  }

  if (!user) {
    const headerUserId = e.requestInfo().headers['x-user-id'] || ''
    if (headerUserId) {
      try {
        user = $app.findRecordById('users', headerUserId)
      } catch (_) {}
    }
  }

  if (!user) {
    try {
      user = $app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
    } catch (_) {}
  }

  if (!user) {
    return e.unauthorizedError('Usuário não encontrado para salvar a autorização')
  }

  const code = (body.code || '').trim()
  if (!code) return e.badRequestError('Authorization code is required')

  // App IDs e Secrets possíveis:
  // 1. Dedicado ao Instagram (se configurado)
  // 2. App Principal da Meta (meta_app_id)
  // 3. Fallback hardcoded para o app da Bia 2442476629610638
  const dedicatedAppId = (user.getString('meta_instagram_app_id') || '').trim()
  const dedicatedAppSecret = (user.getString('meta_instagram_app_secret') || '').trim()
  const mainAppId = (user.getString('meta_app_id') || '').trim()
  const mainAppSecret = (user.getString('meta_app_secret') || '').trim()

  // Monta lista de pares de credenciais a testar para troca do código
  // Se o cliente informou client_id específico no body, prioriza
  const clientAppIdHint = (body.client_id || body.app_id || '').trim()

  const candidateCredentials = []
  if (clientAppIdHint) {
    if (clientAppIdHint === dedicatedAppId && dedicatedAppSecret) {
      candidateCredentials.push({
        id: dedicatedAppId,
        secret: dedicatedAppSecret,
        tag: 'hint_dedicated',
      })
    } else if (clientAppIdHint === mainAppId && mainAppSecret) {
      candidateCredentials.push({ id: mainAppId, secret: mainAppSecret, tag: 'hint_main' })
    } else if (clientAppIdHint === '2442476629610638') {
      candidateCredentials.push({
        id: '2442476629610638',
        secret: mainAppSecret || 'd085b85d8d534c682f60b6bde8043610',
        tag: 'hint_2442476629610638',
      })
    }
  }

  // Adiciona o App principal (2442476629610638 / main)
  if (mainAppId && mainAppSecret) {
    candidateCredentials.push({ id: mainAppId, secret: mainAppSecret, tag: 'main_app' })
  }

  // Adiciona o dedicado se houver
  if (dedicatedAppId && dedicatedAppSecret) {
    candidateCredentials.push({
      id: dedicatedAppId,
      secret: dedicatedAppSecret,
      tag: 'dedicated_app',
    })
  }

  // Fallback garantido para o app 2442476629610638 com o secret conhecido
  candidateCredentials.push({
    id: '2442476629610638',
    secret: mainAppSecret || 'd085b85d8d534c682f60b6bde8043610',
    tag: 'fallback_2442476629610638',
  })

  // Remove duplicados de candidateCredentials
  const uniqueCredentials = []
  const seen = {}
  for (let i = 0; i < candidateCredentials.length; i++) {
    const c = candidateCredentials[i]
    const key = c.id + ':' + c.secret
    if (!seen[key] && c.id && c.secret) {
      seen[key] = true
      uniqueCredentials.push(c)
    }
  }

  if (uniqueCredentials.length === 0) {
    return e.badRequestError('Nenhum App ID / Secret configurado no CRM para troca do código.')
  }

  // Redirect URIs possíveis a testar:
  // A Meta exige que a redirect_uri enviada na troca do token seja EXATAMENTE
  // a mesma redirect_uri enviada na geração do diálogo de autorização.
  // Pode ter sido a do preview ou a de produção.
  const requestedRedirectUri = (body.redirect_uri || '').trim()
  const prodRedirectUri =
    'https://brfiacrminteligente.goskip.app/settings/connections/instagram/callback'
  const previewRedirectUri =
    'https://ia-uazapi-6d79e--preview.goskip.app/settings/connections/instagram/callback'

  const candidateUris = []
  if (requestedRedirectUri) candidateUris.push(requestedRedirectUri)
  if (requestedRedirectUri !== prodRedirectUri) candidateUris.push(prodRedirectUri)
  if (requestedRedirectUri !== previewRedirectUri) candidateUris.push(previewRedirectUri)

  // Remove duplicados
  const uniqueUris = []
  const seenUris = {}
  for (let u = 0; u < candidateUris.length; u++) {
    const uri = candidateUris[u]
    if (!seenUris[uri] && uri) {
      seenUris[uri] = true
      uniqueUris.push(uri)
    }
  }

  console.log(
    '[INSTAGRAM_OAUTH_EXCHANGE] Tentando trocar código com ' +
      uniqueCredentials.length +
      ' credencial(is) e ' +
      uniqueUris.length +
      ' redirect URIs.',
  )

  let tokenRes = null
  let successfulCred = null
  let successfulUri = ''
  let lastErrorDetail = ''

  // Loop de tentativas: testa as credenciais e as URIs candidatas
  outerLoop: for (let cIdx = 0; cIdx < uniqueCredentials.length; cIdx++) {
    const cred = uniqueCredentials[cIdx]

    for (let uIdx = 0; uIdx < uniqueUris.length; uIdx++) {
      const uri = uniqueUris[uIdx]

      try {
        const res = $http.send({
          url:
            'https://graph.facebook.com/v22.0/oauth/access_token?client_id=' +
            encodeURIComponent(cred.id) +
            '&client_secret=' +
            encodeURIComponent(cred.secret) +
            '&code=' +
            encodeURIComponent(code) +
            '&redirect_uri=' +
            encodeURIComponent(uri),
          method: 'GET',
          timeout: 15,
        })

        if (res.statusCode === 200 && res.json && res.json.access_token) {
          tokenRes = res
          successfulCred = cred
          successfulUri = uri
          console.log(
            '[INSTAGRAM_OAUTH_EXCHANGE] Sucesso na troca de código via App ID ' +
              cred.id +
              ' (' +
              cred.tag +
              ') e URI ' +
              uri,
          )
          break outerLoop
        } else {
          const errMsg =
            (res.json &&
              res.json.error &&
              (res.json.error.message || res.json.error.error_user_msg)) ||
            (res.json && res.json.error_message) ||
            'HTTP ' + res.statusCode
          lastErrorDetail = errMsg
          console.log(
            '[INSTAGRAM_OAUTH_EXCHANGE] Tentativa falhou com App ' +
              cred.id +
              ' e URI ' +
              uri +
              ': ' +
              errMsg,
          )
        }
      } catch (callErr) {
        lastErrorDetail = String(callErr)
        console.log('[INSTAGRAM_OAUTH_EXCHANGE] Erro de rede: ' + String(callErr))
      }
    }
  }

  if (!tokenRes || !tokenRes.json || !tokenRes.json.access_token) {
    return e.badRequestError(
      'Falha ao trocar código por token de acesso da Meta: ' +
        (lastErrorDetail || 'Código expirado ou inválido'),
    )
  }

  const shortLivedToken = tokenRes.json.access_token

  // Troca o token de curta duração por um de longa duração (60 dias / perene)
  let longLivedToken = shortLivedToken
  try {
    const longLivedRes = $http.send({
      url:
        'https://graph.facebook.com/v22.0/oauth/access_token?grant_type=fb_exchange_token&client_id=' +
        encodeURIComponent(successfulCred.id) +
        '&client_secret=' +
        encodeURIComponent(successfulCred.secret) +
        '&fb_exchange_token=' +
        encodeURIComponent(shortLivedToken),
      method: 'GET',
      timeout: 15,
    })

    if (longLivedRes.statusCode === 200 && longLivedRes.json && longLivedRes.json.access_token) {
      longLivedToken = longLivedRes.json.access_token
    }
  } catch (llErr) {
    console.log('[INSTAGRAM_OAUTH_EXCHANGE] Exceção ao obter long lived token: ' + String(llErr))
  }

  // Salva SEMPRE o user token retornado pelo OAuth
  user.set('meta_instagram_user_token', longLivedToken)

  // Inspeciona permissões concedidas pelo usuário neste token
  let grantedScopes = []
  try {
    const permRes = $http.send({
      url:
        'https://graph.facebook.com/v22.0/me/permissions?access_token=' +
        encodeURIComponent(longLivedToken),
      method: 'GET',
      timeout: 10,
    })
    if (permRes.statusCode === 200 && permRes.json && Array.isArray(permRes.json.data)) {
      for (let p = 0; p < permRes.json.data.length; p++) {
        if (permRes.json.data[p].status === 'granted') {
          grantedScopes.push(permRes.json.data[p].permission)
        }
      }
    }
    console.log(
      '[INSTAGRAM_OAUTH_EXCHANGE] Escopos concedidos no token: ' + grantedScopes.join(', '),
    )
  } catch (_) {}

  // Tenta obter páginas via /me/accounts e auto-detectar o Instagram Business Account
  let targetPageToken = ''
  let targetPageId = ''
  let igBusinessId = ''
  let foundUsername = ''

  try {
    const pagesRes = $http.send({
      url:
        'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name},connected_instagram_account{id,username,name},page_backed_instagram_accounts{id,username}&access_token=' +
        encodeURIComponent(longLivedToken),
      method: 'GET',
      timeout: 15,
    })

    if (
      pagesRes.statusCode === 200 &&
      pagesRes.json &&
      pagesRes.json.data &&
      pagesRes.json.data.length > 0
    ) {
      const allPages = pagesRes.json.data
      console.log(
        '[INSTAGRAM_OAUTH_EXCHANGE] /me/accounts retornou ' + allPages.length + ' página(s).',
      )

      // Prioriza a página "BRF Imóveis" (ou aquela com nome que combine com BRF)
      let primaryPage = null
      for (let i = 0; i < allPages.length; i++) {
        const p = allPages[i]
        const pName = (p.name || '').toLowerCase()
        if (pName.indexOf('brf') !== -1) {
          primaryPage = p
          break
        }
      }
      if (!primaryPage) primaryPage = allPages[0]

      targetPageToken = primaryPage.access_token || ''
      targetPageId = primaryPage.id || ''

      // Varre páginas procurando instagram_business_account
      for (let i = 0; i < allPages.length; i++) {
        const p = allPages[i]
        const pTok = p.access_token || ''
        const pId = p.id || ''
        const pName = p.name || ''

        let igObj = p.instagram_business_account || null

        if (!igObj && (pTok || longLivedToken)) {
          try {
            const chkRes = $http.send({
              url:
                'https://graph.facebook.com/v22.0/' +
                encodeURIComponent(pId) +
                '?fields=instagram_business_account{id,username,name},connected_instagram_account{id,username,name},page_backed_instagram_accounts{id,username}&access_token=' +
                encodeURIComponent(pTok || longLivedToken),
              method: 'GET',
              timeout: 10,
            })

            if (chkRes.statusCode === 200 && chkRes.json) {
              if (
                chkRes.json.instagram_business_account &&
                chkRes.json.instagram_business_account.id
              ) {
                igObj = chkRes.json.instagram_business_account
              } else if (
                chkRes.json.connected_instagram_account &&
                chkRes.json.connected_instagram_account.id
              ) {
                igObj = chkRes.json.connected_instagram_account
              } else if (
                chkRes.json.page_backed_instagram_accounts &&
                chkRes.json.page_backed_instagram_accounts.data &&
                chkRes.json.page_backed_instagram_accounts.data.length > 0
              ) {
                const pbItem = chkRes.json.page_backed_instagram_accounts.data[0]
                if (pbItem && pbItem.id) {
                  igObj = { id: pbItem.id, username: pbItem.username || '' }
                }
              }
            }
          } catch (chkErr) {
            console.log(
              '[INSTAGRAM_OAUTH_EXCHANGE] Erro ao checar IG na página ' +
                pId +
                ': ' +
                String(chkErr),
            )
          }
        }

        if (igObj && igObj.id) {
          igBusinessId = igObj.id
          targetPageToken = pTok || targetPageToken
          targetPageId = pId
          foundUsername = igObj.username || igObj.name || ''
          console.log(
            '[INSTAGRAM_OAUTH_EXCHANGE] Auto-detectado Instagram na página ' +
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
      }
    }
  } catch (pagesErr) {
    console.log('[INSTAGRAM_OAUTH_EXCHANGE] Erro ao consultar /me/accounts: ' + String(pagesErr))
  }
  // Se ainda não temos igBusinessId, mantém o que já estava configurado no user
  if (!igBusinessId) {
    igBusinessId = user.getString('meta_instagram_business_id') || ''
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

  console.log(
    '[INSTAGRAM_OAUTH_EXCHANGE] Finalizado com sucesso para user ' +
      user.id +
      '. IG=' +
      igBusinessId +
      ', Page=' +
      targetPageId,
  )

  return e.json(200, {
    success: true,
    instagram_business_id: igBusinessId,
    page_id: targetPageId,
    instagram_username: foundUsername,
    app_id_used: successfulCred ? successfulCred.id : '',
    granted_scopes: grantedScopes,
    redirect_uri_used: successfulUri,
  })
})
