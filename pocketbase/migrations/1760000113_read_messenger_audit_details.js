// Migration 1760000113: Inspecionar detalhes da inscrição da Página 1343797128806374
migrate(
  (app) => {
    const log = app.findFirstRecordByFilter('system_logs', "id = 'ln91er059xwuhfv'")
    if (log) {
      const payload = log.get('payload') || {}
      console.log('--- AUDIT DETAILS ---')
      console.log('page_token_name: ' + payload.page_token_name)
      console.log('page_details: ' + JSON.stringify(payload.page_details))
      console.log('subscribed_apps_before: ' + JSON.stringify(payload.subscribed_apps_before))
      console.log('subscription_post_result: ' + JSON.stringify(payload.subscription_post_result))
      console.log('subscribed_apps_after: ' + JSON.stringify(payload.subscribed_apps_after))

      // Gravar um log com strings legíveis e curtas
      const sysLogsCol = app.findCollectionByNameOrId('system_logs')
      const r = new Record(sysLogsCol, {
        user_id: log.getString('user_id'),
        type: 'messenger_audit_summary',
        message: 'Resumo literal da Graph API subscribed_apps',
        details: `POST Result: ${JSON.stringify(payload.subscription_post_result)} | AFTER: ${JSON.stringify(payload.subscribed_apps_after)}`,
        payload: {
          token_source: payload.page_token_name,
          before: payload.subscribed_apps_before,
          post: payload.subscription_post_result,
          after: payload.subscribed_apps_after,
        },
      })
      app.save(r)
    }
  },
  (app) => {},
)
