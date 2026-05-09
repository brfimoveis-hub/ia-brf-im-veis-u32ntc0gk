migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')

    const aiInstructions = col.fields.getByName('ai_instructions')
    if (aiInstructions) {
      aiInstructions.max = 300000
    }

    if (!col.fields.getByName('uazapi_status')) {
      col.fields.add(new TextField({ name: 'uazapi_status' }))
    }
    if (!col.fields.getByName('uazapi_error')) {
      col.fields.add(new TextField({ name: 'uazapi_error' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')

    const aiInstructions = col.fields.getByName('ai_instructions')
    if (aiInstructions) {
      aiInstructions.max = 0
    }

    col.fields.removeByName('uazapi_status')
    col.fields.removeByName('uazapi_error')

    app.save(col)
  },
)
