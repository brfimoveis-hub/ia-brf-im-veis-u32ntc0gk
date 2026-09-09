migrate(
  (app) => {
    let user
    try {
      user = app.findFirstRecordByData('users', 'id', 'g5jto8bhulw01bz')
    } catch (_) {
      try {
        user = app.findFirstRecordByData('users', 'email', 'brfimoveis@gmail.com')
      } catch (e) {
        return
      }
    }
    if (!user) return

    const token = user.getString('meta_capi_token')
    if (!token) return

    const appId = user.getString('meta_app_id') || '2442476629610638'
    const appSecret = user.getString('meta_app_secret') || 'd085b85d8d534c682f60b6bde8043610'
    const targetBmId = '1676016233499097'
    const datasetId = '1093869151209421'

    const safeHttp = (url, method = 'GET', body = null) => {
      try {
        const opts = { url, method, timeout: 20 }
        if (body) {
          opts.headers = { 'Content-Type': 'application/json' }
          opts.body = JSON.stringify(body)
        }
        const res = $http.send(opts)
        return {
          statusCode: res.statusCode,
          data: res.json || res.body,
        }
      } catch (err) {
        return {
          statusCode: 0,
          error: err.message,
        }
      }
    }

    const results = {}

    // 1. /debug_token usando o próprio token como access_token
    results.debug_token_self = safeHttp(
      'https://graph.facebook.com/v21.0/debug_token?input_token=' +
        encodeURIComponent(token) +
        '&access_token=' +
        encodeURIComponent(token),
    )

    // 1b. /debug_token usando app_token (app_id|app_secret)
    if (appId && appSecret) {
      const appToken = appId + '|' + appSecret
      results.debug_token_app = safeHttp(
        'https://graph.facebook.com/v21.0/debug_token?input_token=' +
          encodeURIComponent(token) +
          '&access_token=' +
          encodeURIComponent(appToken),
      )
    }

    // 2. /me?fields=id,name,category,tasks
    results.me = safeHttp(
      'https://graph.facebook.com/v21.0/me?fields=id,name,category,tasks&access_token=' +
        encodeURIComponent(token),
    )

    // 3. /me/permissions
    results.permissions = safeHttp(
      'https://graph.facebook.com/v21.0/me/permissions?access_token=' + encodeURIComponent(token),
    )

    // 4. /me/businesses (quais portfólios / BMs o usuário de sistema enxerga)
    results.me_businesses = safeHttp(
      'https://graph.facebook.com/v21.0/me/businesses?fields=id,name,verification_status,created_time,primary_page&access_token=' +
        encodeURIComponent(token),
    )

    // 5. /me/adaccounts (contas de anúncio visíveis ao usuário de sistema)
    results.me_adaccounts = safeHttp(
      'https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id,account_status,business,owner&access_token=' +
        encodeURIComponent(token),
    )

    // 6. /{business_id}/adaccounts para o BM 1676016233499097
    results.target_bm_adaccounts = safeHttp(
      'https://graph.facebook.com/v21.0/' +
        targetBmId +
        '/adaccounts?fields=id,name,account_id,account_status&access_token=' +
        encodeURIComponent(token),
    )

    // 6b. /{business_id} para ver se o token enxerga o BM alvo
    results.target_bm_info = safeHttp(
      'https://graph.facebook.com/v21.0/' +
        targetBmId +
        '?fields=id,name,verification_status,primary_page&access_token=' +
        encodeURIComponent(token),
    )

    // 6c. /{business_id}/system_users para verificar usuários de sistema cadastrados no BM
    results.target_bm_system_users = safeHttp(
      'https://graph.facebook.com/v21.0/' +
        targetBmId +
        '/system_users?access_token=' +
        encodeURIComponent(token),
    )

    // 7. /1093869151209421 (o dataset/pixel) - testar com fields e simples
    results.dataset_info = safeHttp(
      'https://graph.facebook.com/v21.0/' +
        datasetId +
        '?fields=id,name,business,owner_business&access_token=' +
        encodeURIComponent(token),
    )

    // 7b. /1093869151209421 com app token caso falhe com o token do usuário de sistema
    if (appId && appSecret) {
      results.dataset_info_app_token = safeHttp(
        'https://graph.facebook.com/v21.0/' +
          datasetId +
          '?fields=id,name,business,owner_business&access_token=' +
          encodeURIComponent(appId + '|' + appSecret),
      )
    }

    // 8. /1093869151209421/events (teste de POST CAPI)
    const testPayload = {
      data: [
        {
          event_name: 'TestEventDiagnostic',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'system_generated',
          user_data: {
            client_ip_address: '127.0.0.1',
            client_user_agent: 'BRF_Live_Diagnostic',
            em: [$security.sha256('contato@brfimoveis.com.br')],
          },
        },
      ],
    }
    results.capi_post_test = safeHttp(
      'https://graph.facebook.com/v21.0/' +
        datasetId +
        '/events?access_token=' +
        encodeURIComponent(token),
      'POST',
      testPayload,
    )

    // Gravar resultados em system_logs para inspeção imediata
    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(logsCol)
      logRec.set('user_id', user.id)
      logRec.set('type', 'api_integration')
      logRec.set('message', 'LIVE_DIAGNOSTIC_RESULT')
      logRec.set('details', JSON.stringify(results))
      logRec.set(
        'payload',
        JSON.stringify({
          action: 'live_capi_token_diagnostic',
          target_bm: targetBmId,
          dataset_id: datasetId,
          app_id: appId,
        }),
      )
      app.saveNoValidate(logRec)
    } catch (_) {}
  },
  (app) => {},
)
