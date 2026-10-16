migrate(
  (app) => {
    // 1760000080_inspect_ai_knowledge_file_field.js
    const col = app.findCollectionByNameOrId('ai_knowledge_files')
    const field = col.fields.getByName('file')
    const logRec = new Record(app.findCollectionByNameOrId('system_logs'))
    logRec.set('type', 'file_field_inspect')
    logRec.set('message', 'File field: ' + JSON.stringify(field))
    app.saveNoValidate(logRec)
  },
  (app) => {},
)
