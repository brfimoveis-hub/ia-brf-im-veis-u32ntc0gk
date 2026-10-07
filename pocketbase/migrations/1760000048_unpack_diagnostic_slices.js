migrate(
  (app) => {
    const logs = app.findRecordsByFilter('system_logs', 'id = "khhtrqs5pqb3a1b"', '-created', 1, 0)
    if (!logs || logs.length === 0) return
    const payload = logs[0].get('payload') || {}
    const logsCol = app.findCollectionByNameOrId('system_logs')

    const pieces = [
      { key: 'app_info', val: payload.app_info },
      { key: 'roles_app_token', val: payload.app_roles_with_app_token },
      { key: 'roles_user_token', val: payload.app_roles_with_user_token },
      { key: 'user_me_oauth', val: payload.user_me_oauth },
      { key: 'user_me_page', val: payload.user_me_page },
      { key: 'bernadete_user_id', val: payload.bernadete_user_id },
      { key: 'bernadete_probe_error', val: payload.bernadete_probe_error },
      { key: 'action_user_token', val: payload.action_add_role_result },
      { key: 'action_app_token', val: payload.action_add_role_app_token_result },
    ]

    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i]
      const rec = new Record(logsCol, {
        type: 'meta_diag_slice',
        message: 'Slice ' + p.key,
        payload: p.val,
        details: JSON.stringify(p.val),
        user_id: 'g5jto8bhulw01bz',
      })
      app.save(rec)
    }
  },
  (app) => {},
)
