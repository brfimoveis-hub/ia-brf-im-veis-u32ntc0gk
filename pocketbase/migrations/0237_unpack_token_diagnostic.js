migrate(
  (app) => {
    const lastLog = app.findFirstRecordByData('system_logs', 'id', 'ik7p6bn5pnhg6s9')
    if (!lastLog) return
    const details = JSON.parse(lastLog.getString('details') || '{}')

    const logsCol = app.findCollectionByNameOrId('system_logs')

    // Split 1: me and direct_target_page
    const r1 = new Record(logsCol)
    r1.set('user_id', lastLog.getString('user_id'))
    r1.set('type', 'meta_token_diag_split')
    r1.set('message', 'Diag Part 1: Me and Target Page')
    r1.set(
      'details',
      JSON.stringify({
        me: details.me,
        direct_target_page: details.direct_target_page,
        saved_changes: details.saved_changes,
      }),
    )
    app.saveNoValidate(r1)

    // Split 2: accounts
    const r2 = new Record(logsCol)
    r2.set('user_id', lastLog.getString('user_id'))
    r2.set('type', 'meta_token_diag_split')
    r2.set('message', 'Diag Part 2: Accounts')
    r2.set(
      'details',
      JSON.stringify({
        accounts: details.accounts,
      }),
    )
    app.saveNoValidate(r2)

    // Split 3: permissions
    const r3 = new Record(logsCol)
    r3.set('user_id', lastLog.getString('user_id'))
    r3.set('type', 'meta_token_diag_split')
    r3.set('message', 'Diag Part 3: Permissions')
    r3.set(
      'details',
      JSON.stringify({
        permissions: details.permissions,
      }),
    )
    app.saveNoValidate(r3)
  },
  (app) => {},
)
