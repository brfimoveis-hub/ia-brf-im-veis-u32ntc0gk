// Migration 1760000114: Ler o campo details do log ln91er059xwuhfv
migrate(
  (app) => {
    const log = app.findFirstRecordByFilter('system_logs', "id = 'ln91er059xwuhfv'")
    if (log) {
      const rawDetails = log.getString('details')
      let parsed = {}
      try {
        parsed = JSON.parse(rawDetails)
      } catch (e) {
        parsed = { error_parse: String(e) }
      }

      // Vamos salvar fatias pequenas em message e details de novos logs para inspecionar
      const sysLogsCol = app.findCollectionByNameOrId('system_logs')

      const log1 = new Record(sysLogsCol, {
        user_id: log.getString('user_id'),
        type: 'messenger_slice_1',
        message:
          'Token: ' + (parsed.page_token_name || '') + ' | Action: ' + (parsed.action_taken || ''),
        details: 'Page: ' + JSON.stringify(parsed.page_details || {}),
      })
      app.save(log1)

      const log2 = new Record(sysLogsCol, {
        user_id: log.getString('user_id'),
        type: 'messenger_slice_2',
        message: 'POST result',
        details: JSON.stringify(parsed.subscription_post_result || {}),
      })
      app.save(log2)

      const log3 = new Record(sysLogsCol, {
        user_id: log.getString('user_id'),
        type: 'messenger_slice_3',
        message: 'Subscribed apps after',
        details: JSON.stringify(parsed.subscribed_apps_after || {}),
      })
      app.save(log3)
    }
  },
  (app) => {},
)
