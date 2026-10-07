migrate(
  (app) => {
    try {
      const res = $http.send({
        url: 'https://ia-uazapi-6d79e.shrd00.internal.goskip.dev/backend/v1/instagram/diagnostic_inspect',
        method: 'GET',
        timeout: 10,
      })
      const data = res.json || {}

      const logsCol = app.findCollectionByNameOrId('system_logs')
      // Grava em campos texto individuais para visualização imediata
      const rec = new Record(logsCol, {
        type: 'meta_inspect_readable',
        message: 'Readable Diagnostic Output',
        details:
          'APP_STATUS: ' +
          JSON.stringify(data.app_info) +
          '\n\nROLES_APP: ' +
          JSON.stringify(data.app_roles_with_app_token) +
          '\n\nROLES_USER: ' +
          JSON.stringify(data.app_roles_with_user_token) +
          '\n\nUSER_ME: ' +
          JSON.stringify(data.user_me_oauth) +
          '\n\nBERNADETE: ' +
          JSON.stringify(data.bernadete_user_id) +
          ' | err=' +
          JSON.stringify(data.bernadete_probe_error) +
          '\n\nACTION_USER: ' +
          JSON.stringify(data.action_add_role_result) +
          '\n\nACTION_APP: ' +
          JSON.stringify(data.action_add_role_app_token_result),
      })
      app.save(rec)
    } catch (e) {
      // fallback
    }
  },
  (app) => {},
)
