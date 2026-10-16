migrate(
  (app) => {
    // 1760000081_test_file_read_and_api.js
    const targetRecordId = 'fcvyoatlxt56do2'
    const colId = 'pbc_2708644826'
    const storedFileName = 'book_vistage_residence_alxnfnhjlr.pdf'

    const testUrl =
      'http://127.0.0.1:8090/api/files/' + colId + '/' + targetRecordId + '/' + storedFileName

    let resInfo = {
      status: 0,
      headers: {},
      error: '',
    }

    try {
      const res = $http.send({
        url: testUrl,
        method: 'GET',
        timeout: 5,
      })
      resInfo.status = res.statusCode
      resInfo.headers = res.headers
    } catch (e) {
      resInfo.error = e.message
    }

    try {
      const logRec = new Record(app.findCollectionByNameOrId('system_logs'))
      logRec.set('type', 'local_file_url_test')
      logRec.set('message', 'File test: ' + JSON.stringify(resInfo))
      app.saveNoValidate(logRec)
    } catch (_) {}
  },
  (app) => {},
)
