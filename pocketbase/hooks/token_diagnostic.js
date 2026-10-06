// pocketbase/hooks/token_diagnostic.js
// Rota para diagnóstico manual sob demanda do token Meta
routerAdd(
  'GET',
  '/backend/v1/instagram/token-diagnostic',
  (e) => {
    const userRecords = $app.findRecordsByFilter('users', 'id != ""', '-created', 1, 0)
    if (!userRecords || userRecords.length === 0) {
      return e.json(404, { error: 'Nenhum usuário encontrado' })
    }
    const crmUser = userRecords[0]
    const token = crmUser.getString('meta_instagram_user_token') || ''
    const igAppId = crmUser.getString('meta_instagram_app_id') || '2442476629610638'

    if (!token) {
      return e.json(200, {
        status: 'no_token',
        message: 'Nenhum meta_instagram_user_token configurado no usuário.',
      })
    }

    const maskedToken = '...' + token.slice(-4)
    const results = {
      timestamp: new Date().toISOString(),
      token_masked: maskedToken,
      app_id: igAppId,
      user_identity: null,
      pages: [],
      permissions: { granted: [], declined: [] },
      errors: [],
    }

    // 1. /me
    try {
      const meRes = $http.send({
        url:
          'https://graph.facebook.com/v22.0/me?fields=id,name,email&access_token=' +
          encodeURIComponent(token),
        method: 'GET',
        timeout: 10,
      })
      if (meRes.statusCode >= 200 && meRes.statusCode < 300 && meRes.json) {
        results.user_identity = meRes.json
      } else {
        results.errors.push({ step: 'me', status: meRes.statusCode, data: meRes.json || meRes.raw })
      }
    } catch (errMe) {
      results.errors.push({ step: 'me', error: String(errMe) })
    }

    // 2. /me/accounts
    try {
      const accountsRes = $http.send({
        url:
          'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name},connected_instagram_account{id,username,name},page_backed_instagram_accounts{id,username}&limit=50&access_token=' +
          encodeURIComponent(token),
        method: 'GET',
        timeout: 15,
      })
      if (
        accountsRes.statusCode >= 200 &&
        accountsRes.statusCode < 300 &&
        accountsRes.json &&
        Array.isArray(accountsRes.json.data)
      ) {
        results.pages = accountsRes.json.data

        // Auto-detecta se houver instagram_business_account
        for (let i = 0; i < accountsRes.json.data.length; i++) {
          const pg = accountsRes.json.data[i]
          let igObj = pg.instagram_business_account || pg.connected_instagram_account || null
          if (
            !igObj &&
            pg.page_backed_instagram_accounts &&
            pg.page_backed_instagram_accounts.data &&
            pg.page_backed_instagram_accounts.data.length > 0
          ) {
            const pbItem = pg.page_backed_instagram_accounts.data[0]
            if (pbItem && pbItem.id) {
              igObj = { id: pbItem.id, username: pbItem.username || '' }
            }
          }
          if (igObj && igObj.id && !crmUser.getString('meta_instagram_business_id')) {
            crmUser.set('meta_instagram_business_id', igObj.id)
            if (igObj.username) {
              crmUser.set('instagram_username', igObj.username)
            }
            try {
              $app.saveNoValidate(crmUser)
              results.auto_detected_ig_id = igObj.id
            } catch (_) {}
            break
          }
        }
      } else {
        results.errors.push({
          step: 'accounts',
          status: accountsRes.statusCode,
          data: accountsRes.json || accountsRes.raw,
        })
      }
    } catch (errAcc) {
      results.errors.push({ step: 'accounts', error: String(errAcc) })
    }

    // 3. /me/permissions
    try {
      const permRes = $http.send({
        url:
          'https://graph.facebook.com/v22.0/me/permissions?access_token=' +
          encodeURIComponent(token),
        method: 'GET',
        timeout: 10,
      })
      if (
        permRes.statusCode >= 200 &&
        permRes.statusCode < 300 &&
        permRes.json &&
        Array.isArray(permRes.json.data)
      ) {
        const perms = permRes.json.data
        for (let p = 0; p < perms.length; p++) {
          if (perms[p].status === 'granted') {
            results.permissions.granted.push(perms[p].permission)
          } else {
            results.permissions.declined.push(perms[p].permission)
          }
        }
      }
    } catch (errPerm) {
      results.errors.push({ step: 'permissions', error: String(errPerm) })
    }

    return e.json(200, results)
  },
  $apis.requireAuth(),
)
