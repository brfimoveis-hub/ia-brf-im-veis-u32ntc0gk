migrate(
  (app) => {
    try {
      const l = app.findFirstRecordByData('system_logs', 'id', '0vbk55ufszi3i0u')
      const d = JSON.parse(l.getString('details') || '{}')
      const dbgData = (d.detailedDebug && d.detailedDebug.data) || {}

      const dumpCol = app.findCollectionByNameOrId('system_logs')
      const rec = new Record(dumpCol)
      rec.set('type', 'diagnostic_debug_expanded')
      rec.set(
        'message',
        'granular: ' +
          JSON.stringify(dbgData.granular_scopes || []) +
          ' | target_ids: ' +
          JSON.stringify(dbgData.target_ids || []),
      )
      rec.set('details', JSON.stringify(dbgData))
      app.saveNoValidate(rec)
    } catch (e) {}
  },
  (app) => {},
)
