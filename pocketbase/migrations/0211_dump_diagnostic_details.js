migrate(
  (app) => {
    try {
      const log = app.findFirstRecordByData('system_logs', 'id', 'pfnnxcs4yacrldc')
      const details = JSON.parse(log.getString('details') || '{}')

      const dumpCol = app.findCollectionByNameOrId('system_logs')

      // 1. debugData
      const l1 = new Record(dumpCol)
      l1.set('type', 'diagnostic_dump')
      l1.set('message', 'debugData dump')
      l1.set('details', JSON.stringify(details.debugData || {}))
      app.saveNoValidate(l1)

      // 2. permissionsData
      const l2 = new Record(dumpCol)
      l2.set('type', 'diagnostic_dump')
      l2.set('message', 'permissionsData dump')
      l2.set('details', JSON.stringify(details.permissionsData || []))
      app.saveNoValidate(l2)

      // 3. datasetCheck
      const l3 = new Record(dumpCol)
      l3.set('type', 'diagnostic_dump')
      l3.set('message', 'datasetCheck dump')
      l3.set('details', JSON.stringify(details.datasetCheck || {}))
      app.saveNoValidate(l3)

      // 4. testEventResult
      const l4 = new Record(dumpCol)
      l4.set('type', 'diagnostic_dump')
      l4.set('message', 'testEventResult dump')
      l4.set('details', JSON.stringify(details.testEventResult || {}))
      app.saveNoValidate(l4)
    } catch (e) {}
  },
  (app) => {},
)
