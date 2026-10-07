migrate(
  (app) => {
    try {
      const res = $http.send({
        url: 'https://ia-uazapi-6d79e.shrd00.internal.goskip.dev/backend/v1/instagram/diagnostic_concise',
        method: 'GET',
        timeout: 10,
      })
      const raw = (res.json && res.json.result) || ''
      const parsed = raw ? JSON.parse(raw) : {}

      console.log('[INSTAGRAM_APP_STATUS] === CONCISE GRAPH API v22.0 REPORT ===')
      console.log('[INSTAGRAM_APP_STATUS] app_fields: ' + JSON.stringify(parsed.app_fields))
      console.log('[INSTAGRAM_APP_STATUS] roles_app_tok: ' + JSON.stringify(parsed.roles_app_tok))
      console.log('[INSTAGRAM_APP_STATUS] mauro_me: ' + JSON.stringify(parsed.mauro_me))
      console.log(
        '[INSTAGRAM_APP_STATUS] roles_mauro_tok: ' + JSON.stringify(parsed.roles_mauro_tok),
      )
      console.log('[INSTAGRAM_APP_STATUS] debug_token: ' + JSON.stringify(parsed.debug_token))
      console.log(
        '[INSTAGRAM_APP_STATUS] bernadete_probe: ' + JSON.stringify(parsed.bernadete_probe),
      )
      console.log(
        '[INSTAGRAM_APP_STATUS] post_role_mauro: ' + JSON.stringify(parsed.post_role_mauro),
      )
      console.log('[INSTAGRAM_APP_STATUS] post_role_app: ' + JSON.stringify(parsed.post_role_app))
    } catch (e) {
      console.log('[INSTAGRAM_APP_STATUS] Error printing concise report: ' + String(e))
    }
  },
  (app) => {},
)
