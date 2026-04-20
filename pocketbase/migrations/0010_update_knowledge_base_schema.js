migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('knowledge_base')

    const titleField = col.fields.getByName('title')
    if (titleField) titleField.required = false

    const contentField = col.fields.getByName('content')
    if (contentField) contentField.required = false

    if (!col.fields.getByName('site')) {
      col.fields.add(new TextField({ name: 'site' }))
    }
    if (!col.fields.getByName('tags')) {
      col.fields.add(new TextField({ name: 'tags' }))
    }
    if (!col.fields.getByName('ai_instructions')) {
      col.fields.add(new TextField({ name: 'ai_instructions' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('knowledge_base')

    const titleField = col.fields.getByName('title')
    if (titleField) titleField.required = true

    const contentField = col.fields.getByName('content')
    if (contentField) contentField.required = true

    col.fields.removeByName('site')
    col.fields.removeByName('tags')
    col.fields.removeByName('ai_instructions')

    app.save(col)
  },
)
