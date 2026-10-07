migrate(
  (app) => {
    // Busca logs de diagnóstico anteriores para ler os dados exatos
    const recs = app.findRecordsByFilter(
      'system_logs',
      'type = "meta_inspect_concise"',
      '-created',
      1,
      0,
    )
    if (!recs || recs.length === 0) return
    const raw = recs[0].getString('details') || '{}'
    const d = JSON.parse(raw)

    const userCol = app.findCollectionByNameOrId('users')
    const users = app.findRecordsByFilter(
      'users',
      'email = "brfimoveis@gmail.com"',
      '-created',
      1,
      0,
    )
    if (!users || users.length === 0) return
    const user = users[0]

    // Formata o resumo em pedaços e armazena em notas de um lead de teste ou em log
    const summaryLines = [
      '=== RELATÓRIO META GRAPH API v22.0 ===',
      'APP_ID: 2442476629610638',
      '1. APP_FIELDS (com App Token app_id|app_secret):',
      'Status: ' + (d.app_fields ? d.app_fields.status : 'n/a'),
      'Body: ' + JSON.stringify(d.app_fields ? d.app_fields.body : d.app_fields),
      '2. ROLES_APP_TOK:',
      'Status: ' + (d.roles_app_tok ? d.roles_app_tok.status : 'n/a'),
      'Body: ' + JSON.stringify(d.roles_app_tok ? d.roles_app_tok.body : d.roles_app_tok),
      '3. MAURO_ME (com User Token):',
      'Status: ' + (d.mauro_me ? d.mauro_me.status : 'n/a'),
      'Body: ' + JSON.stringify(d.mauro_me ? d.mauro_me.body : d.mauro_me),
      '4. ROLES_MAURO_TOK:',
      'Status: ' + (d.roles_mauro_tok ? d.roles_mauro_tok.status : 'n/a'),
      'Body: ' + JSON.stringify(d.roles_mauro_tok ? d.roles_mauro_tok.body : d.roles_mauro_tok),
      '5. DEBUG_TOKEN (User Token do Mauro):',
      'Status: ' + (d.debug_token ? d.debug_token.status : 'n/a'),
      'Body: ' + JSON.stringify(d.debug_token ? d.debug_token.body : d.debug_token),
      '6. BERNADETE_PROBE (ID 100053924061859):',
      'Status: ' + (d.bernadete_probe ? d.bernadete_probe.status : 'n/a'),
      'Body: ' + JSON.stringify(d.bernadete_probe ? d.bernadete_probe.body : d.bernadete_probe),
      '7. POST_ROLE_MAURO (adicionar tester com User Token):',
      'Status: ' + (d.post_role_mauro ? d.post_role_mauro.status : 'n/a'),
      'Body: ' + JSON.stringify(d.post_role_mauro ? d.post_role_mauro.body : d.post_role_mauro),
      '8. POST_ROLE_APP (adicionar tester com App Token):',
      'Status: ' + (d.post_role_app ? d.post_role_app.status : 'n/a'),
      'Body: ' + JSON.stringify(d.post_role_app ? d.post_role_app.body : d.post_role_app),
    ]

    // Divide em 4 logs de tipo 'report_print_chunk' para exibição garantida
    const logsCol = app.findCollectionByNameOrId('system_logs')
    for (let c = 0; c < summaryLines.length; c += 4) {
      const chunkMsg = summaryLines.slice(c, c + 4).join('\n')
      const rec = new Record(logsCol, {
        type: 'report_print_chunk',
        message: chunkMsg.substring(0, 250),
        details: chunkMsg,
        user_id: user.id,
      })
      app.save(rec)
    }
  },
  (app) => {},
)
