migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')

    const aiField = col.fields.getByName('ai_instructions')
    if (aiField) {
      aiField.max = 400000
    }

    const biaField = col.fields.getByName('bia_instructions')
    if (biaField) {
      biaField.max = 400000
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')

    const aiField = col.fields.getByName('ai_instructions')
    if (aiField) {
      aiField.max = 0
    }

    const biaField = col.fields.getByName('bia_instructions')
    if (biaField) {
      biaField.max = 0
    }

    app.save(col)
  },
)
