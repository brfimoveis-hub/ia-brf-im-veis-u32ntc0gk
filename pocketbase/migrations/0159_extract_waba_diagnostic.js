// Migration 0159: Extrai detalhes formatados do diagnóstico das WABAs
migrate(
  (app) => {
    let rec = null
    try {
      rec = app.findFirstRecordByData('system_logs', 'id', '4eslwdgsbz1kvm2')
    } catch (_) {
      return
    }

    const details = JSON.parse(rec.getString('details') || '{}')
    const officialData =
      (details.official_waba &&
        details.official_waba.result &&
        details.official_waba.result.json) ||
      {}
    const duplicateData =
      (details.duplicate_waba &&
        details.duplicate_waba.result &&
        details.duplicate_waba.result.json) ||
      {}
    const duplicateInfo =
      (details.duplicate_waba && details.duplicate_waba.info && details.duplicate_waba.info.json) ||
      {}

    const logsCol = app.findCollectionByNameOrId('system_logs')

    // Log para WABA oficial
    const logOfficial = new Record(logsCol)
    logOfficial.set('type', 'waba_official_summary')
    logOfficial.set(
      'message',
      'Official WABA (1727871165105009) count=' +
        ((officialData.data && officialData.data.length) || 0),
    )
    logOfficial.set('user_id', 'g5jto8bhulw01bz')
    logOfficial.set('payload', JSON.stringify(officialData.data || []))
    app.save(logOfficial)

    // Log para WABA duplicada
    const logDup = new Record(logsCol)
    logDup.set('type', 'waba_duplicate_summary')
    logDup.set(
      'message',
      'Duplicate WABA (3542548689255402) count=' +
        ((duplicateData.data && duplicateData.data.length) || 0) +
        ' name=' +
        (duplicateInfo.name || ''),
    )
    logDup.set('user_id', 'g5jto8bhulw01bz')
    logDup.set(
      'payload',
      JSON.stringify({
        info: duplicateInfo,
        phones: duplicateData.data || [],
      }),
    )
    app.save(logDup)
  },
  (app) => {},
)
