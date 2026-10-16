migrate(
  (app) => {
    // 1760000082_test_remote_url.js
    const targetRecordId = 'fcvyoatlxt56do2'
    const colId = 'pbc_2708644826'
    const storedFileName = 'book_vistage_residence_alxnfnhjlr.pdf'

    const testUrl =
      'https://ia-uazapi-6d79e.shrd00.internal.goskip.dev/api/files/' +
      colId +
      '/' +
      targetRecordId +
      '/' +
      storedFileName

    let resInfo = {
      status: 0,
      bodyLen: 0,
      headers: {},
      error: '',
    }

    try {
      const res = $http.send({
        url: testUrl,
        method: 'HEAD',
        timeout: 10,
      })
      resInfo.status = res.statusCode
      resInfo.headers = res.headers
    } catch (e) {
      resInfo.error = e.message
    }

    try {
      const logRec = new Record(app.findCollectionByNameOrId('system_logs'))
      logRec.set('type', 'remote_file_url_test')
      logRec.set('message', 'Remote File test: ' + JSON.stringify(resInfo))
      app.saveNoValidate(logRec)
    } catch (_) {}
  },
  (app) => {},
)
