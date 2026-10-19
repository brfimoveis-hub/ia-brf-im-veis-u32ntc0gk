migrate(
  (app) => {
    let rec = null
    try {
      const records = app.findRecordsByFilter(
        'system_logs',
        'type="probe_ig_graph_v2"',
        '-created',
        1,
        0,
      )
      if (records && records.length > 0) rec = records[0]
    } catch (_) {}
    if (!rec) return

    const p = rec.get('payload') || {}
    const logsCol = app.findCollectionByNameOrId('system_logs')

    // Extrai detalhado:
    // accounts:
    const accData =
      (p.user_token_accounts && p.user_token_accounts.json && p.user_token_accounts.json.data) || []
    for (let i = 0; i < accData.length; i++) {
      const page = accData[i]
      const logItem = new Record(logsCol, {
        type: 'probe_slice_acc',
        message: 'Account ' + i + ': ' + page.name + ' (' + page.id + ')',
        details: JSON.stringify({
          id: page.id,
          name: page.name,
          has_token: !!page.access_token,
          ig_business: page.instagram_business_account,
          connected_ig: page.connected_instagram_account,
        }),
      })
      app.save(logItem)
    }

    // official page:
    const offPage = p.user_token_official_page || {}
    const logOff = new Record(logsCol, {
      type: 'probe_slice_off',
      message: 'Official Page status ' + offPage.status,
      details: JSON.stringify(offPage.json || offPage.error || {}),
    })
    app.save(logOff)

    // ig_17841418953400936:
    const ig1 = p.user_token_ig_17841418953400936 || {}
    const logIg1 = new Record(logsCol, {
      type: 'probe_slice_ig1',
      message: 'IG 17841418953400936 status ' + ig1.status,
      details: JSON.stringify(ig1.json || ig1.error || {}),
    })
    app.save(logIg1)

    // ig_17841403502427937:
    const ig2 = p.user_token_ig_17841403502427937 || {}
    const logIg2 = new Record(logsCol, {
      type: 'probe_slice_ig2',
      message: 'IG 17841403502427937 status ' + ig2.status,
      details: JSON.stringify(ig2.json || ig2.error || {}),
    })
    app.save(logIg2)
  },
  (app) => {},
)
