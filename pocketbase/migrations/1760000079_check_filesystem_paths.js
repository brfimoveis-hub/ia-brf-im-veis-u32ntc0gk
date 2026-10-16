migrate(
  (app) => {
    // 1760000079_check_filesystem_paths.js
    const fsys = app.newFilesystem()
    let probe = {
      wrongKeyExists: false,
      correctKeyExists: false,
      filesInTargetRecord: [],
      filesInCollection: [],
      error: '',
    }

    try {
      const storedFileName = 'book_vistage_residence_alxnfnhjlr.pdf'
      const targetRecordId = 'fcvyoatlxt56do2'
      const colId = 'pbc_2708644826'

      probe.wrongKeyExists = fsys.exists('undefined/' + targetRecordId + '/' + storedFileName)
      probe.correctKeyExists = fsys.exists(colId + '/' + targetRecordId + '/' + storedFileName)

      const list1 = fsys.list(colId + '/' + targetRecordId + '/')
      if (list1) {
        probe.filesInTargetRecord = list1.map((item) => item.key)
      }
      const list2 = fsys.list('undefined/' + targetRecordId + '/')
      if (list2) {
        probe.filesInWrong = list2.map((item) => item.key)
      }
    } catch (err) {
      probe.error = err.message
    } finally {
      fsys.close()
    }

    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(logsCol)
      logRec.set('type', 'fs_probe_details')
      logRec.set(
        'message',
        'FS probe: wrong=' + probe.wrongKeyExists + ', corr=' + probe.correctKeyExists,
      )
      logRec.set('details', JSON.stringify(probe))
      app.saveNoValidate(logRec)
    } catch (_) {}
  },
  (app) => {},
)
