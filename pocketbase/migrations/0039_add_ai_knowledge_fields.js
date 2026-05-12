migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    if (!users.fields.getByName('ai_knowledge_files')) {
      users.fields.add(
        new FileField({
          name: 'ai_knowledge_files',
          maxSelect: 10,
          maxSize: 5242880,
          mimeTypes: [
            'application/pdf',
            'text/plain',
            'text/csv',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ],
        }),
      )
    }

    if (!users.fields.getByName('bia_instructions')) {
      users.fields.add(
        new TextField({
          name: 'bia_instructions',
        }),
      )
    }

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    let changed = false

    if (users.fields.getByName('ai_knowledge_files')) {
      users.fields.removeByName('ai_knowledge_files')
      changed = true
    }

    if (users.fields.getByName('bia_instructions')) {
      users.fields.removeByName('bia_instructions')
      changed = true
    }

    if (changed) app.save(users)
  },
)
